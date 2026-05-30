/**
 * WBOS Sync: Supabase Storage ↔ Caffeine Agent
 * =============================================
 * Bidirectional sync between Supabase agent-shared bucket
 * and local Caffeine Agent workspace folder.
 *
 * Direction A: Supabase → Caffeine (pull new/updated files)
 * Direction B: Caffeine → Supabase (push local outputs)
 *
 * Run: tsx sovereign-workspace/scripts/sync/supabase-caffeine-sync.ts
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const SUPABASE_URL      = process.env.SUPABASE_URL!;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKSPACE_ID      = process.env.WORKSPACE_ID ?? 'WBOS-WORKSPACE-001';
const CAFFEINE_ROOT     = process.env.CAFFEINE_WORKSPACE_PATH ?? './caffeine-workspace';
const BUCKET            = 'agent-shared';
const POLL_INTERVAL_MS  = parseInt(process.env.SYNC_INTERVAL_MS ?? '30000');
const AGENT_ID          = 'SYNC-AGENT-001';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Folder map: bucket prefix → local path ────────────────────────────────
const FOLDER_MAP: Record<string, string> = {
  'events/perplexity/': 'events/perplexity/',
  'events/claude/':     'events/claude/',
  'events/gemini/':     'events/gemini/',
  'events/chatgpt/':    'events/chatgpt/',
  'events/deepflex/':   'events/deepflex/',
  'tasks/build/':       'tasks/build/',
  'tasks/research/':    'tasks/research/',
  'tasks/deploy/':      'tasks/deploy/',
  'tasks/sync/':        'tasks/sync/',
  'outputs/reports/':   'outputs/reports/',
  'outputs/code/':      'outputs/code/',
  'outputs/summaries/': 'outputs/summaries/',
  'outputs/migrations/':'outputs/migrations/',
};

// ── Direction A: Supabase → Caffeine ─────────────────────────────────────
async function pullFromSupabase(): Promise<void> {
  console.log('[Sync] Pulling from Supabase → Caffeine...');

  for (const [bucketPrefix, localSuffix] of Object.entries(FOLDER_MAP)) {
    const { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list(bucketPrefix.replace(/\/$/, ''), { limit: 100 });

    if (error) { console.error(`[Sync] List error for ${bucketPrefix}:`, error.message); continue; }
    if (!files || files.length === 0) continue;

    const localDir = path.join(CAFFEINE_ROOT, localSuffix);
    await fs.mkdir(localDir, { recursive: true });

    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue;

      const remotePath = `${bucketPrefix}${file.name}`;
      const localPath  = path.join(localDir, file.name);

      // Check if local file exists and is current
      try {
        const localStat = await fs.stat(localPath);
        const remoteUpdated = new Date(file.updated_at ?? 0).getTime();
        if (localStat.mtimeMs >= remoteUpdated) continue; // local is current
      } catch {
        // File doesn't exist locally — download it
      }

      const { data, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(remotePath);

      if (dlError) { console.error(`[Sync] Download error ${remotePath}:`, dlError.message); continue; }

      const text = await (data as Blob).text();
      await fs.writeFile(localPath, text, 'utf-8');
      console.log(`[Sync] ↓ Pulled: ${remotePath} → ${localPath}`);
    }
  }
}

// ── Direction B: Caffeine → Supabase ─────────────────────────────────────
async function pushToSupabase(): Promise<void> {
  console.log('[Sync] Pushing from Caffeine → Supabase...');

  for (const [bucketPrefix, localSuffix] of Object.entries(FOLDER_MAP)) {
    const localDir = path.join(CAFFEINE_ROOT, localSuffix);

    let files: string[];
    try {
      files = await fs.readdir(localDir);
    } catch {
      continue; // folder doesn't exist locally yet
    }

    for (const fileName of files) {
      if (fileName.startsWith('.')) continue;

      const localPath  = path.join(localDir, fileName);
      const remotePath = `${bucketPrefix}${fileName}`;
      const content    = await fs.readFile(localPath, 'utf-8');

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(remotePath, content, { contentType: 'application/json', upsert: true });

      if (error) { console.error(`[Sync] Upload error ${remotePath}:`, error.message); continue; }
      console.log(`[Sync] ↑ Pushed: ${localPath} → ${remotePath}`);

      // Register in workspace_outputs if it's an output file
      if (localSuffix.startsWith('outputs/')) {
        const outputId = `OUT-SYNC-${Date.now()}`;
        await supabase.from('workspace_outputs').insert({
          output_id:    outputId,
          workspace_id: WORKSPACE_ID,
          produced_by:  'system',
          output_type:  inferOutputType(localSuffix),
          title:        fileName,
          storage_path: remotePath,
          file_name:    fileName,
          mime_type:    'application/json',
          is_final:     false,
          tags:         ['sync', 'caffeine', 'push'],
        }).onConflict('output_id').ignore();
      }
    }
  }
}

// ── Write workspace.json index to Caffeine root ───────────────────────────
async function writeWorkspaceIndex(): Promise<void> {
  const { data: manifest } = await supabase
    .from('workspace')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .single();

  if (!manifest) return;

  const { data: pendingTasks } = await supabase
    .from('workspace_tasks')
    .select('task_id, title, assigned_to, status, priority')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('status', 'PENDING');

  const index = {
    workspace_id:   WORKSPACE_ID,
    name:           manifest.name,
    version:        manifest.version,
    last_synced:    new Date().toISOString(),
    bucket:         BUCKET,
    github_repo:    manifest.github_repo,
    pending_tasks:  pendingTasks?.length ?? 0,
    tasks:          pendingTasks ?? [],
    folder_map:     FOLDER_MAP,
  };

  await fs.mkdir(CAFFEINE_ROOT, { recursive: true });
  await fs.writeFile(
    path.join(CAFFEINE_ROOT, 'workspace.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );
  console.log('[Sync] workspace.json updated');
}

function inferOutputType(localSuffix: string): string {
  if (localSuffix.includes('reports'))    return 'report';
  if (localSuffix.includes('code'))       return 'code';
  if (localSuffix.includes('summaries'))  return 'summary';
  if (localSuffix.includes('migrations')) return 'migration';
  return 'data';
}

// ── Main sync loop ────────────────────────────────────────────────────────
async function syncCycle(): Promise<void> {
  try {
    await pullFromSupabase();
    await pushToSupabase();
    await writeWorkspaceIndex();
    console.log(`[Sync] Cycle complete at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Sync] Cycle error:', err);
  }
}

async function main(): Promise<void> {
  console.log(`[Sync] Supabase ↔ Caffeine sync started — every ${POLL_INTERVAL_MS / 1000}s`);
  await syncCycle();
  setInterval(syncCycle, POLL_INTERVAL_MS);
}

main().catch(console.error);

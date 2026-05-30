/**
 * WBOS Watcher: ChatGPT / Uhura (Build Agent)
 * ============================================
 * Role: Engineer — TypeScript, Prisma, Smart Contracts, Repo Patches
 * Watches: events/chatgpt/ + tasks/build/
 * Writes:  outputs/code/ + outputs/migrations/
 *
 * Agent: AGT-CHATGPT-001 | Model: gpt-4o
 * Lane:  CHATGPT
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.SUPABASE_URL!;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKSPACE_ID     = process.env.WORKSPACE_ID ?? 'WBOS-WORKSPACE-001';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '30000');
const AGENT_ID         = 'AGT-CHATGPT-001';
const AGENT_NAME       = 'chatgpt';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function pollBuildTasks(): Promise<void> {
  const { data: tasks, error } = await supabase
    .from('workspace_tasks')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('assigned_to', AGENT_NAME)
    .in('task_type', ['build', 'patch'])
    .eq('status', 'PENDING')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) { console.error('[ChatGPT] Poll error:', error.message); return; }
  if (!tasks || tasks.length === 0) return;

  console.log(`[ChatGPT] ${tasks.length} build task(s) found`);
  for (const task of tasks) await processBuildTask(task);
}

async function processBuildTask(task: Record<string, unknown>): Promise<void> {
  console.log(`[ChatGPT] Processing build task: ${task.task_id}`);

  await supabase.from('workspace_tasks')
    .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
    .eq('task_id', task.task_id);

  const outputId   = `OUT-${new Date().getFullYear()}-${Date.now()}`;
  const outputPath = task.output_path as string
                     ?? `outputs/code/${task.task_id}.ts`;
  const fileName   = outputPath.split('/').pop()!;

  // === CHATGPT API CALL GOES HERE ===
  // const code = await callOpenAI(task.instructions, task.context);

  const outputContent = JSON.stringify({
    output_id:    outputId,
    task_id:      task.task_id,
    agent:        AGENT_ID,
    type:         'code',
    status:       'STUB — connect OpenAI API',
    instructions: task.instructions,
    timestamp:    new Date().toISOString(),
    code:         '// Generated code will appear here',
  }, null, 2);

  await supabase.storage
    .from('agent-shared')
    .upload(outputPath, outputContent, { contentType: 'application/json', upsert: true });

  await supabase.from('workspace_outputs').insert({
    output_id:    outputId,
    workspace_id: WORKSPACE_ID,
    task_id:      task.task_id as string,
    produced_by:  AGENT_NAME,
    output_type:  outputPath.includes('migrations') ? 'migration' : 'code',
    title:        task.title as string,
    storage_path: outputPath,
    file_name:    fileName,
    mime_type:    'application/json',
    cap_ref:      task.cap_ref as string ?? null,
    is_final:     false,
    tags:         ['code', 'chatgpt', task.task_type as string],
  });

  await supabase.from('workspace_tasks')
    .update({ status: 'REVIEW', completed_at: new Date().toISOString(), result: { output_id: outputId } })
    .eq('task_id', task.task_id);

  await supabase.from('workspace_events').insert({
    event_id:     `EVT-${new Date().getFullYear()}-${Date.now()}`,
    workspace_id: WORKSPACE_ID,
    type:         'completed',
    source:       AGENT_NAME,
    target:       'deepflex',
    priority:     'NORMAL',
    status:       'COMPLETED',
    payload:      { task_id: task.task_id, output_id: outputId, output_path: outputPath },
    tags:         ['completed', 'code', AGENT_NAME],
  });

  console.log(`[ChatGPT] Task ${task.task_id} → REVIEW at ${outputPath}`);
}

async function heartbeat(): Promise<void> {
  await supabase.from('agents')
    .update({ last_heartbeat: new Date().toISOString(), status: 'ONLINE' })
    .eq('agent_id', AGENT_ID);
}

async function main(): Promise<void> {
  console.log('[ChatGPT] Build watcher started');
  await heartbeat();
  setInterval(pollBuildTasks, POLL_INTERVAL_MS);
  setInterval(heartbeat, 5 * 60 * 1000);
}

main().catch(console.error);

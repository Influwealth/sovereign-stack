/**
 * WBOS Watcher: Perplexity (Research Agent)
 * ==========================================
 * Role: Recon — real-time intelligence, competitive analysis
 * Watches: events/perplexity/ + tasks/research/
 * Writes:  outputs/reports/ + workspace_outputs
 *
 * Agent: AGT-PERPLEXITY-001 | Model: perplexity-sonar
 * Lane:  PERPLEXITY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.SUPABASE_URL!;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKSPACE_ID     = process.env.WORKSPACE_ID ?? 'WBOS-WORKSPACE-001';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '30000');
const AGENT_ID         = 'AGT-PERPLEXITY-001';
const AGENT_NAME       = 'perplexity';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Poll for research tasks assigned to Perplexity ────────────────────────
async function pollResearchTasks(): Promise<void> {
  const { data: tasks, error } = await supabase
    .from('workspace_tasks')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('assigned_to', AGENT_NAME)
    .in('task_type', ['research'])
    .eq('status', 'PENDING')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) { console.error('[Perplexity] Poll error:', error.message); return; }
  if (!tasks || tasks.length === 0) return;

  console.log(`[Perplexity] ${tasks.length} research task(s) found`);

  for (const task of tasks) {
    await processResearchTask(task);
  }
}

// ── Process a research task ────────────────────────────────────────────────
async function processResearchTask(task: Record<string, unknown>): Promise<void> {
  console.log(`[Perplexity] Processing research task: ${task.task_id}`);

  // Mark as in progress
  await supabase.from('workspace_tasks')
    .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
    .eq('task_id', task.task_id);

  // === PERPLEXITY API CALL GOES HERE ===
  // const result = await callPerplexityAPI(task.instructions, task.context);
  // For now: emit a structured placeholder output
  const outputId      = `OUT-${new Date().getFullYear()}-${Date.now()}`;
  const outputPath    = task.output_path as string
                        ?? `outputs/reports/research-${task.task_id}.json`;
  const fileName      = outputPath.split('/').pop()!;

  // Write output record to DB
  await supabase.from('workspace_outputs').insert({
    output_id:    outputId,
    workspace_id: WORKSPACE_ID,
    task_id:      task.task_id as string,
    produced_by:  AGENT_NAME,
    output_type:  'report',
    title:        task.title as string,
    storage_path: outputPath,
    file_name:    fileName,
    mime_type:    'application/json',
    cap_ref:      task.cap_ref as string ?? null,
    campaign_ref: task.campaign_ref as string ?? null,
    is_final:     false,
    tags:         ['research', 'perplexity', 'report'],
  });

  // Upload placeholder to Supabase Storage
  const outputContent = JSON.stringify({
    output_id:    outputId,
    task_id:      task.task_id,
    agent:        AGENT_ID,
    type:         'research_report',
    status:       'STUB — connect Perplexity API',
    instructions: task.instructions,
    context:      task.context,
    timestamp:    new Date().toISOString(),
    findings:     [],
  }, null, 2);

  await supabase.storage
    .from('agent-shared')
    .upload(outputPath, outputContent, {
      contentType: 'application/json',
      upsert: true,
    });

  // Mark task completed
  await supabase.from('workspace_tasks')
    .update({
      status:       'COMPLETED',
      completed_at: new Date().toISOString(),
      result:       { output_id: outputId, output_path: outputPath },
    })
    .eq('task_id', task.task_id);

  // Emit completion event
  await supabase.from('workspace_events').insert({
    event_id:     `EVT-${new Date().getFullYear()}-${Date.now()}`,
    workspace_id: WORKSPACE_ID,
    type:         'completed',
    source:       AGENT_NAME,
    target:       'deepflex',
    priority:     'NORMAL',
    status:       'COMPLETED',
    payload:      { task_id: task.task_id, output_id: outputId, output_path: outputPath },
    tags:         ['completed', 'research', AGENT_NAME],
  });

  console.log(`[Perplexity] Task ${task.task_id} completed → ${outputPath}`);
}

async function heartbeat(): Promise<void> {
  await supabase.from('agents')
    .update({ last_heartbeat: new Date().toISOString(), status: 'ONLINE' })
    .eq('agent_id', AGENT_ID);
}

async function main(): Promise<void> {
  console.log('[Perplexity] Research watcher started');
  await heartbeat();
  setInterval(pollResearchTasks, POLL_INTERVAL_MS);
  setInterval(heartbeat, 5 * 60 * 1000);
}

main().catch(console.error);

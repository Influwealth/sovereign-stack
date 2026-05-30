/**
 * WBOS Watcher: DeepFlex (Supervisor)
 * =====================================
 * Role: Supervisor — watches ALL task queues, dispatches to agent lanes
 * Watches: events/deepflex/ + tasks/ (all subfolders)
 * Writes:  workspace_events, workspace_tasks (assignments)
 *
 * Agent: AGT-DEEPFLEX-001 | Model: claude-sonnet-4-6
 * Lane:  DEEPFLEX
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.SUPABASE_URL!;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKSPACE_ID      = process.env.WORKSPACE_ID ?? 'WBOS-WORKSPACE-001';
const POLL_INTERVAL_MS  = parseInt(process.env.POLL_INTERVAL_MS ?? '30000');
const AGENT_ID          = 'AGT-DEEPFLEX-001';
const AGENT_NAME        = 'deepflex';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Task routing table: event type → assigned agent ────────────────────────
const ROUTING_TABLE: Record<string, string> = {
  build:            'chatgpt',
  repo_patch:       'chatgpt',
  typescript:       'chatgpt',
  research:         'perplexity',
  competitive_intel:'perplexity',
  market_scan:      'perplexity',
  document:         'gemini',
  automation:       'gemini',
  dashboard:        'gemini',
  content_drop:     'gemini',
  architecture:     'deepflex',
  capsule_spec:     'deepflex',
  deploy:           'deepflex',
  sync:             'deepflex',
};

// ── Poll for pending events in deepflex inbox ──────────────────────────────
async function pollInbox(): Promise<void> {
  const { data: events, error } = await supabase
    .from('workspace_events')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('target', 'deepflex')
    .eq('status', 'PENDING')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) { console.error('[DeepFlex] Poll error:', error.message); return; }
  if (!events || events.length === 0) return;

  console.log(`[DeepFlex] ${events.length} pending event(s) found`);

  for (const event of events) {
    await processEvent(event);
  }
}

// ── Poll for unassigned tasks in all task queues ───────────────────────────
async function pollTasks(): Promise<void> {
  const { data: tasks, error } = await supabase
    .from('workspace_tasks')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('assigned_by', 'system')  // unreviewed system tasks
    .eq('status', 'PENDING')
    .limit(10);

  if (error) { console.error('[DeepFlex] Task poll error:', error.message); return; }
  if (!tasks || tasks.length === 0) return;

  for (const task of tasks) {
    await reviewTask(task);
  }
}

// ── Process an inbound event: route to correct agent ──────────────────────
async function processEvent(event: Record<string, unknown>): Promise<void> {
  const targetAgent = ROUTING_TABLE[event.type as string] ?? 'deepflex';
  const taskId      = `TSK-${new Date().getFullYear()}-${Date.now()}`;

  console.log(`[DeepFlex] Routing EVT ${event.event_id} (${event.type}) → ${targetAgent}`);

  // Mark event as picked up
  await supabase.from('workspace_events')
    .update({ status: 'IN_PROGRESS', picked_up_at: new Date().toISOString() })
    .eq('event_id', event.event_id);

  // Create task for target agent
  await supabase.from('workspace_tasks').insert({
    task_id:      taskId,
    workspace_id: WORKSPACE_ID,
    event_id:     event.event_id as string,
    title:        `[${(event.type as string).toUpperCase()}] From ${event.source}`,
    task_type:    mapEventTypeToTaskType(event.type as string),
    assigned_to:  targetAgent,
    assigned_by:  AGENT_NAME,
    priority:     event.priority as string ?? 'NORMAL',
    status:       'PENDING',
    cap_ref:      event.cap_ref as string ?? null,
    campaign_ref: event.campaign_ref as string ?? null,
    instructions: (event.payload as Record<string, unknown>)?.instruction as string ?? '',
    context:      event.payload as Record<string, unknown>,
    output_path:  (event.payload as Record<string, unknown>)?.output_path as string ?? null,
    tags:         ['routed', targetAgent, event.type as string],
  });

  // Write ABL entry
  await supabase.from('agi_behavior_log').insert({
    abl_id:     `ABL-${new Date().getFullYear()}-${Date.now()}`,
    agent_id:   AGENT_ID,
    tier:       'META-UNIT',
    event_type: 'TASK_DISPATCHED',
    severity:   'INFO',
    summary:    `DeepFlex routed ${event.type} event to ${targetAgent} — Task ${taskId}`,
    payload:    { event_id: event.event_id, task_id: taskId, target: targetAgent },
    source:     'AGENT',
    tags:       ['dispatch', 'deepflex', targetAgent],
  });
}

// ── Review a system task — validate and approve ────────────────────────────
async function reviewTask(task: Record<string, unknown>): Promise<void> {
  console.log(`[DeepFlex] Reviewing task ${task.task_id} → ${task.assigned_to}`);
  await supabase.from('workspace_tasks')
    .update({ assigned_by: AGENT_NAME, status: 'PENDING' })
    .eq('task_id', task.task_id);
}

// ── Emit heartbeat every 5 minutes ────────────────────────────────────────
async function heartbeat(): Promise<void> {
  await supabase.from('workspace_events').insert({
    event_id:     `EVT-${new Date().getFullYear()}-HB-${Date.now()}`,
    workspace_id: WORKSPACE_ID,
    type:         'heartbeat',
    source:       AGENT_NAME,
    target:       'all',
    priority:     'LOW',
    status:       'COMPLETED',
    payload:      { agent: AGENT_ID, timestamp: new Date().toISOString() },
    tags:         ['heartbeat', AGENT_NAME],
  });

  // Update agent last_heartbeat
  await supabase.from('agents')
    .update({ last_heartbeat: new Date().toISOString(), status: 'ONLINE' })
    .eq('agent_id', AGENT_ID);
}

function mapEventTypeToTaskType(type: string): string {
  const map: Record<string, string> = {
    build: 'build', repo_patch: 'patch', document: 'document',
    automation: 'deploy', research: 'research', market_scan: 'research',
    competitive_intel: 'research', deploy: 'deploy', sync: 'sync',
    architecture: 'build', capsule_spec: 'build', dashboard: 'document',
    content_drop: 'document',
  };
  return map[type] ?? 'build';
}

// ── Main loop ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`[DeepFlex] Supervisor watcher started — polling every ${POLL_INTERVAL_MS / 1000}s`);
  await heartbeat();

  setInterval(pollInbox, POLL_INTERVAL_MS);
  setInterval(pollTasks, POLL_INTERVAL_MS);
  setInterval(heartbeat, 5 * 60 * 1000); // heartbeat every 5 min
}

main().catch(console.error);

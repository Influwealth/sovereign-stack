/**
 * WBOS Watcher: Gemini (Automation Agent)
 * ========================================
 * Role: Automator — Dashboards, Content, Documents, Deploy/Sync
 * Watches: events/gemini/ + tasks/deploy/ + tasks/sync/
 * Writes:  outputs/reports/ + outputs/summaries/
 *
 * Agent: AGT-GEMINI-001 | Model: gemini-1.5-pro
 * Lane:  GEMINI
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.SUPABASE_URL!;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKSPACE_ID     = process.env.WORKSPACE_ID ?? 'WBOS-WORKSPACE-001';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '30000');
const AGENT_ID         = 'AGT-GEMINI-001';
const AGENT_NAME       = 'gemini';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function pollAutomationTasks(): Promise<void> {
  const { data: tasks, error } = await supabase
    .from('workspace_tasks')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('assigned_to', AGENT_NAME)
    .in('task_type', ['document', 'deploy', 'sync'])
    .eq('status', 'PENDING')
    .order('priority', { ascending: false })
    .limit(5);

  if (error) { console.error('[Gemini] Poll error:', error.message); return; }
  if (!tasks || tasks.length === 0) return;

  console.log(`[Gemini] ${tasks.length} automation task(s) found`);
  for (const task of tasks) await processAutomationTask(task);
}

// Special: poll for pending posts in campaigns table (TikTok/Wix publisher)
async function pollPendingPosts(): Promise<void> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, campaigns(priority)')
    .eq('status', 'PENDING')
    .lte('scheduled_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) { console.error('[Gemini] Posts poll error:', error.message); return; }
  if (!posts || posts.length === 0) return;

  console.log(`[Gemini] ${posts.length} pending post(s) to publish`);

  for (const post of posts) {
    // Mark as queued immediately to prevent double-publish
    await supabase.from('posts').update({ status: 'QUEUED' }).eq('post_id', post.post_id);

    // Dispatch to appropriate publish function based on channel
    console.log(`[Gemini] Queued post ${post.post_id} → ${post.channel}`);

    // === CHANNEL PUBLISH CALLS GO HERE ===
    // if (post.channel === 'TIKTOK') await publishToTikTok(post);
    // if (post.channel === 'WIX')    await publishToWix(post);
    // if (post.channel === 'SMS')    await publishSMS(post);

    // Write ABL entry
    await supabase.from('agi_behavior_log').insert({
      abl_id:     `ABL-${new Date().getFullYear()}-${Date.now()}`,
      agent_id:   AGENT_ID,
      tier:       'QUDIT',
      event_type: 'POST_QUEUED',
      severity:   'INFO',
      summary:    `Gemini queued post ${post.post_id} on ${post.channel}`,
      payload:    { post_id: post.post_id, channel: post.channel },
      source:     'AGENT',
      tags:       ['post', 'publish', post.channel],
    });
  }
}

async function processAutomationTask(task: Record<string, unknown>): Promise<void> {
  console.log(`[Gemini] Processing automation task: ${task.task_id}`);

  await supabase.from('workspace_tasks')
    .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
    .eq('task_id', task.task_id);

  const outputId   = `OUT-${new Date().getFullYear()}-${Date.now()}`;
  const isDoc      = task.task_type === 'document';
  const outputPath = task.output_path as string
                     ?? `outputs/${isDoc ? 'summaries' : 'reports'}/${task.task_id}.json`;
  const fileName   = outputPath.split('/').pop()!;

  // === GEMINI API CALL GOES HERE ===
  // const content = await callGemini(task.instructions, task.context);

  const outputContent = JSON.stringify({
    output_id:    outputId,
    task_id:      task.task_id,
    agent:        AGENT_ID,
    type:         task.task_type,
    status:       'STUB — connect Gemini API',
    instructions: task.instructions,
    timestamp:    new Date().toISOString(),
    content:      '',
  }, null, 2);

  await supabase.storage
    .from('agent-shared')
    .upload(outputPath, outputContent, { contentType: 'application/json', upsert: true });

  await supabase.from('workspace_outputs').insert({
    output_id:    outputId,
    workspace_id: WORKSPACE_ID,
    task_id:      task.task_id as string,
    produced_by:  AGENT_NAME,
    output_type:  isDoc ? 'summary' : 'report',
    title:        task.title as string,
    storage_path: outputPath,
    file_name:    fileName,
    mime_type:    'application/json',
    is_final:     false,
    tags:         ['automation', 'gemini', task.task_type as string],
  });

  await supabase.from('workspace_tasks')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString(), result: { output_id: outputId } })
    .eq('task_id', task.task_id);

  await supabase.from('workspace_events').insert({
    event_id:     `EVT-${new Date().getFullYear()}-${Date.now()}`,
    workspace_id: WORKSPACE_ID,
    type:         'completed',
    source:       AGENT_NAME,
    target:       'deepflex',
    priority:     'NORMAL',
    status:       'COMPLETED',
    payload:      { task_id: task.task_id, output_id: outputId },
    tags:         ['completed', 'automation', AGENT_NAME],
  });
}

async function heartbeat(): Promise<void> {
  await supabase.from('agents')
    .update({ last_heartbeat: new Date().toISOString(), status: 'ONLINE' })
    .eq('agent_id', AGENT_ID);
}

async function main(): Promise<void> {
  console.log('[Gemini] Automation watcher started');
  await heartbeat();
  setInterval(pollAutomationTasks, POLL_INTERVAL_MS);
  setInterval(pollPendingPosts, POLL_INTERVAL_MS);   // also watches campaigns/posts
  setInterval(heartbeat, 5 * 60 * 1000);
}

main().catch(console.error);

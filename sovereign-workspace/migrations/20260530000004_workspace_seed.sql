-- ============================================================
-- WBOS SEED: Unified Sovereign Workspace
-- Seeds initial workspace record
-- Author: DeepFlex Architect
-- Date: 2026-05-30
-- ============================================================

INSERT INTO public.workspace (
  workspace_id, name, version, status,
  bucket_name, github_repo, manifest, agents, sync_config, tags
) VALUES (
  'WBOS-WORKSPACE-001',
  'Unified Sovereign Workspace',
  '1.0.0',
  'ACTIVE',
  'agent-shared',
  'Influwealth/sovereign-stack',
  '{
    "manifest_id": "WBOS-WORKSPACE-001",
    "version": "1.0.0",
    "description": "Unified Sovereign Workspace — WBOS multi-agent coordination layer",
    "folder_structure": {
      "events/": ["perplexity/","claude/","gemini/","chatgpt/","deepflex/"],
      "tasks/": ["build/","research/","deploy/","sync/"],
      "outputs/": ["reports/","code/","summaries/","migrations/"]
    }
  }'::jsonb,
  '[
    {"id":"AGT-DEEPFLEX-001","name":"DeepFlex","lane":"DEEPFLEX","model":"claude-sonnet-4-6","events_path":"events/deepflex/"},
    {"id":"AGT-CHATGPT-001","name":"ChatGPT","lane":"CHATGPT","model":"gpt-4o","events_path":"events/chatgpt/"},
    {"id":"AGT-GEMINI-001","name":"Gemini","lane":"GEMINI","model":"gemini-1.5-pro","events_path":"events/gemini/"},
    {"id":"AGT-PERPLEXITY-001","name":"Perplexity","lane":"PERPLEXITY","model":"perplexity-sonar","events_path":"events/perplexity/"}
  ]'::jsonb,
  '{"poll_interval_seconds":30,"caffeine_mirror":true,"realtime_enabled":true}'::jsonb,
  ARRAY['sovereign','workspace','multi-agent','WBOS']
) ON CONFLICT (workspace_id) DO NOTHING;

-- Seed initial heartbeat event
INSERT INTO public.workspace_events (
  event_id, workspace_id, type, source, target,
  priority, status, payload, tags
) VALUES (
  'EVT-2026-INIT-001',
  'WBOS-WORKSPACE-001',
  'heartbeat',
  'system',
  'all',
  'LOW',
  'COMPLETED',
  '{"message": "Unified Sovereign Workspace initialized", "version": "1.0.0", "nodes": ["east-flatbush-nyc","greenville-nc","baltimore-md","senegal"]}'::jsonb,
  ARRAY['init','heartbeat','workspace']
) ON CONFLICT (event_id) DO NOTHING;

-- Seed initial task for each agent lane
INSERT INTO public.workspace_tasks (
  task_id, workspace_id, title, description,
  task_type, assigned_to, assigned_by, priority, status,
  instructions, tags
) VALUES
(
  'TSK-2026-INIT-001',
  'WBOS-WORKSPACE-001',
  'Initialize DeepFlex Sovereign Workspace Lane',
  'DeepFlex: confirm workspace is live, validate schema, report status via heartbeat event',
  'build', 'deepflex', 'system', 'NORMAL', 'PENDING',
  'Poll events/deepflex/ for new tasks. Validate workspace_manifest.json. Write heartbeat to workspace_events.',
  ARRAY['init','deepflex','setup']
),
(
  'TSK-2026-INIT-002',
  'WBOS-WORKSPACE-001',
  'Initialize ChatGPT Build Lane',
  'ChatGPT: confirm tasks/build/ folder is monitored, report ready status',
  'build', 'chatgpt', 'deepflex', 'NORMAL', 'PENDING',
  'Monitor tasks/build/ for TypeScript build tasks. Write outputs to outputs/code/.',
  ARRAY['init','chatgpt','setup']
),
(
  'TSK-2026-INIT-003',
  'WBOS-WORKSPACE-001',
  'Initialize Gemini Automation Lane',
  'Gemini: confirm tasks/deploy/ and tasks/sync/ monitoring, report ready status',
  'document', 'gemini', 'deepflex', 'NORMAL', 'PENDING',
  'Monitor tasks/deploy/ and tasks/sync/. Write documents and automation outputs to outputs/reports/ and outputs/summaries/.',
  ARRAY['init','gemini','setup']
),
(
  'TSK-2026-INIT-004',
  'WBOS-WORKSPACE-001',
  'Initialize Perplexity Research Lane',
  'Perplexity: confirm tasks/research/ monitoring, report ready status',
  'research', 'perplexity', 'deepflex', 'NORMAL', 'PENDING',
  'Monitor tasks/research/ and events/perplexity/. Write intelligence reports to outputs/reports/.',
  ARRAY['init','perplexity','setup']
) ON CONFLICT (task_id) DO NOTHING;

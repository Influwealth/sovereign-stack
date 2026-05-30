-- ============================================================
-- WBOS MIGRATION 012-015: Unified Sovereign Workspace Tables
-- workspace, workspace_events, workspace_tasks, workspace_outputs
-- Author: DeepFlex Architect
-- Date: 2026-05-30
-- ============================================================

-- ─── workspace ───────────────────────────────────────────────
-- Master workspace registry — one row per named workspace
CREATE TABLE IF NOT EXISTS public.workspace (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    TEXT NOT NULL UNIQUE,           -- e.g. WBOS-WORKSPACE-001
  name            TEXT NOT NULL,
  version         TEXT NOT NULL DEFAULT '1.0.0',
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','PAUSED','ARCHIVED','MAINTENANCE')),
  bucket_name     TEXT NOT NULL DEFAULT 'agent-shared',
  github_repo     TEXT,
  manifest        JSONB DEFAULT '{}'::jsonb,      -- full workspace_manifest.json contents
  agents          JSONB DEFAULT '[]'::jsonb,      -- registered agent configs
  sync_config     JSONB DEFAULT '{}'::jsonb,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER workspace_updated_at
  BEFORE UPDATE ON public.workspace
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.workspace ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_agent_all" ON public.workspace FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "workspace_auth_read" ON public.workspace FOR SELECT TO authenticated USING (true);
CREATE POLICY "workspace_anon_block" ON public.workspace FOR ALL TO anon USING (false);

COMMENT ON TABLE public.workspace IS 'Master workspace registry for Unified Sovereign Workspace';

-- ─── workspace_events ────────────────────────────────────────
-- All agent events flowing through the USTF system
CREATE TABLE IF NOT EXISTS public.workspace_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        TEXT NOT NULL UNIQUE,           -- EVT-YYYY-timestamp
  workspace_id    TEXT NOT NULL
                    REFERENCES public.workspace(workspace_id) ON DELETE CASCADE,
  type            TEXT NOT NULL
                    CHECK (type IN (
                      'build','research','deploy','sync','architecture',
                      'capsule_spec','content_drop','repo_patch','document',
                      'automation','dashboard','competitive_intel','market_scan',
                      'alert','heartbeat','error','completed'
                    )),
  source          TEXT NOT NULL
                    CHECK (source IN ('deepflex','chatgpt','gemini','perplexity','system','human')),
  target          TEXT
                    CHECK (target IN ('deepflex','chatgpt','gemini','perplexity','all')),
  priority        TEXT NOT NULL DEFAULT 'NORMAL'
                    CHECK (priority IN ('LOW','NORMAL','HIGH','CRITICAL')),
  status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED','CANCELLED')),
  cap_ref         TEXT,
  campaign_ref    TEXT,
  abl_ref         TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_ref      TEXT,                           -- path in storage bucket
  error           JSONB DEFAULT '{}'::jsonb,
  picked_up_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER workspace_events_updated_at
  BEFORE UPDATE ON public.workspace_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_we_workspace_id ON public.workspace_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_we_type         ON public.workspace_events(type);
CREATE INDEX IF NOT EXISTS idx_we_source       ON public.workspace_events(source);
CREATE INDEX IF NOT EXISTS idx_we_target       ON public.workspace_events(target);
CREATE INDEX IF NOT EXISTS idx_we_status       ON public.workspace_events(status);
CREATE INDEX IF NOT EXISTS idx_we_priority     ON public.workspace_events(priority);
CREATE INDEX IF NOT EXISTS idx_we_created_at   ON public.workspace_events(created_at);

ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "we_agent_all"  ON public.workspace_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "we_auth_read"  ON public.workspace_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "we_anon_block" ON public.workspace_events FOR ALL TO anon USING (false);

COMMENT ON TABLE public.workspace_events IS 'USTF event stream — all agent events across the sovereign workspace';

-- ─── workspace_tasks ─────────────────────────────────────────
-- Structured tasks assigned to agents — richer than events
CREATE TABLE IF NOT EXISTS public.workspace_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         TEXT NOT NULL UNIQUE,           -- TSK-YYYY-timestamp
  workspace_id    TEXT NOT NULL
                    REFERENCES public.workspace(workspace_id) ON DELETE CASCADE,
  event_id        TEXT,                           -- originating event
  title           TEXT NOT NULL,
  description     TEXT,
  task_type       TEXT NOT NULL
                    CHECK (task_type IN ('build','research','deploy','sync','document','review','patch')),
  assigned_to     TEXT NOT NULL
                    CHECK (assigned_to IN ('deepflex','chatgpt','gemini','perplexity','all')),
  assigned_by     TEXT NOT NULL DEFAULT 'deepflex',
  priority        TEXT NOT NULL DEFAULT 'NORMAL'
                    CHECK (priority IN ('LOW','NORMAL','HIGH','CRITICAL')),
  status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','ACCEPTED','IN_PROGRESS','REVIEW','COMPLETED','FAILED','CANCELLED')),
  cap_ref         TEXT,
  campaign_ref    TEXT,
  input_artifacts TEXT[] DEFAULT '{}',            -- storage paths
  output_path     TEXT,                           -- expected output storage path
  instructions    TEXT,
  context         JSONB DEFAULT '{}'::jsonb,
  result          JSONB DEFAULT '{}'::jsonb,
  due_at          TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER workspace_tasks_updated_at
  BEFORE UPDATE ON public.workspace_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_wt_workspace_id  ON public.workspace_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wt_assigned_to   ON public.workspace_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wt_status        ON public.workspace_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wt_priority      ON public.workspace_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_wt_task_type     ON public.workspace_tasks(task_type);

ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wt_agent_all"  ON public.workspace_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "wt_auth_read"  ON public.workspace_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "wt_anon_block" ON public.workspace_tasks FOR ALL TO anon USING (false);

COMMENT ON TABLE public.workspace_tasks IS 'Structured task assignments — DeepFlex dispatches to agent lanes';

-- ─── workspace_outputs ───────────────────────────────────────
-- Registry of all artifacts produced by agents
CREATE TABLE IF NOT EXISTS public.workspace_outputs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  output_id       TEXT NOT NULL UNIQUE,           -- OUT-YYYY-timestamp
  workspace_id    TEXT NOT NULL
                    REFERENCES public.workspace(workspace_id) ON DELETE CASCADE,
  task_id         TEXT,                           -- originating task
  event_id        TEXT,                           -- originating event
  produced_by     TEXT NOT NULL
                    CHECK (produced_by IN ('deepflex','chatgpt','gemini','perplexity','system')),
  output_type     TEXT NOT NULL
                    CHECK (output_type IN ('report','code','summary','migration','schema','manifest','patch','data')),
  title           TEXT NOT NULL,
  description     TEXT,
  storage_path    TEXT NOT NULL,                  -- full path in agent-shared bucket
  file_name       TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type       TEXT DEFAULT 'application/json',
  checksum        TEXT,                           -- SHA256 of file content
  cap_ref         TEXT,
  campaign_ref    TEXT,
  abl_ref         TEXT,
  is_final        BOOLEAN NOT NULL DEFAULT false, -- false = draft, true = final deliverable
  version         TEXT DEFAULT '1.0.0',
  tags            TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER workspace_outputs_updated_at
  BEFORE UPDATE ON public.workspace_outputs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_wo_workspace_id  ON public.workspace_outputs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wo_produced_by   ON public.workspace_outputs(produced_by);
CREATE INDEX IF NOT EXISTS idx_wo_output_type   ON public.workspace_outputs(output_type);
CREATE INDEX IF NOT EXISTS idx_wo_is_final      ON public.workspace_outputs(is_final);
CREATE INDEX IF NOT EXISTS idx_wo_storage_path  ON public.workspace_outputs(storage_path);

ALTER TABLE public.workspace_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_agent_all"  ON public.workspace_outputs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "wo_auth_read"  ON public.workspace_outputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "wo_anon_block" ON public.workspace_outputs FOR ALL TO anon USING (false);

COMMENT ON TABLE public.workspace_outputs IS 'Artifact registry — all agent-produced outputs indexed with storage paths';

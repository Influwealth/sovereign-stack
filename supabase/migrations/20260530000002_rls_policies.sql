-- ============================================================
-- WBOS MIGRATION 011: RLS Policies
-- Applies Row Level Security across all 10 tables
-- Author: DeepFlex Architect
-- Date: 2026-05-30
-- ============================================================

-- ─── campaigns RLS ───────────────────────────────────────────
CREATE POLICY "campaigns_public_read"
  ON public.campaigns FOR SELECT TO anon
  USING (status = 'ACTIVE' AND classification = 'PUBLIC');

CREATE POLICY "campaigns_auth_read"
  ON public.campaigns FOR SELECT TO authenticated
  USING (classification IN ('PUBLIC','INTERNAL'));

CREATE POLICY "campaigns_agent_insert"
  ON public.campaigns FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "campaigns_agent_update"
  ON public.campaigns FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "campaigns_agent_delete"
  ON public.campaigns FOR DELETE TO service_role USING (true);

-- ─── posts RLS ───────────────────────────────────────────────
CREATE POLICY "posts_public_read"
  ON public.posts FOR SELECT TO anon
  USING (status = 'PUBLISHED' AND classification = 'PUBLIC');

CREATE POLICY "posts_auth_read"
  ON public.posts FOR SELECT TO authenticated
  USING (classification IN ('PUBLIC','INTERNAL'));

CREATE POLICY "posts_agent_all"
  ON public.posts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── metrics RLS ─────────────────────────────────────────────
CREATE POLICY "metrics_public_read"
  ON public.metrics FOR SELECT TO anon
  USING (channel IN ('TIKTOK','WIX','INSTAGRAM','X'));

CREATE POLICY "metrics_auth_read"
  ON public.metrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "metrics_agent_insert"
  ON public.metrics FOR INSERT TO service_role WITH CHECK (true);

-- ─── agi_behavior_log RLS ────────────────────────────────────
CREATE POLICY "abl_no_public_access"
  ON public.agi_behavior_log FOR SELECT TO anon USING (false);

CREATE POLICY "abl_auth_read"
  ON public.agi_behavior_log FOR SELECT TO authenticated
  USING (source = 'INTERNAL');

CREATE POLICY "abl_agent_insert"
  ON public.agi_behavior_log FOR INSERT TO service_role WITH CHECK (true);

-- ─── clients RLS ─────────────────────────────────────────────
CREATE POLICY "clients_no_anon"
  ON public.clients FOR SELECT TO anon USING (false);

CREATE POLICY "clients_agent_all"
  ON public.clients FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── transactions RLS ────────────────────────────────────────
CREATE POLICY "transactions_no_anon"
  ON public.transactions FOR SELECT TO anon USING (false);

CREATE POLICY "transactions_agent_all"
  ON public.transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

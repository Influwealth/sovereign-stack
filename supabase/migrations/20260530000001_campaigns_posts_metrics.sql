-- ============================================================
-- WBOS MIGRATION 008-010: campaigns, posts, metrics
-- Drives: Greenville NC AI Nation Alerts, TikTok, Wix
-- Author: DeepFlex Architect
-- Date: 2026-05-30
-- ============================================================

-- ─── campaigns ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  campaign_type   TEXT NOT NULL
                    CHECK (campaign_type IN (
                      'EMERGENCY_ALERT','EDUCATION','CONTENT_DROP',
                      'COMMUNITY_OUTREACH','SOVEREIGN_ANNOUNCEMENT',
                      'GRANT_PUSH','MIXED'
                    )),
  status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN (
                      'DRAFT','SCHEDULED','ACTIVE',
                      'PAUSED','COMPLETED','ARCHIVED','FAILED'
                    )),
  priority        TEXT NOT NULL DEFAULT 'NORMAL'
                    CHECK (priority IN ('LOW','NORMAL','HIGH','CRITICAL')),
  node_ref        TEXT,
  cap_ref         TEXT,
  agent_ref       TEXT,
  geo_targets     TEXT[] DEFAULT '{}',
  channels        TEXT[] DEFAULT '{}',
  audience        TEXT NOT NULL DEFAULT 'PUBLIC'
                    CHECK (audience IN ('PUBLIC','COMMUNITY','YOUTH','PARTNER','INTERNAL')),
  headline        TEXT NOT NULL,
  body            TEXT,
  media_urls      TEXT[] DEFAULT '{}',
  cta_url         TEXT,
  tags            TEXT[] DEFAULT '{}',
  classification  TEXT NOT NULL DEFAULT 'PUBLIC'
                    CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','SOVEREIGN-EYES-ONLY')),
  scheduled_at    TIMESTAMPTZ,
  activated_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_campaigns_status        ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type          ON public.campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_priority      ON public.campaigns(priority);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at  ON public.campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_geo           ON public.campaigns USING GIN(geo_targets);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.campaigns IS 'Campaign orchestration — Greenville NC alerts, TikTok drops, Wix updates';

-- ─── posts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id         TEXT NOT NULL UNIQUE,
  campaign_id     TEXT NOT NULL
                    REFERENCES public.campaigns(campaign_id) ON DELETE CASCADE,
  channel         TEXT NOT NULL
                    CHECK (channel IN (
                      'TIKTOK','WIX','INSTAGRAM','X',
                      'SMS','EMAIL','ICP_FEED','SYNAPZ'
                    )),
  status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN (
                      'PENDING','QUEUED','PUBLISHING',
                      'PUBLISHED','FAILED','RETRYING','ARCHIVED'
                    )),
  content_type    TEXT NOT NULL DEFAULT 'TEXT'
                    CHECK (content_type IN ('TEXT','VIDEO','IMAGE','MIXED','ALERT')),
  title           TEXT,
  body            TEXT NOT NULL,
  media_url       TEXT,
  thumbnail_url   TEXT,
  hashtags        TEXT[] DEFAULT '{}',
  cta_url         TEXT,
  tiktok_post_id  TEXT,
  wix_page_id     TEXT,
  wix_section_id  TEXT,
  external_url    TEXT,
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  agent_ref       TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  abl_ref         TEXT,
  node_ref        TEXT,
  tags            TEXT[] DEFAULT '{}',
  classification  TEXT NOT NULL DEFAULT 'PUBLIC'
                    CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL')),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_posts_campaign_id  ON public.posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_posts_channel      ON public.posts(channel);
CREATE INDEX IF NOT EXISTS idx_posts_status       ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON public.posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.posts IS 'Content units per channel — TikTok, Wix, SMS, ICP_FEED, SynapZ';

-- ─── metrics ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.metrics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id         TEXT NOT NULL UNIQUE,
  post_id           TEXT NOT NULL
                      REFERENCES public.posts(post_id) ON DELETE CASCADE,
  campaign_id       TEXT NOT NULL,
  channel           TEXT NOT NULL,
  views             BIGINT NOT NULL DEFAULT 0,
  likes             BIGINT NOT NULL DEFAULT 0,
  shares            BIGINT NOT NULL DEFAULT 0,
  comments          BIGINT NOT NULL DEFAULT 0,
  saves             BIGINT NOT NULL DEFAULT 0,
  reach             BIGINT NOT NULL DEFAULT 0,
  impressions       BIGINT NOT NULL DEFAULT 0,
  clicks            BIGINT NOT NULL DEFAULT 0,
  engagement_rate   NUMERIC(8,4) DEFAULT 0.0000,
  click_rate        NUMERIC(8,4) DEFAULT 0.0000,
  raw_payload       JSONB DEFAULT '{}'::jsonb,
  collected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collection_window TEXT DEFAULT 'SNAPSHOT'
                      CHECK (collection_window IN (
                        'SNAPSHOT','1H','6H','24H','7D','30D'
                      )),
  agent_ref         TEXT,
  abl_ref           TEXT,
  tags              TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: metrics rows are immutable snapshots
);

CREATE INDEX IF NOT EXISTS idx_metrics_post_id      ON public.metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_metrics_campaign_id  ON public.metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_metrics_channel      ON public.metrics(channel);
CREATE INDEX IF NOT EXISTS idx_metrics_collected_at ON public.metrics(collected_at);

ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.metrics IS 'Immutable performance snapshots — views, likes, reach, engagement_rate';

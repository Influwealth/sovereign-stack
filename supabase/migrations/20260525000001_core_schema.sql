-- ============================================================
-- WBOS MIGRATION 001-007: Core Schema
-- Tables: capsules, agents, sap_nodes, agi_behavior_log,
--         clients, transactions, vault_manifest
-- Project: wealthbridge-core
-- Author: DeepFlex Architect
-- Date: 2026-05-25
-- ============================================================

-- Shared trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── capsules ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capsules (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cap_id              TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  version             TEXT NOT NULL DEFAULT '1.0.0',
  status              TEXT NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','DEPRECATED','ARCHIVED')),
  lane                TEXT NOT NULL DEFAULT 'DEEPFLEX'
                        CHECK (lane IN ('DEEPFLEX','CHATGPT','GEMINI','PERPLEXITY','MULTI')),
  classification      TEXT NOT NULL DEFAULT 'INTERNAL'
                        CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','SOVEREIGN-EYES-ONLY')),
  description         TEXT,
  manifest            JSONB DEFAULT '{}'::jsonb,
  inputs              JSONB DEFAULT '[]'::jsonb,
  outputs             JSONB DEFAULT '[]'::jsonb,
  api_surfaces        JSONB DEFAULT '[]'::jsonb,
  security_model      JSONB DEFAULT '{}'::jsonb,
  observability_hooks JSONB DEFAULT '[]'::jsonb,
  repo_path           TEXT,
  icp_canister_id     TEXT,
  tags                TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER capsules_updated_at BEFORE UPDATE ON public.capsules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_capsules_status ON public.capsules(status);
CREATE INDEX IF NOT EXISTS idx_capsules_lane   ON public.capsules(lane);
CREATE INDEX IF NOT EXISTS idx_capsules_cap_id ON public.capsules(cap_id);
ALTER TABLE public.capsules ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.capsules IS 'WealthBridge OS Capsule Registry — CAP-001 through CAP-017+';

-- ─── agents ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  tier            TEXT NOT NULL
                    CHECK (tier IN ('QUBIT','QUDIT','META-UNIT')),
  lane            TEXT NOT NULL
                    CHECK (lane IN ('DEEPFLEX','CHATGPT','GEMINI','PERPLEXITY','MULTI','SOVEREIGN')),
  status          TEXT NOT NULL DEFAULT 'OFFLINE'
                    CHECK (status IN ('ONLINE','OFFLINE','SUSPENDED','DEGRADED','MAINTENANCE')),
  node_location   TEXT,
  capabilities    TEXT[] DEFAULT '{}',
  model_ref       TEXT,
  sana_address    TEXT,
  cap_assignments TEXT[] DEFAULT '{}',
  last_heartbeat  TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_agents_tier          ON public.agents(tier);
CREATE INDEX IF NOT EXISTS idx_agents_status        ON public.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_node_location ON public.agents(node_location);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.agents IS 'NVQ Mesh Agent Registry — Qubit, Qudit, Meta-Unit tiers';

-- ─── sap_nodes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sap_nodes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id          TEXT NOT NULL UNIQUE,
  node_name        TEXT NOT NULL,
  node_type        TEXT NOT NULL
                     CHECK (node_type IN ('FINANCIAL','COMPUTE','GOVERNANCE','SOCIAL','HYBRID')),
  status           TEXT NOT NULL DEFAULT 'ACTIVE'
                     CHECK (status IN ('ACTIVE','PENDING','SUSPENDED','REVOKED','DECOMMISSIONED')),
  region           TEXT NOT NULL,
  country_code     TEXT NOT NULL DEFAULT 'US',
  operator_name    TEXT,
  operator_email   TEXT,
  wallet_address   TEXT,
  icp_principal    TEXT,
  sap_version      TEXT DEFAULT '1.0',
  protocol_headers JSONB DEFAULT '{}'::jsonb,
  connected_agents TEXT[] DEFAULT '{}',
  connected_caps   TEXT[] DEFAULT '{}',
  financial_id     JSONB DEFAULT '{}'::jsonb,
  compliance       JSONB DEFAULT '{}'::jsonb,
  bandwidth_tier   TEXT DEFAULT 'STANDARD',
  tags             TEXT[] DEFAULT '{}',
  classification   TEXT NOT NULL DEFAULT 'CONFIDENTIAL'
                     CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','SOVEREIGN-EYES-ONLY')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER sap_nodes_updated_at BEFORE UPDATE ON public.sap_nodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_sap_nodes_status   ON public.sap_nodes(status);
CREATE INDEX IF NOT EXISTS idx_sap_nodes_region   ON public.sap_nodes(region);
CREATE INDEX IF NOT EXISTS idx_sap_nodes_type     ON public.sap_nodes(node_type);
ALTER TABLE public.sap_nodes ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.sap_nodes IS 'SAP Node Registry — SANA financial identity nodes';

-- ─── agi_behavior_log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agi_behavior_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  abl_id      TEXT NOT NULL UNIQUE,
  agent_id    TEXT,
  cap_id      TEXT,
  node_id     TEXT,
  tier        TEXT NOT NULL DEFAULT 'QUBIT'
                CHECK (tier IN ('QUBIT','QUDIT','META-UNIT','SYSTEM')),
  event_type  TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'INFO'
                CHECK (severity IN ('DEBUG','INFO','WARN','ERROR','CRITICAL')),
  summary     TEXT NOT NULL,
  payload     JSONB DEFAULT '{}'::jsonb,
  source      TEXT NOT NULL DEFAULT 'AGENT'
                CHECK (source IN ('AGENT','SYSTEM','HUMAN','ICP','EXTERNAL')),
  icp_synced  BOOLEAN NOT NULL DEFAULT false,
  icp_tx_id   TEXT,
  session_ref TEXT,
  tags        TEXT[] DEFAULT '{}',
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_abl_agent_id   ON public.agi_behavior_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_abl_severity   ON public.agi_behavior_log(severity);
CREATE INDEX IF NOT EXISTS idx_abl_event_type ON public.agi_behavior_log(event_type);
CREATE INDEX IF NOT EXISTS idx_abl_logged_at  ON public.agi_behavior_log(logged_at);
ALTER TABLE public.agi_behavior_log ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.agi_behavior_log IS 'Append-only AGI audit log — ABL-YYYY-### format';

-- ─── clients ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id                TEXT NOT NULL UNIQUE,
  display_name             TEXT NOT NULL,
  entity_type              TEXT NOT NULL DEFAULT 'INDIVIDUAL'
                             CHECK (entity_type IN ('INDIVIDUAL','BUSINESS','NONPROFIT','DAO','COMMUNITY')),
  status                   TEXT NOT NULL DEFAULT 'PROSPECT'
                             CHECK (status IN ('PROSPECT','ACTIVE','PAUSED','GRADUATED','CHURNED')),
  tier                     TEXT NOT NULL DEFAULT 'ADULT'
                             CHECK (tier IN ('YOUTH','ADULT','ENTERPRISE','PARTNER')),
  email                    TEXT,
  phone                    TEXT,
  address_line1            TEXT,
  city                     TEXT,
  state                    TEXT,
  zip                      TEXT,
  country_code             TEXT NOT NULL DEFAULT 'US',
  node_ref                 TEXT,
  community                TEXT,
  contract_value           NUMERIC(12,2) DEFAULT 0.00,
  amount_paid              NUMERIC(12,2) DEFAULT 0.00,
  amount_outstanding       NUMERIC(12,2) GENERATED ALWAYS AS (contract_value - amount_paid) STORED,
  payment_plan             BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id       TEXT,
  docusign_envelope_id     TEXT,
  credit_bureau_reporting  BOOLEAN NOT NULL DEFAULT false,
  duns_number              TEXT,
  grants_applied           JSONB DEFAULT '[]'::jsonb,
  benefits_active          JSONB DEFAULT '[]'::jsonb,
  notes                    TEXT,
  tags                     TEXT[] DEFAULT '{}',
  classification           TEXT NOT NULL DEFAULT 'CONFIDENTIAL'
                             CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','SOVEREIGN-EYES-ONLY')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_clients_status    ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_node_ref  ON public.clients(node_ref);
CREATE INDEX IF NOT EXISTS idx_clients_community ON public.clients(community);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.clients IS 'Consulting client profiles — Stripe + Docusign native fields';

-- ─── transactions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_id            TEXT NOT NULL UNIQUE,
  tx_type          TEXT NOT NULL
                     CHECK (tx_type IN ('CONSULTING_FEE','GRANT','PAYOUT','REFUND','TRANSFER','ESCROW','TOKEN_MINT')),
  status           TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','REVERSED','DISPUTED')),
  direction        TEXT NOT NULL DEFAULT 'INBOUND'
                     CHECK (direction IN ('INBOUND','OUTBOUND','INTERNAL')),
  client_id        TEXT,
  node_id          TEXT,
  agent_id         TEXT,
  cap_id           TEXT,
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  currency         TEXT NOT NULL DEFAULT 'USD',
  fee              NUMERIC(10,4),
  net_amount       NUMERIC(14,2),
  payment_rail     TEXT DEFAULT 'STRIPE'
                     CHECK (payment_rail IN ('STRIPE','CIRCLE','ICP','ACH','WIRE','CHECK','CRYPTO','INTERNAL')),
  stripe_payment_id TEXT,
  circle_payment_id TEXT,
  icp_tx_hash      TEXT,
  invoice_ref      TEXT,
  abl_ref          TEXT,
  payload          JSONB DEFAULT '{}'::jsonb,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_tx_status     ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_type       ON public.transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_tx_client_id  ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_tx_rail       ON public.transactions(payment_rail);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.transactions IS 'Multi-rail payment ledger — Stripe, Circle, ICP';

-- ─── vault_manifest ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vault_manifest (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secret_key   TEXT NOT NULL UNIQUE,
  vault_id     TEXT,
  category     TEXT NOT NULL
                 CHECK (category IN ('PAYMENT','BLOCKCHAIN','AI','SOCIAL','CMS','INFRA','AUTH')),
  service      TEXT NOT NULL,
  environment  TEXT NOT NULL DEFAULT 'PRODUCTION'
                 CHECK (environment IN ('PRODUCTION','STAGING','DEVELOPMENT')),
  is_set       BOOLEAN NOT NULL DEFAULT false,
  last_rotated TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER vault_manifest_updated_at BEFORE UPDATE ON public.vault_manifest
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.vault_manifest ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.vault_manifest IS 'Vault key manifest — tracks which secrets are registered (no values stored here)';

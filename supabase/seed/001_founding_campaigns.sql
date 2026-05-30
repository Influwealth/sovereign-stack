-- ============================================================
-- WBOS SEED: Founding Campaigns + Posts
-- 4 campaigns / 17 posts across 8 channels
-- Author: DeepFlex Architect
-- Date: 2026-05-30
-- ============================================================

INSERT INTO public.campaigns (
  campaign_id, name, campaign_type, status, priority,
  node_ref, cap_ref, agent_ref, geo_targets, channels,
  audience, headline, body, cta_url, tags, classification,
  activated_at, metadata
) VALUES

('CAMP-2026-GVL-001',
 'Greenville NC AI Nation — Education Emergency Alert',
 'EMERGENCY_ALERT','ACTIVE','CRITICAL',
 'greenville-nc','CAP-014','AGT-GEMINI-001',
 ARRAY['greenville-nc','pitt-county-nc','27834','27858'],
 ARRAY['TIKTOK','WIX','SMS','EMAIL'],
 'PUBLIC',
 'AI NATION ALERT: Free Education Resources Now Available in Greenville NC',
 'InfluWealth Quantum Labs is activating the Greenville NC AI Nation node. Free financial literacy, AI education, and sovereign technology training is now available to all residents of Greenville NC and Pitt County. This is your community. This is your infrastructure. Claim your access now.',
 'https://influwealth.com/greenville',
 ARRAY['greenville-nc','ai-nation','education','emergency-alert','G5','CAP-014'],
 'PUBLIC', NOW(),
 '{"node":"G5","zip_codes":["27834","27858"],"program":"AI Nation Education","cap":"CAP-014"}'::jsonb),

('CAMP-2026-GVL-002',
 'Greenville NC — AI Literacy Content Series',
 'EDUCATION','ACTIVE','HIGH',
 'greenville-nc','CAP-014','AGT-GEMINI-001',
 ARRAY['greenville-nc','pitt-county-nc'],
 ARRAY['TIKTOK','WIX','SYNAPZ'],
 'YOUTH',
 '5 Things AI Can Do For Your Community Right Now',
 'Most people think AI is for Silicon Valley. We built it for East Flatbush and Greenville NC. Here are 5 ways WealthBridge OS is putting sovereign AI technology directly in the hands of underserved communities — no degree required, no gatekeepers, no fees.',
 'https://influwealth.com/ai-literacy',
 ARRAY['greenville-nc','youth','ai-literacy','education','wealthbridge'],
 'PUBLIC', NOW(),
 '{"series":"AI Literacy","episode":1,"target_age":"16-35"}'::jsonb),

('CAMP-2026-EF-001',
 'East Flatbush — Sovereign Infrastructure Announcement',
 'SOVEREIGN_ANNOUNCEMENT','ACTIVE','HIGH',
 'east-flatbush-nyc','CAP-016','AGT-DEEPFLEX-001',
 ARRAY['east-flatbush-nyc','brooklyn-ny','east-94th'],
 ARRAY['TIKTOK','WIX','INSTAGRAM','SYNAPZ'],
 'COMMUNITY',
 'East Flatbush: The Sovereign Venture Engine Is Live',
 'The block that built us is now the block that runs on sovereign AI infrastructure. InfluWealth Consult LLC — born on East 94th Street — has activated the Sovereign Venture Engine (SVE). 15 community businesses. One sovereign OS. Zero extractive middlemen.',
 'https://influwealth.com/east-flatbush',
 ARRAY['east-flatbush','brooklyn','sovereign','SVE','CAP-016','community-wealth'],
 'PUBLIC', NOW(),
 '{"node":"east-flatbush-nyc","cap":"CAP-016","program":"SVE","founding_block":"East 94th Street"}'::jsonb),

('CAMP-2026-WBOS-001',
 'WealthBridge OS — Global Sovereign Infrastructure Launch',
 'SOVEREIGN_ANNOUNCEMENT','SCHEDULED','CRITICAL',
 NULL,'CAP-001','AGT-DEEPFLEX-001',
 ARRAY['east-flatbush-nyc','greenville-nc','baltimore-md','senegal'],
 ARRAY['TIKTOK','WIX','INSTAGRAM','X','ICP_FEED','SYNAPZ'],
 'PUBLIC',
 'WealthBridge OS Is Live: The Sovereign Operating System for Community Wealth',
 'Four nodes. One sovereign stack. WealthBridge OS is the first community-owned AI operating system built to replace extractive financial infrastructure. From East Flatbush to Senegal — the architecture is live, the agents are deployed, and the 2027 harvest window is open.',
 'https://influwealth.com/wealthbridge',
 ARRAY['wealthbridge-os','sovereign','global-launch','ICP','AI-nation','2027-harvest','diaspora'],
 'PUBLIC', NULL,
 '{"nodes":["east-flatbush-nyc","greenville-nc","baltimore-md","senegal"],"harvest_year":2027,"version":"1.0.0"}'::jsonb)

ON CONFLICT (campaign_id) DO NOTHING;

-- ─── Posts ───────────────────────────────────────────────────
INSERT INTO public.posts (
  post_id, campaign_id, channel, status, content_type,
  title, body, hashtags, cta_url, tags, classification, node_ref
) VALUES

-- GVL-001 Emergency Alert Posts
('CAMP-2026-GVL-001-TIKTOK-001','CAMP-2026-GVL-001','TIKTOK','PENDING','ALERT',
 'AI NATION ALERT 🚨 Greenville NC',
 'Free AI education is live in Greenville NC. InfluWealth just activated the G5 node. Financial literacy. Sovereign tech. No gatekeepers. Link in bio.',
 ARRAY['#GreenvilleNC','#AINation','#FreeEducation','#InfluWealth','#SovereignTech','#G5','#WealthBridgeOS'],
 'https://influwealth.com/greenville',
 ARRAY['alert','tiktok','greenville-nc'],'PUBLIC','greenville-nc'),

('CAMP-2026-GVL-001-WIX-001','CAMP-2026-GVL-001','WIX','PENDING','ALERT',
 'AI NATION ALERT: Free Education Resources Now Available in Greenville NC',
 'InfluWealth Quantum Labs is activating the Greenville NC AI Nation node. Free financial literacy, AI education, and sovereign technology training is now available to all residents of Greenville NC and Pitt County.',
 ARRAY['#GreenvilleNC','#AINation','#InfluWealth']::text[],
 'https://influwealth.com/greenville',
 ARRAY['alert','wix','greenville-nc'],'PUBLIC','greenville-nc'),

('CAMP-2026-GVL-001-SMS-001','CAMP-2026-GVL-001','SMS','PENDING','ALERT',
 'InfluWealth Alert',
 'INFLUWEALTH ALERT: Free AI & financial literacy training NOW available in Greenville NC. Visit influwealth.com/greenville or reply INFO.',
 ARRAY['#GreenvilleNC']::text[],
 'https://influwealth.com/greenville',
 ARRAY['alert','sms','greenville-nc'],'PUBLIC','greenville-nc'),

('CAMP-2026-GVL-001-EMAIL-001','CAMP-2026-GVL-001','EMAIL','PENDING','ALERT',
 'AI Nation Alert — Free Resources Available Now in Greenville NC',
 'Dear Greenville NC Community Member, InfluWealth Consult LLC is activating the Greenville NC AI Nation node. Free financial literacy, AI education, and sovereign technology training is available to all Pitt County residents. Visit influwealth.com/greenville to claim your access.',
 ARRAY['#GreenvilleNC','#AINation']::text[],
 'https://influwealth.com/greenville',
 ARRAY['alert','email','greenville-nc'],'PUBLIC','greenville-nc'),

-- GVL-002 Education Series
('CAMP-2026-GVL-002-TIKTOK-001','CAMP-2026-GVL-002','TIKTOK','PENDING','TEXT',
 '5 Things AI Can Do For Your Community Right Now',
 'Most people think AI is for Silicon Valley. We built it for Greenville NC. Here are 5 ways WealthBridge OS puts sovereign AI in your hands — no degree, no fees, no gatekeepers.',
 ARRAY['#GreenvilleNC','#AILiteracy','#Youth','#InfluWealth','#WealthBridgeOS','#SovereignTech'],
 'https://influwealth.com/ai-literacy',
 ARRAY['education','tiktok','greenville-nc','youth'],'PUBLIC','greenville-nc'),

('CAMP-2026-GVL-002-WIX-001','CAMP-2026-GVL-002','WIX','PENDING','TEXT',
 '5 Things AI Can Do For Your Community Right Now',
 'Most people think AI is for Silicon Valley. We built it for East Flatbush and Greenville NC. Here are 5 ways WealthBridge OS is putting sovereign AI technology directly in the hands of underserved communities.',
 ARRAY['#AILiteracy','#GreenvilleNC','#WealthBridgeOS']::text[],
 'https://influwealth.com/ai-literacy',
 ARRAY['education','wix','greenville-nc'],'PUBLIC','greenville-nc'),

('CAMP-2026-GVL-002-SYNAPZ-001','CAMP-2026-GVL-002','SYNAPZ','PENDING','TEXT',
 'AI Literacy Series — Episode 1 | Greenville NC AI Nation',
 'Sovereign knowledge for sovereign people. Episode 1 of the Greenville NC AI Nation Education Series is now live on SynapZ.',
 ARRAY['#SynapZ','#AINation','#GreenvilleNC','#AILiteracy']::text[],
 'https://influwealth.com/ai-literacy',
 ARRAY['education','synapz','greenville-nc'],'PUBLIC','greenville-nc'),

-- EF-001 East Flatbush
('CAMP-2026-EF-001-TIKTOK-001','CAMP-2026-EF-001','TIKTOK','PENDING','TEXT',
 'East Flatbush Built This 👑',
 'East 94th Street. Brooklyn. That is where InfluWealth was born. Now the Sovereign Venture Engine is live — 15 community businesses running on one sovereign AI stack.',
 ARRAY['#EastFlatbush','#Brooklyn','#SovereignVentureEngine','#InfluWealth','#WealthBridgeOS','#SVE'],
 'https://influwealth.com/east-flatbush',
 ARRAY['sovereign','tiktok','east-flatbush','SVE'],'PUBLIC','east-flatbush-nyc'),

('CAMP-2026-EF-001-WIX-001','CAMP-2026-EF-001','WIX','PENDING','TEXT',
 'East Flatbush: The Sovereign Venture Engine Is Live',
 'The block that built us is now the block that runs on sovereign AI infrastructure. InfluWealth Consult LLC — born on East 94th Street — has activated the Sovereign Venture Engine (SVE).',
 ARRAY['#EastFlatbush','#SVE','#InfluWealth']::text[],
 'https://influwealth.com/east-flatbush',
 ARRAY['sovereign','wix','east-flatbush'],'PUBLIC','east-flatbush-nyc'),

('CAMP-2026-EF-001-INSTAGRAM-001','CAMP-2026-EF-001','INSTAGRAM','PENDING','IMAGE',
 'Architecture as Infinite Collateral — East Flatbush',
 'The ancestors built infrastructure. We digitized it. East 94th Street → WealthBridge OS. Zero marginal cost. Infinite reach. Sovereign by design. 🔱',
 ARRAY['#EastFlatbush','#Brooklyn','#ArchitectureAsCollateral','#InfluWealth','#BlackWealth'],
 'https://influwealth.com/east-flatbush',
 ARRAY['sovereign','instagram','east-flatbush'],'PUBLIC','east-flatbush-nyc'),

('CAMP-2026-EF-001-SYNAPZ-001','CAMP-2026-EF-001','SYNAPZ','PENDING','TEXT',
 'Sovereign Venture Engine Activation — East Flatbush Node',
 'The SVE is live. 15 sovereign businesses operating under WealthBridge OS. Each one replacing an extractive incumbent.',
 ARRAY['#SVE','#EastFlatbush','#Sovereign','#WealthBridgeOS']::text[],
 'https://influwealth.com/east-flatbush',
 ARRAY['sovereign','synapz','east-flatbush'],'PUBLIC','east-flatbush-nyc'),

-- WBOS-001 Global Launch
('CAMP-2026-WBOS-001-TIKTOK-001','CAMP-2026-WBOS-001','TIKTOK','PENDING','VIDEO',
 'WealthBridge OS Is Live 🌍',
 'Four nodes. One sovereign stack. East Flatbush. Greenville NC. Baltimore. Senegal. WealthBridge OS is the first community-owned AI operating system built to replace extractive financial infrastructure.',
 ARRAY['#WealthBridgeOS','#Sovereign','#AI','#BlackWealth','#Diaspora','#2027','#InfluWealth'],
 'https://influwealth.com/wealthbridge',
 ARRAY['global-launch','tiktok','wbos'],'PUBLIC',NULL),

('CAMP-2026-WBOS-001-WIX-001','CAMP-2026-WBOS-001','WIX','PENDING','TEXT',
 'WealthBridge OS — The Sovereign Operating System for Community Wealth',
 'WealthBridge OS is live. Four sovereign nodes. One architecture. East Flatbush to Senegal.',
 ARRAY['#WealthBridgeOS','#Sovereign','#GlobalLaunch']::text[],
 'https://influwealth.com/wealthbridge',
 ARRAY['global-launch','wix','wbos'],'PUBLIC',NULL),

('CAMP-2026-WBOS-001-INSTAGRAM-001','CAMP-2026-WBOS-001','INSTAGRAM','PENDING','IMAGE',
 'Four Nodes. One Sovereign OS.',
 'East Flatbush. Greenville NC. Baltimore. Senegal. The architecture is live. The agents are deployed. The 2027 harvest window is open. WealthBridge OS. Built different. 🔱',
 ARRAY['#WealthBridgeOS','#Sovereign','#EastFlatbush','#GreenvilleNC','#Baltimore','#Senegal','#Diaspora'],
 'https://influwealth.com/wealthbridge',
 ARRAY['global-launch','instagram','wbos'],'PUBLIC',NULL),

('CAMP-2026-WBOS-001-X-001','CAMP-2026-WBOS-001','X','PENDING','TEXT',
 'WealthBridge OS Launch',
 'WealthBridge OS is live. The first sovereign AI operating system for community wealth-building. 4 nodes. ICP blockchain. Multi-agent pipeline. Zero extractive middlemen. Built in East Flatbush. Deploying globally. 🔱',
 ARRAY['#WealthBridgeOS','#SovereignAI','#ICP','#Community','#2027']::text[],
 'https://influwealth.com/wealthbridge',
 ARRAY['global-launch','x','wbos'],'PUBLIC',NULL),

('CAMP-2026-WBOS-001-ICP_FEED-001','CAMP-2026-WBOS-001','ICP_FEED','PENDING','TEXT',
 'WBOS v1.0.0 — Sovereign Infrastructure Deployment Confirmed',
 'WealthBridge OS v1.0.0 is deployed across 4 sovereign nodes. SAP Protocol v1.0 active. Capsule registry seeded CAP-001 through CAP-016. Agent mesh online. ICP canister bridge ready. 2027 harvest window: OPEN.',
 ARRAY['#WBOS','#ICP','#SovereignProtocol']::text[],
 'https://influwealth.com/wealthbridge',
 ARRAY['global-launch','icp-feed','wbos'],'PUBLIC',NULL),

('CAMP-2026-WBOS-001-SYNAPZ-001','CAMP-2026-WBOS-001','SYNAPZ','PENDING','TEXT',
 'WealthBridge OS Global Launch — The Movement Is Infrastructure',
 'This is not a startup. This is sovereign infrastructure for communities that have been systematically excluded from the wealth-building mechanisms of the digital economy.',
 ARRAY['#WealthBridgeOS','#Sovereign','#SynapZ','#Movement','#2027']::text[],
 'https://influwealth.com/wealthbridge',
 ARRAY['global-launch','synapz','wbos'],'PUBLIC',NULL)

ON CONFLICT (post_id) DO NOTHING;

-- ─── ABL seed entries ─────────────────────────────────────────
INSERT INTO public.agi_behavior_log (
  abl_id, agent_id, cap_id, tier, event_type, severity, summary, payload, source, tags
) VALUES
('ABL-2026-001','AGT-DEEPFLEX-001','CAP-001','META-UNIT','SCHEMA_DEPLOYED','INFO',
 'WBOS core schema deployed — campaigns, posts, metrics tables created. RLS policies active.',
 '{"tables_created":["campaigns","posts","metrics"],"rls_policies":14,"migrations":["008","009","010","011"]}'::jsonb,
 'SYSTEM', ARRAY['schema','migration','DDL','RLS']),

('ABL-2026-002','AGT-DEEPFLEX-001','CAP-014','META-UNIT','CAMPAIGN_SEEDED','INFO',
 'Founding campaigns seeded — 4 campaigns, 17 posts across 8 channels.',
 '{"campaigns":4,"posts":17,"channels":["TIKTOK","WIX","SMS","EMAIL","INSTAGRAM","SYNAPZ","X","ICP_FEED"]}'::jsonb,
 'SYSTEM', ARRAY['campaigns','seed','greenville-nc','east-flatbush','WBOS'])

ON CONFLICT (abl_id) DO NOTHING;

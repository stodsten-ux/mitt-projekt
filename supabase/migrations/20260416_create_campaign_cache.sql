-- campaign_cache: cachade kampanjsvar per butik och ISO-vecka
CREATE TABLE campaign_cache (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store       TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  year        INTEGER NOT NULL,
  payload     JSONB NOT NULL,
  valid_until DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (store, week_number, year)
);

CREATE INDEX idx_campaign_cache_lookup ON campaign_cache(store, week_number, year);

ALTER TABLE campaign_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_cache_read" ON campaign_cache
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "campaign_cache_service_write" ON campaign_cache
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

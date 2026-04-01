-- price_cache: cachade prisuppskattningar per vara/butik
CREATE TABLE price_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  store TEXT NOT NULL,
  price DECIMAL(10,2),
  unit TEXT,
  is_campaign BOOLEAN DEFAULT FALSE,
  campaign_label TEXT,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE DEFAULT CURRENT_DATE + INTERVAL '7 days',
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_price_cache_item ON price_cache(item_name, valid_until);
CREATE INDEX idx_price_cache_store ON price_cache(store, valid_until);

-- RLS: price_cache är läsbar för alla autentiserade, skrivbar via service role
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_cache_read" ON price_cache
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "price_cache_service_write" ON price_cache
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 広告費データ
CREATE TABLE ad_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel VARCHAR(50) NOT NULL,
  campaign_name VARCHAR(200),
  spend DECIMAL(10,0) NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_revenue DECIMAL(10,0) DEFAULT 0,
  product_id UUID REFERENCES products(id),
  notes TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_costs_date ON ad_costs(date);
CREATE INDEX idx_ad_costs_channel ON ad_costs(channel);
CREATE INDEX idx_ad_costs_product ON ad_costs(product_id);

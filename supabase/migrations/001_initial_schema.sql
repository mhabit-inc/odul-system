-- ödül MD業務システム: 商品企画DB スキーマ
-- Phase 1 MVP

-- メーカー
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  order_sheet_template_id VARCHAR(50),
  lead_time_days INTEGER DEFAULT 105,
  has_inspection_columns BOOLEAN DEFAULT false,
  max_stone_count INTEGER DEFAULT 3,
  price_format VARCHAR(20),
  contact_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- シーズン
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  shooting_date DATE,
  shooting_cost DECIMAL(10,0),
  uses_previous_creative BOOLEAN DEFAULT false,
  notes TEXT,
  UNIQUE(name, year)
);

-- 商品マスタ
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  category VARCHAR(50) NOT NULL,
  material VARCHAR(50),
  color VARCHAR(50),
  stone_1 VARCHAR(100),
  stone_2 VARCHAR(100),
  stone_3 VARCHAR(100),
  cost_price_inr DECIMAL(10,2),
  exchange_rate DECIMAL(8,4),
  cost_price_jpy DECIMAL(10,0),
  selling_price DECIMAL(10,0) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  size_options VARCHAR(100),
  product_class VARCHAR(20) DEFAULT '未分類',
  product_class_stage VARCHAR(20),
  launched_at DATE,
  season_id UUID REFERENCES seasons(id),
  shopify_product_id VARCHAR(100),
  elle_product_code VARCHAR(100),
  image_url VARCHAR(500),
  spreadsheet_row INTEGER,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 商品分類履歴
CREATE TABLE product_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  class_type VARCHAR(20) NOT NULL,
  stage VARCHAR(20) NOT NULL,
  sales_data_json JSONB,
  system_suggestion VARCHAR(20),
  reason TEXT,
  classified_by VARCHAR(100) NOT NULL,
  classified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_classifications_product ON product_classifications(product_id);

-- 分類閾値設定
CREATE TABLE classification_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(20) NOT NULL,
  staple_min DECIMAL(10,2) NOT NULL,
  archive_max DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  effective_from DATE NOT NULL,
  notes TEXT
);

-- デフォルト閾値
INSERT INTO classification_thresholds (stage, staple_min, archive_max, unit, effective_from, notes) VALUES
  ('preliminary', 5, 1, 'quantity', '2026-01-01', '7日一次判定: 定番候補≥5個、アーカイブ候補≤1個'),
  ('confirmed', 70, 40, 'percentage', '2026-01-01', '90日確定判定: 定番≥70%消化率、アーカイブ<40%');

-- 新作企画分類マスタ
CREATE TABLE planning_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  owner_role VARCHAR(20),
  is_new_product BOOLEAN NOT NULL,
  description TEXT,
  max_styles INTEGER,
  avg_order_per_size INTEGER,
  max_order_quantity INTEGER,
  avg_unit_price DECIMAL(10,0),
  expected_sell_through_90d DECIMAL(5,2),
  max_stones INTEGER,
  launch_timing_note VARCHAR(200),
  product_type_example VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- デフォルト企画分類
INSERT INTO planning_categories (name, owner_role, is_new_product, description, max_styles, avg_order_per_size, max_order_quantity, avg_unit_price, expected_sell_through_90d, launch_timing_note, product_type_example) VALUES
  ('流行品', 'ディレクター', true, '同業他社ベンチマーク', 3, 5, 60, 13000, 65, NULL, 'リング'),
  ('テスト商品[挑戦枠]', 'ディレクター', true, '新しい挑戦', 2, 5, 40, 13000, 50, NULL, 'ブレスレット'),
  ('改良品', 'MD', false, '過去未売却商品の改良版', 3, 5, 60, 13000, 65, NULL, 'ネックレス'),
  ('横転商品（セミ定番版）', 'MD', false, '過去売れた商品のカテゴリ・石・サイズ調整', 4, 5, NULL, 13000, 75, 'シーズン2週目', 'イヤリング'),
  ('横転商品（定番版）', 'MD', false, '同上、定番寄り', 4, 5, NULL, 13000, 75, 'シーズン2週目', 'イヤリング'),
  ('再販商品', NULL, false, '過去販売数×消化スピード連動倍率', NULL, NULL, NULL, NULL, NULL, NULL, 'チャーム');

-- 新作発注計画
CREATE TABLE new_product_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id),
  planning_category_id UUID NOT NULL REFERENCES planning_categories(id),
  planned_styles INTEGER NOT NULL,
  planned_quantity INTEGER NOT NULL,
  expected_revenue DECIMAL(12,0),
  launch_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 新作計画-商品紐付け
CREATE TABLE new_product_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES new_product_plans(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(200),
  quantity INTEGER NOT NULL,
  notes TEXT
);

-- リオーダーアラート
CREATE TABLE reorder_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  alert_level VARCHAR(20) NOT NULL,
  current_stock INTEGER NOT NULL,
  monthly_sales_rate DECIMAL(8,2) NOT NULL,
  months_until_stockout DECIMAL(5,2) NOT NULL,
  recommended_quantity INTEGER,
  event_coefficient DECIMAL(4,2) DEFAULT 1.0,
  is_acknowledged BOOLEAN DEFAULT false,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reorder_alerts_product ON reorder_alerts(product_id);
CREATE INDEX idx_reorder_alerts_level ON reorder_alerts(alert_level);

-- イベント
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sales_coefficient DECIMAL(4,2) DEFAULT 1.0,
  target_amount DECIMAL(12,0),
  notes TEXT
);

-- セミ定番 再販予定
CREATE TABLE resale_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  planned_season_id UUID REFERENCES seasons(id),
  planned_month DATE NOT NULL,
  order_deadline DATE,
  variation_notes TEXT,
  quantity_override INTEGER,
  status VARCHAR(20) DEFAULT 'planned',
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 再販倍率設定
CREATE TABLE restock_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sell_through_min DECIMAL(5,2) NOT NULL,
  sell_through_max DECIMAL(5,2) NOT NULL,
  multiplier DECIMAL(4,2) NOT NULL,
  notes VARCHAR(200)
);

-- デフォルト倍率
INSERT INTO restock_multipliers (sell_through_min, sell_through_max, multiplier, notes) VALUES
  (80, 100, 1.5, '高速消化。欠品リスク回避のため多めに'),
  (60, 80, 1.3, '順調な消化。やや上乗せ'),
  (40, 60, 1.2, '緩やかな消化。微増で様子見'),
  (0, 40, 1.0, '消化が遅い。在庫過多リスク');

-- 売上データ
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  revenue DECIMAL(10,0) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  sold_at TIMESTAMPTZ NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_product ON sales(product_id);
CREATE INDEX idx_sales_sold_at ON sales(sold_at);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_new_product_plans_updated_at BEFORE UPDATE ON new_product_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_resale_plans_updated_at BEFORE UPDATE ON resale_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

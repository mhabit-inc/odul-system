-- Phase 3: 在庫管理システム

-- 検品記録
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  inspected_quantity INTEGER NOT NULL,
  good_quantity INTEGER NOT NULL,
  defective_quantity INTEGER NOT NULL DEFAULT 0,
  missing_quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  inspected_by VARCHAR(100),
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspections_order ON inspections(order_id);
CREATE INDEX idx_inspections_product ON inspections(product_id);

-- 不良品詳細
CREATE TABLE IF NOT EXISTS defective_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  photo_urls JSONB,
  action VARCHAR(50),
  action_status VARCHAR(20) DEFAULT '未対応',
  notes TEXT
);

CREATE INDEX idx_defective_items_inspection ON defective_items(inspection_id);

-- 在庫変動履歴
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_tx_product ON inventory_transactions(product_id);
CREATE INDEX idx_inv_tx_type ON inventory_transactions(type);

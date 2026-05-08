-- RLS有効化
-- サーバーAPI: service_role_keyでRLSバイパス
-- クライアント直接アクセス: anonキーに読み取り専用ポリシー

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_product_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_product_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE defective_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- クライアントページ（ダッシュボード、商品一覧、リオーダー）がanonで読み取りする
CREATE POLICY "anon_read_products" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_sales" ON sales FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_orders" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_reorder_alerts" ON reorder_alerts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_events" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_suppliers" ON suppliers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_classifications" ON product_classifications FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_inspections" ON inspections FOR SELECT TO anon USING (true);

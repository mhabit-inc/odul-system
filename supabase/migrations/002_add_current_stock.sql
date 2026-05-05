-- OpenLogi在庫数を保存するカラムを追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;

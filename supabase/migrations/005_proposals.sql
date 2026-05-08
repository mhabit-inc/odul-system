-- 企画書テンプレート・企画書

CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  template_id UUID REFERENCES proposal_templates(id),
  season_id UUID REFERENCES seasons(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}',
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_proposal_templates_updated_at BEFORE UPDATE ON proposal_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO proposal_templates (name, description, sections, is_default) VALUES
  ('標準企画書', '新商品企画の標準テンプレート', '[
    {"key": "concept", "label": "コンセプト", "type": "textarea"},
    {"key": "target", "label": "ターゲット顧客", "type": "textarea"},
    {"key": "products", "label": "商品ラインナップ", "type": "textarea"},
    {"key": "pricing", "label": "価格戦略", "type": "textarea"},
    {"key": "schedule", "label": "スケジュール", "type": "textarea"},
    {"key": "budget", "label": "予算", "type": "textarea"},
    {"key": "marketing", "label": "販促計画", "type": "textarea"}
  ]', true);

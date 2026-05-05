export type Product = {
  id: string;
  sku: string;
  name: string;
  name_en: string | null;
  category: string;
  material: string | null;
  color: string | null;
  stone_1: string | null;
  stone_2: string | null;
  stone_3: string | null;
  cost_price_inr: number | null;
  exchange_rate: number | null;
  cost_price_jpy: number | null;
  selling_price: number;
  supplier_id: string | null;
  size_options: string | null;
  product_class: "定番" | "セミ定番" | "アーカイブ" | "未分類";
  product_class_stage: "preliminary" | "confirmed" | null;
  launched_at: string | null;
  season_id: string | null;
  shopify_product_id: string | null;
  elle_product_code: string | null;
  image_url: string | null;
  spreadsheet_row: number | null;
  current_stock: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductClassification = {
  id: string;
  product_id: string;
  class_type: "staple" | "semi_staple" | "archive";
  stage: "preliminary" | "confirmed";
  sales_data_json: Record<string, unknown> | null;
  system_suggestion: string | null;
  reason: string | null;
  classified_by: string;
  classified_at: string;
};

export type ClassificationThreshold = {
  id: string;
  stage: "preliminary" | "confirmed";
  staple_min: number;
  archive_max: number;
  unit: "quantity" | "percentage";
  effective_from: string;
  notes: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  code: string;
  order_sheet_template_id: string | null;
  lead_time_days: number;
  has_inspection_columns: boolean;
  max_stone_count: number;
  price_format: string | null;
  contact_info: string | null;
  notes: string | null;
  created_at: string;
};

export type Season = {
  id: string;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  shooting_date: string | null;
  shooting_cost: number | null;
  uses_previous_creative: boolean;
  notes: string | null;
};

export type PlanningCategory = {
  id: string;
  name: string;
  owner_role: string | null;
  is_new_product: boolean;
  description: string | null;
  max_styles: number | null;
  avg_order_per_size: number | null;
  max_order_quantity: number | null;
  avg_unit_price: number | null;
  expected_sell_through_90d: number | null;
  max_stones: number | null;
  launch_timing_note: string | null;
  product_type_example: string | null;
  updated_at: string;
};

export type ReorderAlert = {
  id: string;
  product_id: string;
  alert_level: "critical" | "warning" | "safe";
  current_stock: number;
  monthly_sales_rate: number;
  months_until_stockout: number;
  recommended_quantity: number | null;
  event_coefficient: number;
  is_acknowledged: boolean;
  calculated_at: string;
};

export type Event = {
  id: string;
  name: string;
  type: "seasonal" | "popup" | "campaign";
  start_date: string;
  end_date: string;
  sales_coefficient: number;
  target_amount: number | null;
  notes: string | null;
};

export type Sale = {
  id: string;
  product_id: string;
  quantity: number;
  revenue: number;
  channel: "shopify" | "elle";
  sold_at: string;
  imported_at: string;
};

export type ResalePlan = {
  id: string;
  product_id: string;
  planned_season_id: string | null;
  planned_month: string;
  order_deadline: string | null;
  variation_notes: string | null;
  quantity_override: number | null;
  status: "planned" | "ordering" | "ordered" | "cancelled";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RestockMultiplier = {
  id: string;
  sell_through_min: number;
  sell_through_max: number;
  multiplier: number;
  notes: string | null;
};

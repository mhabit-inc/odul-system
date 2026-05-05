import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getProducts(params: {
  search?: string;
  productClass?: string;
  category?: string;
  page?: number;
}) {
  const page = params.page || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.productClass && params.productClass !== "all") {
    query = query.eq("product_class", params.productClass);
  }
  if (params.category) {
    query = query.ilike("category", `%${params.category}%`);
  }
  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,sku.ilike.%${params.search}%,name_en.ilike.%${params.search}%`
    );
  }

  const { data, count } = await query;
  return {
    products: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

async function getCategories() {
  const { data } = await supabase
    .from("products")
    .select("category")
    .not("category", "is", null);

  const categories = [...new Set(data?.map((d) => d.category).filter(Boolean))];
  return categories.sort();
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    class?: string;
    category?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const [{ products, total, totalPages }, categories] = await Promise.all([
    getProducts({
      search: params.search,
      productClass: params.class,
      category: params.category,
      page,
    }),
    getCategories(),
  ]);

  const classFilters = [
    { value: "all", label: "すべて" },
    { value: "定番", label: "定番" },
    { value: "セミ定番", label: "セミ定番" },
    { value: "未分類", label: "未分類" },
  ];

  const currentClass = params.class || "all";

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品マスタ</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()}件</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        {classFilters.map((f) => (
          <Link
            key={f.value}
            href={buildUrl("/products", { ...params, class: f.value === "all" ? undefined : f.value, page: undefined })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentClass === f.value
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form className="flex gap-3 mb-6">
        <input
          type="text"
          name="search"
          defaultValue={params.search || ""}
          placeholder="商品名・SKUで検索..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        {params.class && <input type="hidden" name="class" value={params.class} />}
        <select
          name="category"
          defaultValue={params.category || ""}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">カテゴリー: すべて</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          検索
        </button>
      </form>

      {products.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">商品名</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">カテゴリー</th>
                <th className="px-4 py-3 font-medium">分類</th>
                <th className="px-4 py-3 font-medium">素材</th>
                <th className="px-4 py-3 font-medium text-right">価格</th>
                <th className="px-4 py-3 font-medium">発売日</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name || p.name_en || "-"}</div>
                    {p.collection_name && (
                      <div className="text-xs text-gray-400">{p.collection_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category || "-"}</td>
                  <td className="px-4 py-3">
                    <ClassBadge value={p.product_class} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.material || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    {p.selling_price
                      ? `\u00a5${Number(p.selling_price).toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.launched_at || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">商品が見つかりませんでした。</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={buildUrl("/products", { ...params, page: String(page - 1) })}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
            >
              前へ
            </Link>
          )}
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildUrl("/products", { ...params, page: String(page + 1) })}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
            >
              次へ
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function ClassBadge({ value }: { value: string }) {
  const config: Record<string, string> = {
    "定番": "bg-blue-50 text-blue-700",
    "セミ定番": "bg-purple-50 text-purple-700",
    "未分類": "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config[value] || "bg-gray-100 text-gray-500"}`}>
      {value}
    </span>
  );
}

function buildUrl(base: string, params: Record<string, string | undefined>) {
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== "1"
  );
  if (filtered.length === 0) return base;
  const qs = filtered.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
  return `${base}?${qs}`;
}

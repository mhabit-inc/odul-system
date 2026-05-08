"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: "□" },
  { href: "/reorder-alerts", label: "リオーダーアラート", icon: "!" },
  { href: "/products", label: "商品マスタ", icon: "◇" },
  { href: "/classifications", label: "商品分類", icon: "▦" },
  { href: "/production", label: "生産管理", icon: "▶" },
  { href: "/inspections", label: "検品管理", icon: "✓" },
  { href: "/openlogi-export", label: "OpenLogi CSV", icon: "↗" },
  { href: "/plans", label: "新作発注計画", icon: "☆" },
  { href: "/order-sheet", label: "発注シート出力", icon: "↓" },
  { href: "/seasons", label: "シーズン管理", icon: "◎" },
  { href: "/inventory", label: "在庫管理", icon: "▤" },
  { href: "/analytics", label: "分析", icon: "◆" },
  { href: "/import", label: "データインポート", icon: "↑" },
  { href: "/schedule", label: "年間スケジュール", icon: "▣" },
  { href: "/events", label: "イベント管理", icon: "★" },
  { href: "/suppliers", label: "仕入先マスタ", icon: "⇄" },
  { href: "/planning-categories", label: "企画分類マスタ", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">ödül</h1>
        <p className="text-xs text-gray-500">MD業務システム</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
        Phase 1 - 商品企画DB
      </div>
    </aside>
  );
}

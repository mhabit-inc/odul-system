"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavGroup = {
  label: string;
  items: { href: string; label: string; icon: string }[];
};

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/", label: "ダッシュボード", icon: "□" },
      { href: "/reorder-alerts", label: "リオーダーアラート", icon: "!" },
    ],
  },
  {
    label: "商品",
    items: [
      { href: "/products", label: "商品マスタ", icon: "◇" },
      { href: "/classifications", label: "商品分類", icon: "▦" },
      { href: "/proposals", label: "企画書", icon: "✎" },
      { href: "/plans", label: "新作発注計画", icon: "☆" },
      { href: "/resale-plans", label: "再販計画", icon: "↻" },
    ],
  },
  {
    label: "生産・在庫",
    items: [
      { href: "/production", label: "生産管理", icon: "▶" },
      { href: "/order-sheet", label: "発注シート出力", icon: "↓" },
      { href: "/inspections", label: "検品管理", icon: "✓" },
      { href: "/inventory", label: "在庫管理", icon: "▤" },
      { href: "/openlogi-export", label: "OpenLogi連携", icon: "↗" },
    ],
  },
  {
    label: "分析",
    items: [
      { href: "/analytics", label: "分析ダッシュボード", icon: "◆" },
      { href: "/import", label: "データインポート", icon: "↑" },
    ],
  },
  {
    label: "スケジュール",
    items: [
      { href: "/seasons", label: "シーズン管理", icon: "◎" },
      { href: "/schedule", label: "年間スケジュール", icon: "▣" },
      { href: "/events", label: "イベント管理", icon: "★" },
    ],
  },
  {
    label: "設定",
    items: [
      { href: "/settings", label: "設定", icon: "⊞" },
      { href: "/suppliers", label: "仕入先マスタ", icon: "⇄" },
      { href: "/planning-categories", label: "企画分類マスタ", icon: "⚙" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleGroup(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">ödül</h1>
        <p className="text-xs text-gray-500">MD業務システム</p>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label || "_top"} className="mb-1">
            {group.label && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
              >
                {group.label}
                <span className="text-[10px]">{collapsed[group.label] ? "+" : "−"}</span>
              </button>
            )}
            {!collapsed[group.label] &&
              group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-sm w-4 text-center">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-200 text-[10px] text-gray-400">
        ödül MD System v1.0
      </div>
    </aside>
  );
}

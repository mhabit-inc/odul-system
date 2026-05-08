"use client";

import { useState, useEffect } from "react";

type Season = {
  id: string;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  shooting_date: string | null;
  shooting_cost: number | null;
  uses_previous_creative: boolean;
};

type Event = {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  sales_coefficient: number;
};

const MONTHS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

const SEASON_COLORS: Record<string, string> = {
  "PRE SS": "bg-yellow-100 border-yellow-300 text-yellow-800",
  SS: "bg-green-100 border-green-300 text-green-800",
  "SS SUMMER": "bg-emerald-100 border-emerald-300 text-emerald-800",
  "アニバーサリー&AW": "bg-orange-100 border-orange-300 text-orange-800",
  "ホリデー": "bg-red-100 border-red-300 text-red-800",
  "福袋": "bg-pink-100 border-pink-300 text-pink-800",
};

export default function SchedulePage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/seasons").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
    ]).then(([s, e]) => {
      setSeasons(s);
      setEvents(e);
      setLoading(false);
    });
  }, []);

  const yearSeasons = seasons.filter((s) => s.year === year);
  const yearEvents = events.filter((e) => {
    const eYear = new Date(e.start_date).getFullYear();
    return eYear === year;
  });

  function getMonthSpan(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.getFullYear() !== year && end.getFullYear() !== year) return null;

    const startMonth = start.getFullYear() === year ? start.getMonth() : 0;
    const endMonth = end.getFullYear() === year ? end.getMonth() : 11;
    return { startMonth, endMonth, span: endMonth - startMonth + 1 };
  }

  function getThursdays(startDate: string, endDate: string): string[] {
    const result: string[] = [];
    const d = new Date(startDate);
    const end = new Date(endDate);
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
    while (d <= end) {
      result.push(d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }));
      d.setDate(d.getDate() + 7);
    }
    return result;
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          年間スケジュール
        </h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">年間スケジュール</h1>
          <p className="text-sm text-gray-500">
            シーズン・撮影・発売・イベントカレンダー
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(year - 1)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            ←
          </button>
          <span className="text-lg font-bold text-gray-900 px-3">{year}年</span>
          <button
            onClick={() => setYear(year + 1)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 border-b bg-gray-50">
          {MONTHS.map((m) => (
            <div
              key={m}
              className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 last:border-r-0"
            >
              {m}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-b">
          <p className="text-xs font-medium text-gray-400 mb-2">シーズン</p>
          {yearSeasons.length === 0 ? (
            <p className="text-xs text-gray-300">登録なし</p>
          ) : (
            <div className="space-y-1">
              {yearSeasons.map((s) => {
                const span = getMonthSpan(s.start_date, s.end_date);
                if (!span) return null;
                const colorClass =
                  SEASON_COLORS[s.name] ||
                  "bg-gray-100 border-gray-300 text-gray-700";
                return (
                  <div key={s.id} className="grid grid-cols-12 gap-0">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-7 relative">
                        {i === span.startMonth && (
                          <div
                            className={`absolute inset-0 rounded border text-xs flex items-center justify-center font-medium ${colorClass}`}
                            style={{
                              width: `${span.span * 100}%`,
                              zIndex: 1,
                            }}
                          >
                            {s.name}
                            {s.shooting_date && " 📷"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-b">
          <p className="text-xs font-medium text-gray-400 mb-2">イベント</p>
          {yearEvents.length === 0 ? (
            <p className="text-xs text-gray-300">登録なし</p>
          ) : (
            <div className="space-y-1">
              {yearEvents.map((ev) => {
                const span = getMonthSpan(ev.start_date, ev.end_date);
                if (!span) return null;
                return (
                  <div key={ev.id} className="grid grid-cols-12 gap-0">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-7 relative">
                        {i === span.startMonth && (
                          <div
                            className="absolute inset-0 rounded border bg-purple-50 border-purple-200 text-purple-700 text-xs flex items-center justify-center font-medium"
                            style={{
                              width: `${span.span * 100}%`,
                              zIndex: 1,
                            }}
                          >
                            {ev.name} ({ev.sales_coefficient}x)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <p className="text-xs font-medium text-gray-400 mb-2">
            撮影スケジュール
          </p>
          {yearSeasons.filter((s) => s.shooting_date).length === 0 ? (
            <p className="text-xs text-gray-300">登録なし</p>
          ) : (
            <div className="space-y-2">
              {yearSeasons
                .filter((s) => s.shooting_date)
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 text-xs w-24">
                      {s.shooting_date}
                    </span>
                    <span className="font-medium text-gray-700">
                      {s.name} 撮影
                    </span>
                    {s.shooting_cost && (
                      <span className="text-xs text-gray-400">
                        ¥{Number(s.shooting_cost).toLocaleString()}
                      </span>
                    )}
                    {s.uses_previous_creative && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        流用
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {yearSeasons.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-400 mb-3">
            木曜発売日一覧
          </p>
          <div className="space-y-2">
            {yearSeasons.map((s) => (
              <div key={s.id} className="flex items-start gap-3 text-sm">
                <span className="font-medium text-gray-700 w-40 shrink-0">
                  {s.name}
                </span>
                <span className="text-gray-500 text-xs leading-relaxed">
                  {getThursdays(s.start_date, s.end_date).join("、 ")}
                  <span className="text-gray-400 ml-2">
                    ({getThursdays(s.start_date, s.end_date).length}回)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

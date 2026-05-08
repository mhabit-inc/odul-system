"use client";

import { useState, useEffect } from "react";

type Template = {
  id: string;
  name: string;
  description: string | null;
  sections: Array<{ key: string; label: string; type: string }>;
  is_default: boolean;
};

type Proposal = {
  id: string;
  title: string;
  template_id: string | null;
  season_id: string | null;
  status: string;
  content: Record<string, string>;
  created_by: string;
  created_at: string;
  updated_at: string;
  proposal_templates: { name: string } | null;
  seasons: { name: string; year: number } | null;
};

type Season = { id: string; name: string; year: number };

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  review: "レビュー中",
  approved: "承認済",
  archived: "アーカイブ",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  review: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  archived: "bg-gray-100 text-gray-400",
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    template_id: "",
    season_id: "",
    content: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/proposals").then((r) => r.json()),
      fetch("/api/proposals?type=templates").then((r) => r.json()),
      fetch("/api/seasons").then((r) => r.json()),
    ]).then(([p, t, s]) => {
      setProposals(Array.isArray(p) ? p : []);
      setTemplates(Array.isArray(t) ? t : []);
      setSeasons(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, []);

  const selectedTemplate = templates.find((t) => t.id === form.template_id);

  function startCreate() {
    const defaultTemplate = templates.find((t) => t.is_default) || templates[0];
    setForm({
      title: "",
      template_id: defaultTemplate?.id || "",
      season_id: "",
      content: {},
    });
    setEditId(null);
    setView("create");
  }

  function startEdit(p: Proposal) {
    setForm({
      title: p.title,
      template_id: p.template_id || "",
      season_id: p.season_id || "",
      content: p.content || {},
    });
    setEditId(p.id);
    setView("edit");
  }

  async function handleSave() {
    setSaving(true);
    if (editId) {
      await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, title: form.title, content: form.content, season_id: form.season_id || null }),
      });
    } else {
      await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    const data = await fetch("/api/proposals").then((r) => r.json());
    setProposals(Array.isArray(data) ? data : []);
    setView("list");
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">企画書</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (view === "create" || view === "edit") {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {view === "edit" ? "企画書を編集" : "新規企画書"}
          </h1>
          <button onClick={() => setView("list")} className="text-sm text-gray-500 hover:text-gray-700">
            ← 一覧に戻る
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="企画タイトル"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">テンプレート</label>
              <select
                value={form.template_id}
                onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                <option value="">選択...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">シーズン</label>
              <select
                value={form.season_id}
                onChange={(e) => setForm({ ...form, season_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                <option value="">選択...</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.year}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedTemplate && (
            <div className="border-t pt-4 space-y-4">
              {selectedTemplate.sections.map((section) => (
                <div key={section.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{section.label}</label>
                  <textarea
                    value={form.content[section.key] || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        content: { ...form.content, [section.key]: e.target.value },
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !form.title}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">企画書</h1>
          <p className="text-sm text-gray-500">{proposals.length}件</p>
        </div>
        <button
          onClick={startCreate}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          + 新規企画書
        </button>
      </div>

      {proposals.length > 0 ? (
        <div className="space-y-3">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => startEdit(p)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{p.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {p.proposal_templates && <span>{p.proposal_templates.name}</span>}
                    {p.seasons && <span>{p.seasons.name} {p.seasons.year}</span>}
                    <span>{new Date(p.updated_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/proposals/${p.id}/pdf`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-100"
                  >
                    PDF
                  </a>
                  <select
                    value={p.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); updateStatus(p.id, e.target.value); }}
                    className={`px-2 py-1 rounded text-xs font-medium border-0 ${STATUS_COLORS[p.status] || ""}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">企画書がありません</p>
          <p className="text-sm text-gray-400 mt-1">テンプレートから新しい企画書を作成しましょう</p>
        </div>
      )}
    </div>
  );
}

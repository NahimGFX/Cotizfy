import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import type { SupplierRecord } from "../../electron/preload/types";
import { api } from "../services/api";

export const SuppliersPage: React.FC = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [editing, setEditing] = useState<SupplierRecord | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const r = await api.getSuppliers();
    if (r.success && r.data) setSuppliers(r.data);
  };
  useEffect(() => {
    void load();
  }, []);
  const reset = () => {
    setEditing(null);
    setName("");
    setContact("");
    setEmail("");
    setPhone("");
    setError("");
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api.saveSupplier({
      id: editing?.id,
      name,
      contact,
      email,
      phone,
    });
    if (!r.success) {
      setError(r.error || t("common.error"));
      return;
    }
    reset();
    await load();
  };
  const edit = (s: SupplierRecord) => {
    setEditing(s);
    setName(s.name);
    setContact(s.contact || "");
    setEmail(s.email || "");
    setPhone(s.phone || "");
  };
  const remove = async (s: SupplierRecord) => {
    if (window.confirm(t("suppliers.deleteConfirm", { name: s.name }))) {
      const r = await api.deleteSupplier(s.id);
      if (!r.success) setError(r.error || t("common.error"));
      await load();
    }
  };
  const input =
    "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8 text-slate-900 dark:text-slate-100">
      <div>
        <h2 className="text-2xl font-bold">{t("suppliers.title")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("suppliers.subtitle")}</p>
      </div>
      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:grid-cols-5"
      >
        <input
          className={input}
          required
          minLength={2}
          placeholder={t("suppliers.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={input}
          placeholder={t("suppliers.contact")}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <input
          className={input}
          type="email"
          placeholder={t("suppliers.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={input}
          placeholder={t("suppliers.phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            {editing ? t("common.save") : t("suppliers.add")}
          </button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border px-3 dark:border-slate-700"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600 md:col-span-5">{error}</p>}
      </form>
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {suppliers.length ? (
          suppliers.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {[s.contact, s.email, s.phone]
                      .filter(Boolean)
                      .join(" · ") || "—"}{" "}
                    ·{" "}
                    {s.projects.map((p) => p.name).join(", ") ||
                      t("suppliers.noProjects")}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  aria-label={t("common.edit")}
                  onClick={() => edit(s)}
                  className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label={t("common.delete")}
                  onClick={() => void remove(s)}
                  className="rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-slate-500">
            {t("suppliers.empty")}
          </p>
        )}
      </div>
    </div>
  );
};

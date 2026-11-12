import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import type { SupplierRecord } from "../../electron/preload/types";
import { api } from "../services/api";
import { PageHeader } from "../components/common/PageHeader";

export const SuppliersPage: React.FC = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [editing, setEditing] = useState<SupplierRecord | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const result = await api.getSuppliers();
    if (result.success && result.data) setSuppliers(result.data);
    else setError(result.error || t("common.error"));
    setLoading(false);
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
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await api.saveSupplier({
        id: editing?.id,
        name,
        contact,
        email,
        phone,
      });
      if (!result.success) {
        setError(result.error || t("common.error"));
        return;
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };
  const edit = (supplier: SupplierRecord) => {
    setEditing(supplier);
    setName(supplier.name);
    setContact(supplier.contact || "");
    setEmail(supplier.email || "");
    setPhone(supplier.phone || "");
    setError("");
  };
  const remove = async (supplier: SupplierRecord) => {
    if (!window.confirm(t("suppliers.deleteConfirm", { name: supplier.name })))
      return;
    const result = await api.deleteSupplier(supplier.id);
    if (!result.success) setError(result.error || t("common.error"));
    await load();
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    [
      supplier.name,
      supplier.contact,
      supplier.email,
      supplier.phone,
      ...supplier.projects.map((project) => project.name),
    ]
      .filter(Boolean)
      .some((value) =>
        value!.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()),
      ),
  );
  const input = "control w-full px-3 py-2.5 text-sm";

  return (
    <div className="page-content space-y-6 text-slate-900 dark:text-slate-100">
      <PageHeader
        title={t("suppliers.title")}
        description={t("suppliers.subtitle")}
        action={
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {suppliers.length} {t("common.suppliers")}
          </span>
        }
      />

      <form
        onSubmit={save}
        className="surface-card grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5"
      >
        <label className="block text-xs font-medium text-slate-500">
          <span>{t("suppliers.name")}</span>
          <input
            className={`${input} mt-1.5`}
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-500">
          <span>{t("suppliers.contact")}</span>
          <input
            className={`${input} mt-1.5`}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-500">
          <span>{t("suppliers.email")}</span>
          <input
            className={`${input} mt-1.5`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-500">
          <span>{t("suppliers.phone")}</span>
          <input
            className={`${input} mt-1.5`}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            disabled={saving}
            className="action-primary min-h-10 flex-1 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving
              ? t("common.loading")
              : editing
                ? t("common.save")
                : t("suppliers.add")}
          </button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 md:col-span-full">
            {error}
          </p>
        )}
      </form>

      <section
        className="surface-card overflow-hidden"
        aria-label={t("suppliers.title")}
      >
        <div className="border-b border-slate-200 p-3 dark:border-slate-800">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label={t("suppliers.searchPlaceholder", {
                defaultValue: "Search suppliers and projects...",
              })}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("suppliers.searchPlaceholder", {
                defaultValue: "Search suppliers and projects...",
              })}
              className="control w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>
        {loading ? (
          <p role="status" className="p-10 text-center text-sm text-slate-500">
            {t("common.loading")}
          </p>
        ) : filteredSuppliers.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSuppliers.map((supplier) => (
              <article
                key={supplier.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{supplier.name}</p>
                    <p
                      className="mt-1 max-w-3xl truncate text-xs text-slate-500"
                      title={[supplier.contact, supplier.email, supplier.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      {[supplier.contact, supplier.email, supplier.phone]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    <p
                      className="mt-1 truncate text-xs text-slate-400"
                      title={supplier.projects
                        .map((project) => project.name)
                        .join(", ")}
                    >
                      {supplier.projects
                        .map((project) => project.name)
                        .join(" · ") || t("suppliers.noProjects")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`${t("common.edit")}: ${supplier.name}`}
                    onClick={() => edit(supplier)}
                    className="icon-button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${t("common.delete")}: ${supplier.name}`}
                    onClick={() => void remove(supplier)}
                    className="icon-button text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-10 text-center text-sm text-slate-500">
            {suppliers.length
              ? t("suppliers.noSearchResults", {
                  defaultValue: "No suppliers match your search.",
                })
              : t("suppliers.empty")}
          </p>
        )}
      </section>
    </div>
  );
};

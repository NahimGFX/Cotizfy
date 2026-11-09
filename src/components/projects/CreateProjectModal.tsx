import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { X, FolderPlus, Plus } from "lucide-react";
import { api, createNewProject } from "../../services/api";
import type { SupplierRecord } from "../../../electron/preload/types";
import type { ProjectSummary } from "../../../electron/preload/types";

const projectSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  client: z.string().optional(),
  currency: z.string().min(1, "La moneda es requerida"),
  description: z.string().optional(),
});

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProject?: ProjectSummary | null;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProject = null,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [supplierError, setSupplierError] = useState("");

  useEffect(() => {
    if (isOpen)
      void api.getSuppliers().then((r) => {
        if (r.success && r.data) setSuppliers(r.data);
      });
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    setName(editingProject?.name || "");
    setClient(editingProject?.client || "");
    setCurrency(editingProject?.currency || "USD");
    setDescription(editingProject?.description || "");
    setSupplierError("");
    if (editingProject)
      void api.getProjectSuppliers(editingProject.id).then((r) => {
        if (r.success && r.data) setSupplierIds(r.data.map((s) => s.id));
      });
    else setSupplierIds([]);
  }, [isOpen, editingProject]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate using Zod
    const validation = projectSchema.safeParse({
      name,
      client,
      currency,
      description,
    });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Datos inválidos");
      return;
    }

    setLoading(true);
    const result = editingProject
      ? await api.updateProject(editingProject.id, {
          ...validation.data,
          supplierIds,
        })
      : await createNewProject({ ...validation.data, supplierIds });
    setLoading(false);

    if (result.success) {
      setName("");
      setClient("");
      setDescription("");
      setSupplierIds([]);
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Error al crear el proyecto");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">
              {editingProject
                ? t("projects.editModalTitle")
                : t("projects.createModal.title")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("projects.createModal.nameLabel")} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("projects.createModal.namePlaceholder")}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("projects.createModal.clientLabel")}
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder={t("projects.createModal.clientPlaceholder")}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("projects.createModal.currencyLabel")}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white dark:bg-slate-800"
              >
                <option value="USD">USD ($)</option>
                <option value="PEN">PEN (S/)</option>
                <option value="EUR">EUR (€)</option>
                <option value="MXN">MXN ($)</option>
                <option value="COP">COP ($)</option>
                <option value="CLP">CLP ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("suppliers.title")}
            </label>
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              {suppliers.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={supplierIds.includes(s.id)}
                    onChange={(e) =>
                      setSupplierIds((ids) =>
                        e.target.checked
                          ? [...ids, s.id]
                          : ids.filter((id) => id !== s.id),
                      )
                    }
                  />
                  {s.name}
                </label>
              ))}
              {!suppliers.length && (
                <p className="px-2 py-1 text-xs text-slate-500">
                  {t("suppliers.empty")}
                </p>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder={t("suppliers.newInline")}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-sm"
                onClick={async () => {
                  const r = await api.saveSupplier({ name: newSupplierName });
                  if (!r.success || !r.data) {
                    setSupplierError(r.error || t("common.error"));
                    return;
                  }
                  const all = await api.getSuppliers();
                  if (all.success && all.data) setSuppliers(all.data);
                  setSupplierIds((ids) => [...ids, r.data!.id]);
                  setNewSupplierName("");
                  setSupplierError("");
                }}
              >
                <Plus className="h-4 w-4" />
                {t("suppliers.add")}
              </button>
            </div>
            {supplierError && (
              <p className="mt-1 text-xs text-red-600">{supplierError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("projects.createModal.descriptionLabel")}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("projects.createModal.descriptionPlaceholder")}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t("projects.createModal.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {loading
                ? t("common.loading")
                : editingProject
                  ? t("common.save")
                  : t("projects.createModal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, FileSpreadsheet, Plus, Upload, X } from "lucide-react";
import type {
  ExcelSelection,
  ProjectSummary,
  SupplierRecord,
} from "../../../electron/preload/types";
import { api } from "../../services/api";

interface Props {
  project: ProjectSummary;
  onManageSuppliers: () => void;
  onImported: () => void;
}

export const ExcelImportPanel: React.FC<Props> = ({
  project,
  onManageSuppliers,
  onImported,
}) => {
  const { t, i18n } = useTranslation();
  const [selection, setSelection] = useState<ExcelSelection | null>(null);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<SupplierRecord[]>([]);
  const [supplierToAdd, setSupplierToAdd] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const card =
    "rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100";
  useEffect(() => {
    setSelection(null);
    setSupplierIds([]);
    setError("");
    setDone(false);
  }, [project.id]);
  const chooseFile = async () => {
    setBusy(true);
    setError("");
    try {
      const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "es";
      const [result, catalogResult] = await Promise.all([
        api.selectExcelMatrix(project.id, language),
        api.getSuppliers(),
      ]);
      if (!result.success) {
        setError(result.error || t("excel.readError"));
        return;
      }
      if (!result.data) return;
      setSelection(result.data);
      setSupplierIds(
        result.data.preview.groups.map(
          (_, index) => result.data!.suppliers[index]?.id || "",
        ),
      );
      setCatalog(
        catalogResult.success && catalogResult.data ? catalogResult.data : [],
      );
      if (!catalogResult.success)
        setError(catalogResult.error || t("excel.suppliersError"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("excel.readError"));
    } finally {
      setBusy(false);
    }
  };
  const appendSupplier = (supplier: { id: string; name: string }) => {
    setSelection((current) =>
      current
        ? { ...current, suppliers: [...current.suppliers, supplier] }
        : current,
    );
    setSupplierIds((current) => {
      const next = [...current];
      const empty = next.findIndex((id) => !id);
      if (empty >= 0) next[empty] = supplier.id;
      return next;
    });
  };
  const associateExisting = async () => {
    if (!selection || !supplierToAdd) return;
    setBusy(true);
    setError("");
    const result = await api.addSupplierToProject(project.id, supplierToAdd);
    setBusy(false);
    if (!result.success) {
      setError(result.error || t("excel.supplierAssociateError"));
      return;
    }
    const supplier = catalog.find((row) => row.id === supplierToAdd);
    if (supplier) appendSupplier({ id: supplier.id, name: supplier.name });
    setSupplierToAdd("");
  };
  const createSupplier = async () => {
    if (!selection || newSupplierName.trim().length < 2) return;
    setBusy(true);
    setError("");
    const result = await api.createSupplierForProject(
      project.id,
      newSupplierName,
    );
    setBusy(false);
    if (!result.success || !result.data) {
      setError(result.error || t("excel.supplierCreateError"));
      return;
    }
    appendSupplier(result.data);
    setCatalog((current) => [
      ...current,
      {
        id: result.data!.id,
        name: result.data!.name,
        contact: null,
        email: null,
        phone: null,
        color: null,
        projects: [{ id: project.id, name: project.name }],
      },
    ]);
    setNewSupplierName("");
  };
  const confirm = async () => {
    if (
      !selection ||
      selection.preview.groups.length === 0 ||
      supplierIds.length !== selection.preview.groups.length ||
      supplierIds.some((id) => !id) ||
      new Set(supplierIds).size !== supplierIds.length
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await api.importExcelMatrix(
        project.id,
        selection.preview.rows,
        supplierIds,
      );
      if (!result.success) {
        setError(result.error || t("excel.importError"));
        return;
      }
      setDone(true);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("excel.importError"));
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    setSelection(null);
    setError("");
    setDone(false);
  };
  const updateAssignment = (groupIndex: number, supplierId: string) =>
    setSupplierIds((current) =>
      current.map((id, index) => (index === groupIndex ? supplierId : id)),
    );
  const missingAssignments =
    supplierIds.length !== (selection?.preview.groups.length || 0) ||
    supplierIds.some((id) => !id) ||
    new Set(supplierIds).size !== supplierIds.length;
  const unassociated = selection
    ? catalog.filter(
        (supplier) =>
          !selection.suppliers.some(
            (associated) => associated.id === supplier.id,
          ),
      )
    : [];

  return (
    <section className={`${card} space-y-4 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{t("excel.title")}</h3>
          <p className="text-sm text-slate-500">{project.name}</p>
        </div>
        <button
          type="button"
          onClick={() => void chooseFile()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {busy ? t("common.loading") : t("excel.choose")}
        </button>
      </div>
      {error && !selection && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {done && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {t("excel.success")}
        </p>
      )}
      {selection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
          <div
            className={`${card} flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden shadow-2xl`}
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold">{t("excel.preview")}</h3>
                <p className="text-sm text-slate-500">
                  {selection.fileName} ·{" "}
                  {t("excel.rowsDetected", {
                    count: selection.preview.rows.length,
                  })}{" "}
                  ·{" "}
                  {t("excel.groupsDetected", {
                    count: selection.preview.groups.length,
                  })}
                </p>
              </div>
              <button
                onClick={close}
                aria-label={t("common.close")}
                className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-auto p-5">
              {selection.preview.groups.length > 0 && (
                <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div>
                    <h4 className="font-semibold">{t("excel.assignGroups")}</h4>
                    <p className="text-xs text-slate-500">
                      {t("excel.uniqueSupplierPerGroup")}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selection.preview.groups.map((group, index) => (
                      <label key={group} className="text-sm font-medium">
                        {t("excel.groupSupplier", { group })}
                        <select
                          required
                          value={supplierIds[index] || ""}
                          onChange={(event) =>
                            updateAssignment(index, event.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="">{t("excel.selectSupplier")}</option>
                          {selection.suppliers
                            .filter(
                              (supplier) =>
                                !supplierIds.some(
                                  (id, otherIndex) =>
                                    otherIndex !== index && id === supplier.id,
                                ),
                            )
                            .map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {unassociated.length > 0 && (
                    <div className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                      <label className="min-w-56 flex-1 text-xs text-slate-500">
                        {t("excel.associateExisting")}
                        <select
                          value={supplierToAdd}
                          onChange={(event) =>
                            setSupplierToAdd(event.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="">{t("excel.selectSupplier")}</option>
                          {unassociated.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={!supplierToAdd || busy}
                        onClick={() => void associateExisting()}
                        className="rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 disabled:opacity-40 dark:border-teal-800 dark:text-teal-300"
                      >
                        <Plus className="mr-1 inline h-4 w-4" />
                        {t("excel.associate")}
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-56 flex-1 text-xs text-slate-500">
                      {t("excel.createSupplier")}
                      <input
                        value={newSupplierName}
                        onChange={(event) =>
                          setNewSupplierName(event.target.value)
                        }
                        maxLength={200}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                        placeholder={t("excel.newSupplierName")}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={newSupplierName.trim().length < 2 || busy}
                      onClick={() => void createSupplier()}
                      className="rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 disabled:opacity-40 dark:border-teal-800 dark:text-teal-300"
                    >
                      <Plus className="mr-1 inline h-4 w-4" />
                      {t("excel.createAndAssociate")}
                    </button>
                    <button
                      type="button"
                      onClick={onManageSuppliers}
                      className="px-2 py-2 text-xs text-slate-500 underline"
                    >
                      {t("excel.manageSuppliers")}
                    </button>
                  </div>
                  {missingAssignments && (
                    <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      {t("excel.assignAllGroups")}
                    </p>
                  )}
                </section>
              )}
              {selection.preview.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  <h4 className="mb-1 font-semibold">
                    {t("excel.errors", {
                      count: selection.preview.errors.length,
                    })}
                  </h4>
                  <ul className="list-inside list-disc">
                    {selection.preview.errors.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selection.preview.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <h4 className="mb-1 font-semibold">
                    {t("excel.warnings", {
                      count: selection.preview.warnings.length,
                    })}
                  </h4>
                  <ul className="max-h-28 list-inside list-disc overflow-auto">
                    {selection.preview.warnings.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-max border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th rowSpan={2} className="p-2">
                        ITEM
                      </th>
                      <th rowSpan={2} className="min-w-40 p-2">
                        {t("excel.description")}
                      </th>
                      <th rowSpan={2} className="p-2">
                        {t("excel.quantity")}
                      </th>
                      <th rowSpan={2} className="p-2">
                        {t("excel.unit")}
                      </th>
                      {selection.preview.groups.map((group, index) => (
                        <th
                          key={group}
                          colSpan={2}
                          className="border-l border-slate-300 p-2 text-center dark:border-slate-600"
                        >
                          {selection.suppliers.find(
                            (supplier) => supplier.id === supplierIds[index],
                          )?.name || t("excel.groupSupplier", { group })}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {selection.preview.groups.flatMap((group) => [
                        <th key={`${group}-unit`} className="border-l p-2">
                          {t("excel.unitPrice")}
                        </th>,
                        <th key={`${group}-total`} className="p-2">
                          {t("excel.totalPrice")}
                        </th>,
                      ])}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selection.preview.rows.map((row, index) => (
                      <tr key={`${row.rowNumber}-${index}`}>
                        <td className="p-2">{row.itemNumber}</td>
                        <td
                          className="max-w-xs truncate p-2"
                          title={row.description}
                        >
                          {row.description}
                        </td>
                        <td className="p-2">{row.quantity}</td>
                        <td className="p-2">{row.unit}</td>
                        {row.quotes.flatMap((quote, groupIndex) => [
                          <td
                            key={`${groupIndex}-unit`}
                            className="border-l p-2"
                          >
                            {quote.unitPrice ?? "—"}
                          </td>,
                          <td key={`${groupIndex}-total`} className="p-2">
                            {quote.totalPrice ?? "—"}
                          </td>,
                        ])}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
                >
                  {error}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs text-slate-500">{t("excel.confirmHint")}</p>
              <div className="flex gap-2">
                <button
                  onClick={close}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  disabled={
                    busy ||
                    selection.preview.errors.length > 0 ||
                    selection.preview.groups.length === 0 ||
                    missingAssignments
                  }
                  onClick={() => void confirm()}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Upload className="h-4 w-4" />
                  {busy ? t("common.loading") : t("excel.confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

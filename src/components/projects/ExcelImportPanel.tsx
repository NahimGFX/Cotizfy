import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FileSpreadsheet, Upload, X } from 'lucide-react';
import type { ExcelSelection, ProjectSummary } from '../../../electron/preload/types';
import { api } from '../../services/api';

interface Props { project: ProjectSummary; onManageSuppliers: () => void; onImported: () => void }

export const ExcelImportPanel: React.FC<Props> = ({ project, onManageSuppliers, onImported }) => {
  const { t, i18n } = useTranslation();
  const [selection, setSelection] = useState<ExcelSelection | null>(null);
  const [supplierIds, setSupplierIds] = useState<[string, string]>(['', '']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const card = 'rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100';
  useEffect(() => { setSelection(null); setError(''); setDone(false); }, [project.id, project.suppliersCount, project.supplierNames.join('|')]);
  const chooseFile = async () => {
    setBusy(true); setError('');
    const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
    const result = await api.selectExcelMatrix(project.id, language);
    setBusy(false);
    if (!result.success) { setError(result.error || t('excel.readError')); return; }
    if (!result.data) return;
    setSelection(result.data);
    setSupplierIds([result.data.suppliers[0]?.id || '', result.data.suppliers[1]?.id || '']);
  };
  const confirm = async () => {
    if (!selection || !supplierIds[0] || !supplierIds[1] || supplierIds[0] === supplierIds[1]) return;
    setBusy(true); setError('');
    const result = await api.importExcelMatrix(project.id, selection.preview.rows, supplierIds);
    setBusy(false);
    if (!result.success) { setError(result.error || t('excel.importError')); return; }
    setDone(true); onImported();
  };
  const close = () => { setSelection(null); setError(''); setDone(false); };
  return <section className={`${card} space-y-4 p-5`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{t('excel.title')}</h3><p className="text-sm text-slate-500">{project.name}</p></div><button type="button" onClick={()=>void chooseFile()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"><FileSpreadsheet className="h-4 w-4"/>{busy ? t('common.loading') : t('excel.choose')}</button></div>
    {project.suppliersCount < 2 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>{t('excel.needSuppliers', { count: project.suppliersCount })}</span><button onClick={onManageSuppliers} className="font-semibold underline">{t('excel.manageSuppliers')}</button></div>}
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
    {done && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{t('excel.success')}</p>}
    {selection && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className={`${card} flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800"><div><h3 className="text-lg font-bold">{t('excel.preview')}</h3><p className="text-sm text-slate-500">{selection.fileName} · {t('excel.rowsDetected', { count: selection.preview.rows.length })}</p></div><button onClick={close} aria-label={t('common.close')} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5"/></button></div>
        <div className="flex-1 space-y-4 overflow-auto p-5">
          {selection.suppliers.length < 2 && <div className="flex items-center justify-between gap-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><span>{t('excel.needSuppliers', { count: selection.suppliers.length })}</span><button onClick={onManageSuppliers} className="font-semibold underline">{t('excel.manageSuppliers')}</button></div>}
          {selection.suppliers.length >= 2 && <div className="grid gap-3 sm:grid-cols-2">{([0,1] as const).map(group=><label key={group} className="text-sm font-medium">{t('excel.groupSupplier', { group: group + 1 })}<select value={supplierIds[group]} onChange={e=>setSupplierIds(ids=>group === 0 ? [e.target.value, ids[1]] : [ids[0], e.target.value])} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"><option value="">{t('excel.selectSupplier')}</option>{selection.suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>)}</div>}
          {selection.preview.errors.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><h4 className="mb-1 font-semibold">{t('excel.errors', { count: selection.preview.errors.length })}</h4><ul className="list-inside list-disc">{selection.preview.errors.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
          {selection.preview.warnings.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><h4 className="mb-1 font-semibold">{t('excel.warnings', { count: selection.preview.warnings.length })}</h4><ul className="max-h-24 list-inside list-disc overflow-auto">{selection.preview.warnings.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
          <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[900px] border-collapse text-left text-xs"><thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr><th className="p-2">ITEM</th><th className="p-2">{t('excel.description')}</th><th className="p-2">{t('excel.quantity')}</th><th className="p-2">{t('excel.unit')}</th><th className="p-2">{t('excel.unitPrice')} 1</th><th className="p-2">{t('excel.totalPrice')} 1</th><th className="p-2">{t('excel.unitPrice')} 2</th><th className="p-2">{t('excel.totalPrice')} 2</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{selection.preview.rows.map((row,i)=><tr key={`${row.rowNumber}-${i}`}><td className="p-2">{row.itemNumber}</td><td className="max-w-xs truncate p-2" title={row.description}>{row.description}</td><td className="p-2">{row.quantity}</td><td className="p-2">{row.unit}</td>{row.quotes.map((quote,g)=><React.Fragment key={g}><td className="p-2">{quote.unitPrice ?? '—'}</td><td className="p-2">{quote.totalPrice ?? '—'}</td></React.Fragment>)}</tr>)}</tbody></table></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-800"><p className="text-xs text-slate-500">{t('excel.confirmHint')}</p><div className="flex gap-2"><button onClick={close} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">{t('common.cancel')}</button><button disabled={busy || selection.preview.errors.length > 0 || selection.suppliers.length < 2 || !supplierIds[0] || !supplierIds[1] || supplierIds[0] === supplierIds[1]} onClick={()=>void confirm()} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><Upload className="h-4 w-4"/>{busy ? t('common.loading') : t('excel.confirm')}</button></div></div>
      </div>
    </div>}
  </section>;
};

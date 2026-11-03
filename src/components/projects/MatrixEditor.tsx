import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Tags, X } from 'lucide-react';
import type { ProjectBudgetItem, SupplierRecord } from '../../../electron/preload/types';
import { api } from '../../services/api';

interface Props { projectId: string; items: ProjectBudgetItem[]; suppliers: SupplierRecord[]; onChanged: () => void }
type ItemDraft = { itemNumber: string; description: string; quantity: string; unit: string };
type QuoteDraft = { supplierId: string; unitPrice: string; totalPrice: string; original: boolean };
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const buttonClass = 'inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';

export const MatrixEditor: React.FC<Props> = ({ projectId, items, suppliers, onChanged }) => {
  const { t } = useTranslation();
  const [itemTarget, setItemTarget] = useState<ProjectBudgetItem | null | 'new'>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>({ itemNumber: '', description: '', quantity: '1', unit: '' });
  const [quoteTarget, setQuoteTarget] = useState<ProjectBudgetItem | null>(null);
  const [quoteDrafts, setQuoteDrafts] = useState<QuoteDraft[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setItemTarget(null); setQuoteTarget(null); setError(''); };
  const openItem = (item: ProjectBudgetItem | null) => { setError(''); setItemTarget(item || 'new'); setItemDraft(item ? { itemNumber: item.itemNumber, description: item.description, quantity: String(item.quantity), unit: item.unit } : { itemNumber: '', description: '', quantity: '1', unit: '' }); };
  const openQuotes = (item: ProjectBudgetItem) => {
    setError(''); setQuoteTarget(item);
    setQuoteDrafts(suppliers.map(supplier => { const quote = item.quotes.find(row => row.supplierId === supplier.id); const missing = quote?.notes || ''; return { supplierId: supplier.id, unitPrice: quote && !missing.toLowerCase().includes('unit price') ? String(quote.unitPrice) : '', totalPrice: quote && !missing.toLowerCase().includes('total price') ? String(quote.totalPrice) : '', original: Boolean(quote) }; }));
  };
  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const quantity = Number(itemDraft.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) { setError(t('matrix.invalidQuantity')); return; }
    setBusy(true);
    const payload = { ...itemDraft, quantity };
    const response = itemTarget === 'new' ? await api.createBudgetItem(projectId, payload) : itemTarget ? await api.updateBudgetItem(projectId, itemTarget.id, payload) : null;
    setBusy(false);
    if (!response?.success) { setError(response?.error || t('common.error')); return; }
    close(); onChanged();
  };
  const saveQuotes = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); if (!quoteTarget) return;
    const changed = quoteDrafts.filter(row => row.unitPrice !== '' || row.totalPrice !== '');
    if (changed.some(row => [row.unitPrice, row.totalPrice].filter(v => v !== '').some(v => !Number.isFinite(Number(v)) || Number(v) < 0))) { setError(t('matrix.invalidPrice')); return; }
    const hasMismatch = changed.some(row => row.unitPrice !== '' && row.totalPrice !== '' && Math.abs(Number(row.totalPrice) - quoteTarget.quantity * Number(row.unitPrice)) > Math.max(0.01, Math.abs(Number(row.totalPrice)) * 0.001));
    if (hasMismatch && !window.confirm(t('matrix.totalMismatchConfirm'))) return;
    setBusy(true);
    for (const row of changed) {
      const result = await api.saveItemQuote(projectId, quoteTarget.id, row.supplierId, { unitPrice: row.unitPrice === '' ? null : Number(row.unitPrice), totalPrice: row.totalPrice === '' ? null : Number(row.totalPrice) });
      if (!result.success) { setBusy(false); setError(result.error || t('common.error')); return; }
      if (result.data?.warning) window.alert(t('matrix.totalMismatchWarning', { supplier: suppliers.find(s => s.id === row.supplierId)?.name || '' }));
    }
    for (const row of quoteDrafts.filter(row => row.original && !row.unitPrice && !row.totalPrice)) {
      if (!window.confirm(t('matrix.deleteQuoteConfirm', { supplier: suppliers.find(s => s.id === row.supplierId)?.name || '' }))) continue;
      const result = await api.deleteItemQuote(projectId, quoteTarget.id, row.supplierId);
      if (!result.success) { setBusy(false); setError(result.error || t('common.error')); return; }
    }
    setBusy(false); close(); onChanged();
  };
  const removeItem = async (item: ProjectBudgetItem) => {
    if (!window.confirm(t('matrix.deleteItemConfirm', { item: item.itemNumber }))) return;
    const result = await api.deleteBudgetItem(projectId, item.id);
    if (!result.success) { setError(result.error || t('common.error')); return; }
    onChanged();
  };

  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div><h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('matrix.title')}</h3><p className="text-xs text-slate-500">{t('matrix.subtitle')}</p></div><button type="button" onClick={() => openItem(null)} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="h-4 w-4"/>{t('matrix.addItem')}</button></div>
    {error && !itemTarget && !quoteTarget && <div role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    <div className="overflow-auto"><table className="w-full min-w-[1000px] border-collapse text-left text-xs text-slate-700 dark:text-slate-200"><thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3">ITEM</th><th className="p-3">{t('excel.description')}</th><th className="p-3">{t('excel.quantity')}</th><th className="p-3">{t('excel.unit')}</th><th className="p-3">{t('matrix.quotes')}</th><th className="p-3">{t('projects.table.actions')}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{items.map(item => <tr key={item.id}><td className="p-3 font-medium">{item.itemNumber}</td><td className="p-3">{item.description}</td><td className="p-3">{item.quantity}</td><td className="p-3">{item.unit}</td><td className="p-3"><button type="button" className={buttonClass} onClick={() => openQuotes(item)}><Tags className="h-3.5 w-3.5"/>{t('matrix.manageQuotes')} ({item.quotes.length})</button></td><td className="p-3"><div className="flex gap-1"><button type="button" className={buttonClass} onClick={() => openItem(item)} title={t('common.edit')}><Pencil className="h-3.5 w-3.5"/>{t('common.edit')}</button><button type="button" className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => void removeItem(item)}><Trash2 className="h-3.5 w-3.5"/>{t('common.delete')}</button></div></td></tr>)}</tbody></table></div>

    {(itemTarget !== null || quoteTarget !== null) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={event => { if(event.target === event.currentTarget) close(); }}><section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{quoteTarget ? t('matrix.manageQuotes') : itemTarget === 'new' ? t('matrix.addItem') : t('matrix.editItem')}</h3><button type="button" onClick={close} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t('common.close')}><X className="h-5 w-5"/></button></div>{error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {quoteTarget ? <form onSubmit={event => void saveQuotes(event)}><p className="mb-4 text-sm text-slate-500">{quoteTarget.itemNumber} · {quoteTarget.description}</p><div className="space-y-3">{quoteDrafts.map((row,index) => <div key={row.supplierId} className="grid items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-[1fr_1fr_1fr_auto]"><strong className="truncate text-sm">{suppliers.find(s=>s.id===row.supplierId)?.name}</strong><label className="text-xs text-slate-500">{t('excel.unitPrice')}<input aria-label={`${t('excel.unitPrice')} ${suppliers[index]?.name}`} type="number" step="any" min="0" value={row.unitPrice} onChange={e=>setQuoteDrafts(current=>current.map((entry,i)=>i===index?{...entry,unitPrice:e.target.value}:entry))} className={inputClass}/></label><label className="text-xs text-slate-500">{t('excel.totalPrice')}<input aria-label={`${t('excel.totalPrice')} ${suppliers[index]?.name}`} type="number" step="any" min="0" value={row.totalPrice} onChange={e=>setQuoteDrafts(current=>current.map((entry,i)=>i===index?{...entry,totalPrice:e.target.value}:entry))} className={inputClass}/></label>{row.original && <button type="button" className="text-xs text-red-600 hover:underline" onClick={()=>setQuoteDrafts(current=>current.map((entry,i)=>i===index?{...entry,unitPrice:'',totalPrice:''}:entry))}>{t('common.delete')}</button>}</div>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={close} className={buttonClass}>{t('common.cancel')}</button><button disabled={busy} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?t('common.loading'):t('common.save')}</button></div></form> : <form onSubmit={event => void saveItem(event)} className="space-y-3">{(['itemNumber','description','quantity','unit'] as const).map(field=><label key={field} className="block text-sm text-slate-600 dark:text-slate-300">{t(`matrix.${field}`)}<input required type={field==='quantity'?'number':'text'} min={field==='quantity'?0:undefined} step={field==='quantity'?'any':undefined} value={itemDraft[field]} onChange={event=>setItemDraft(current=>({...current,[field]:event.target.value}))} className={inputClass}/></label>)}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={close} className={buttonClass}>{t('common.cancel')}</button><button disabled={busy} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?t('common.loading'):t('common.save')}</button></div></form>}</section></div>}
  </>;
};

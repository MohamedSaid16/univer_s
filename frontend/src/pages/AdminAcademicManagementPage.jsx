import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Layers, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const inputClass = 'w-full rounded-xl border border-edge bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

function hasAdminAccess(roles) {
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => String(r || '').toLowerCase() === 'admin');
}

export default function AdminAcademicManagementPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const canAccess = useMemo(() => hasAdminAccess(user?.roles), [user?.roles]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({ specialite: false, promo: false, module: false });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [options, setOptions] = useState({ specialites: [], promos: [], modules: [] });
  const [specialiteForm, setSpecialiteForm] = useState({ nom: '', niveau: '' });
  const [promoForm, setPromoForm] = useState({ nom: '', section: '', anneeUniversitaire: '', specialiteId: '' });
  const [moduleForm, setModuleForm] = useState({ nom: '', code: '', semestre: '', specialiteId: '' });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.adminGetAcademicOptions();
      const data = response?.data || {};
      setOptions({
        specialites: Array.isArray(data.specialites) ? data.specialites : [],
        promos: Array.isArray(data.promos) ? data.promos : [],
        modules: Array.isArray(data.modules) ? data.modules : [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load academic data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    loadData();
  }, [canAccess]);

  const createSpecialite = async () => {
    setSaving((prev) => ({ ...prev, specialite: true }));
    setError('');
    setMessage('');
    try {
      await authAPI.adminCreateSpecialite({
        nom: specialiteForm.nom.trim(),
        niveau: specialiteForm.niveau || undefined,
      });
      setSpecialiteForm({ nom: '', niveau: '' });
      setMessage('Specialite created successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create specialite.');
    } finally {
      setSaving((prev) => ({ ...prev, specialite: false }));
    }
  };

  const createPromo = async () => {
    setSaving((prev) => ({ ...prev, promo: true }));
    setError('');
    setMessage('');
    try {
      await authAPI.adminCreatePromo({
        nom: promoForm.nom.trim() || undefined,
        section: promoForm.section.trim() || undefined,
        anneeUniversitaire: promoForm.anneeUniversitaire.trim() || undefined,
        specialiteId: Number(promoForm.specialiteId),
      });
      setPromoForm({ nom: '', section: '', anneeUniversitaire: '', specialiteId: '' });
      setMessage('Promo/section created successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create promo/section.');
    } finally {
      setSaving((prev) => ({ ...prev, promo: false }));
    }
  };

  const createModule = async () => {
    setSaving((prev) => ({ ...prev, module: true }));
    setError('');
    setMessage('');
    try {
      await authAPI.adminCreateModule({
        nom: moduleForm.nom.trim(),
        code: moduleForm.code.trim().toUpperCase(),
        semestre: moduleForm.semestre ? Number(moduleForm.semestre) : undefined,
        specialiteId: Number(moduleForm.specialiteId),
      });
      setModuleForm({ nom: '', code: '', semestre: '', specialiteId: '' });
      setMessage('Module created successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create module.');
    } finally {
      setSaving((prev) => ({ ...prev, module: false }));
    }
  };

  if (authLoading || loading) {
    return <div className="rounded-2xl border border-edge bg-surface p-6">Loading academic management...</div>;
  }

  if (!canAccess) {
    return <div className="rounded-2xl border border-edge-strong bg-danger/10 p-6 text-danger">Restricted area.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl min-w-0">
      <section className="relative overflow-hidden rounded-3xl border border-edge bg-surface p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-brand/5 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-tertiary">Academic Structure</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Promos, Sections, Specialites &amp; Modules</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Create and organize academic entities. Keep hierarchy clean so assignments flow smoothly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/users')}
            className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Back to Users
          </button>
        </div>
      </section>

      {message ? <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{message}</div> : null}
      {error ? <div className="rounded-xl border border-edge-strong bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="group rounded-2xl border border-edge bg-surface p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <GraduationCap className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="text-lg font-semibold text-ink">Create Specialite</h2>
          </div>
          <input className={inputClass} placeholder="Specialite name" value={specialiteForm.nom} onChange={(e) => setSpecialiteForm((prev) => ({ ...prev, nom: e.target.value }))} />
          <select className={inputClass} value={specialiteForm.niveau} onChange={(e) => setSpecialiteForm((prev) => ({ ...prev, niveau: e.target.value }))}>
            <option value="">Niveau (optional)</option>
            {['L1', 'L2', 'L3', 'M1', 'M2'].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button type="button" disabled={saving.specialite || !specialiteForm.nom.trim()} onClick={createSpecialite} className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-surface shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60">
            {saving.specialite ? 'Creating...' : 'Create Specialite'}
          </button>
        </article>

        <article className="group rounded-2xl border border-edge bg-surface p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Layers className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="text-lg font-semibold text-ink">Create Promo / Section</h2>
          </div>
          <select className={inputClass} value={promoForm.specialiteId} onChange={(e) => setPromoForm((prev) => ({ ...prev, specialiteId: e.target.value }))}>
            <option value="">Select specialite</option>
            {options.specialites.map((item) => <option key={`promo-specialite-${item.id}`} value={item.id}>{item.nom}</option>)}
          </select>
          <input className={inputClass} placeholder="Promo or Groupe name" value={promoForm.nom} onChange={(e) => setPromoForm((prev) => ({ ...prev, nom: e.target.value }))} />
          <input className={inputClass} placeholder="Section" value={promoForm.section} onChange={(e) => setPromoForm((prev) => ({ ...prev, section: e.target.value }))} />
          <input className={inputClass} placeholder="Academic year (2025-2026)" value={promoForm.anneeUniversitaire} onChange={(e) => setPromoForm((prev) => ({ ...prev, anneeUniversitaire: e.target.value }))} />
          <button type="button" disabled={saving.promo || !promoForm.specialiteId} onClick={createPromo} className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-surface shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60">
            {saving.promo ? 'Creating...' : 'Create Promo/Section'}
          </button>
        </article>

        <article className="group rounded-2xl border border-edge bg-surface p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <BookOpen className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="text-lg font-semibold text-ink">Create Module</h2>
          </div>
          <select className={inputClass} value={moduleForm.specialiteId} onChange={(e) => setModuleForm((prev) => ({ ...prev, specialiteId: e.target.value }))}>
            <option value="">Select specialite</option>
            {options.specialites.map((item) => <option key={`module-specialite-${item.id}`} value={item.id}>{item.nom}</option>)}
          </select>
          <input className={inputClass} placeholder="Module name" value={moduleForm.nom} onChange={(e) => setModuleForm((prev) => ({ ...prev, nom: e.target.value }))} />
          <input className={inputClass} placeholder="Module code" value={moduleForm.code} onChange={(e) => setModuleForm((prev) => ({ ...prev, code: e.target.value }))} />
          <input className={inputClass} type="number" placeholder="Semestre" value={moduleForm.semestre} onChange={(e) => setModuleForm((prev) => ({ ...prev, semestre: e.target.value }))} />
          <button type="button" disabled={saving.module || !moduleForm.nom.trim() || !moduleForm.code.trim() || !moduleForm.specialiteId} onClick={createModule} className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-surface shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60">
            {saving.module ? 'Creating...' : 'Create Module'}
          </button>
        </article>
      </section>
    </div>
  );
}


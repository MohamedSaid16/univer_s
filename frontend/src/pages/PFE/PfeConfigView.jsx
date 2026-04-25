/*
  PfeConfigView — settings-panel style CRUD for PFE system configuration.
  Displayed as a list of key/value settings rows with inline editing.
  Replaces window.confirm with a built-in confirmation banner.
*/

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Settings2,
  Key,
  Hash,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import request from '../../services/api';

/* ── Helpers ────────────────────────────────────────────────── */

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() + 1 >= 9 ? year : year - 1;
  return `${start}/${start + 1}`;
}

/* ── Inline Confirm Banner ──────────────────────────────────── */

function ConfirmBanner({ message, onConfirm, onCancel }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
      <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
      <p className="flex-1 text-sm text-ink min-w-0">{message}</p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-surface hover:opacity-90 transition-opacity"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ── Input field ─────────────────────────────────────────────── */

function Field({ label, hint, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-ink-secondary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-edge-subtle bg-control-bg px-3 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface-200 disabled:text-ink-muted';

/* ── Config Form ─────────────────────────────────────────────── */

function ConfigForm({ initial, onSubmit, onCancel, submitting, formError }) {
  const [data, setData] = useState(
    initial || {
      nom_config: '',
      valeur: '',
      description_ar: '',
      description_en: '',
      anneeUniversitaire: getCurrentAcademicYear(),
    }
  );
  const isEditing = !!initial?.id;

  const set = (key, value) => setData((p) => ({ ...p, [key]: value }));

  return (
    <div className="rounded-2xl border border-edge bg-surface p-6 shadow-card space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-brand/10 p-1.5">
            <Settings2 className="w-4 h-4 text-brand" />
          </div>
          <h3 className="text-sm font-semibold text-ink">
            {isEditing ? 'Edit Configuration' : 'New Configuration'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-200 hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {formError}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(data, isEditing); }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Configuration Key" required hint="Unique system identifier — cannot be changed after creation.">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
              <input
                type="text"
                value={data.nom_config}
                onChange={(e) => set('nom_config', e.target.value)}
                placeholder="e.g., max_groups_per_project"
                disabled={isEditing}
                required
                className={`${inputCls} pl-8`}
              />
            </div>
          </Field>

          <Field label="Value" required hint="Up to 50 characters.">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
              <input
                type="text"
                value={data.valeur}
                onChange={(e) => set('valeur', e.target.value.slice(0, 50))}
                placeholder="e.g., 3"
                maxLength={50}
                required
                className={`${inputCls} pl-8`}
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Description (Arabic)">
            <textarea
              value={data.description_ar}
              onChange={(e) => set('description_ar', e.target.value)}
              placeholder="وصف اختياري..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Description (English)">
            <textarea
              value={data.description_en}
              onChange={(e) => set('description_en', e.target.value)}
              placeholder="Optional English description..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        {!isEditing && (
          <Field label="Academic Year" hint="Format: 2025/2026">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
              <input
                type="text"
                value={data.anneeUniversitaire}
                onChange={(e) => set('anneeUniversitaire', e.target.value)}
                placeholder={getCurrentAcademicYear()}
                className={`${inputCls} pl-8`}
              />
            </div>
          </Field>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-edge-subtle">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-edge bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-surface hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Saving…' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Config Row ──────────────────────────────────────────────── */

function ConfigRow({ config, onEdit, onDelete, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasDesc = !!(config.description_ar || config.description_en);

  return (
    <div className="rounded-2xl border border-edge bg-surface shadow-card transition-all duration-200 hover:shadow-card-hover overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Key icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-surface-200 flex items-center justify-center">
          <Key className="w-4 h-4 text-ink-muted" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink font-mono">
              {config.nom_config}
            </span>
            <span className="rounded-lg bg-brand/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-brand">
              {config.valeur}
            </span>
            {config.anneeUniversitaire && (
              <span className="rounded-full bg-surface-200 px-2.5 py-0.5 text-xs text-ink-tertiary">
                {config.anneeUniversitaire}
              </span>
            )}
          </div>
          {!expanded && hasDesc && (
            <p className="mt-0.5 text-xs text-ink-tertiary truncate">
              {config.description_en || config.description_ar}
            </p>
          )}
          {config.createdAt && (
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Created {new Date(config.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasDesc && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg p-2 text-ink-muted hover:bg-surface-200 hover:text-ink transition-colors"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(config)}
            disabled={disabled}
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-200 hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-2 text-ink-muted hover:bg-danger/10 hover:text-danger transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded descriptions */}
      {expanded && hasDesc && (
        <div className="border-t border-edge-subtle px-5 py-3 bg-surface-200/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.description_ar && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-1">Arabic</p>
                <p className="text-sm text-ink-secondary" dir="rtl">{config.description_ar}</p>
              </div>
            )}
            {config.description_en && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-1">English</p>
                <p className="text-sm text-ink-secondary">{config.description_en}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="border-t border-edge-subtle px-5 py-3 bg-surface-200/40">
          <ConfirmBanner
            message={`Delete "${config.nom_config}"? This cannot be undone.`}
            onConfirm={() => { setConfirmDelete(false); onDelete(config.id); }}
            onCancel={() => setConfirmDelete(false)}
          />
        </div>
      )}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function PfeConfigView({ configs = [], loading, error, onRefresh }) {
  const [mode, setMode] = useState(null); // null | 'create' | { ...editingConfig }
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCancel = useCallback(() => {
    setMode(null);
    setFormError('');
  }, []);

  const handleEdit = useCallback((config) => {
    setMode(config);
    setFormError('');
  }, []);

  const handleSubmit = async (data, isEditing) => {
    setFormError('');
    if (!data.nom_config?.trim()) { setFormError('Configuration key is required'); return; }
    if (!data.valeur?.trim()) { setFormError('Value is required'); return; }

    setSubmitting(true);
    try {
      if (isEditing) {
        await request(`/api/v1/pfe/config/${mode.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            valeur: data.valeur.trim(),
            description_ar: data.description_ar?.trim() || null,
            description_en: data.description_en?.trim() || null,
          }),
        });
        showToast('success', 'Configuration updated successfully');
      } else {
        await request('/api/v1/pfe/config', {
          method: 'POST',
          body: JSON.stringify({
            nom_config: data.nom_config.trim(),
            valeur: data.valeur.trim(),
            description_ar: data.description_ar?.trim() || null,
            description_en: data.description_en?.trim() || null,
            anneeUniversitaire: data.anneeUniversitaire?.trim() || getCurrentAcademicYear(),
          }),
        });
        showToast('success', 'Configuration created successfully');
      }
      setMode(null);
      onRefresh();
    } catch (err) {
      setFormError(err?.message || 'Failed to save configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (configId) => {
    try {
      await request(`/api/v1/pfe/config/${configId}`, { method: 'DELETE' });
      showToast('success', 'Configuration deleted');
      onRefresh();
    } catch (err) {
      showToast('error', `Delete failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const allConfigs = Array.isArray(configs) ? configs : [];

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all ${
            toast.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-current opacity-60 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add button (shown when no form is open) */}
      {!mode && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMode('create')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-surface shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Configuration
          </button>
        </div>
      )}

      {/* Form */}
      {mode && (
        <ConfigForm
          initial={mode === 'create' ? null : mode}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitting={submitting}
          formError={formError}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-edge bg-surface px-5 py-4 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-surface-300" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-40 rounded bg-surface-300" />
                    <div className="h-4 w-14 rounded-lg bg-surface-300" />
                  </div>
                  <div className="h-3 w-48 rounded bg-surface-300" />
                </div>
                <div className="flex gap-1">
                  <div className="h-8 w-8 rounded-lg bg-surface-300" />
                  <div className="h-8 w-8 rounded-lg bg-surface-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : allConfigs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge bg-surface p-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-200">
            <Settings2 className="w-5 h-5 text-ink-muted" />
          </div>
          <p className="text-sm font-medium text-ink">No configurations yet</p>
          <p className="mt-0.5 text-xs text-ink-tertiary">
            Add your first system parameter to get started.
          </p>
          {!mode && (
            <button
              type="button"
              onClick={() => setMode('create')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-surface hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add first configuration
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {allConfigs.map((config) => (
            <ConfigRow
              key={config.id}
              config={config}
              onEdit={handleEdit}
              onDelete={handleDelete}
              disabled={!!mode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

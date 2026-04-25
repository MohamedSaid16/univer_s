/*
  PFE Workspace — redesigned enterprise admin dashboard.
  Layout: sticky header → 3-column grid (left nav | center | right stats)
  Mobile: stacked with horizontal scroll tab bar replacing left nav.
*/

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Users,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  Plus,
  Settings2,
  AlertTriangle,
  WifiOff,
  Lock,
  Loader2,
  RefreshCcw,
  ChevronRight,
  Shield,
  FileText,
  Zap,
  Activity,
  BarChart3,
  Filter,
  TrendingUp,
} from 'lucide-react';
import request from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PfeConfigView from './PfeConfigView';

/* ── Helpers ────────────────────────────────────────────────── */

const getUserDisplayName = (user) => {
  if (!user) return 'Unknown';
  return `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || 'Unknown';
};

function normalizeApiError(err) {
  if (!err) return { kind: 'unknown', message: 'Unknown error' };
  if (err.code === 'NETWORK_ERROR' || err.status === 0)
    return { kind: 'network', message: 'Server unreachable. Start the backend on http://localhost:5000.' };
  if (err.status === 401)
    return { kind: 'auth', message: 'Session expired. Please sign in again.' };
  if (err.status === 403)
    return { kind: 'forbidden', message: err.message || 'Access denied.' };
  if (err.status >= 500)
    return { kind: 'server', message: err.message || 'Server error. Please try again.' };
  return { kind: 'client', message: err.message || 'Something went wrong.' };
}

const fmt = (n) => (n ?? 0).toString();

const SUBJECT_STATUS = {
  propose: {
    label: 'Pending',
    bg: 'bg-warning/10',
    text: 'text-warning',
    dot: 'bg-warning',
    border: 'border-warning/30',
    ring: 'ring-warning/20',
  },
  valide: {
    label: 'Validated',
    bg: 'bg-success/10',
    text: 'text-success',
    dot: 'bg-success',
    border: 'border-success/30',
    ring: 'ring-success/20',
  },
  reserve: {
    label: 'Reserved',
    bg: 'bg-brand/10',
    text: 'text-brand',
    dot: 'bg-brand',
    border: 'border-brand/30',
    ring: 'ring-brand/20',
  },
  affecte: {
    label: 'Assigned',
    bg: 'bg-surface-200',
    text: 'text-ink-secondary',
    dot: 'bg-ink-muted',
    border: 'border-edge-subtle',
    ring: 'ring-edge/20',
  },
  termine: {
    label: 'Completed',
    bg: 'bg-surface-300',
    text: 'text-ink-tertiary',
    dot: 'bg-ink-muted',
    border: 'border-edge-subtle',
    ring: 'ring-edge/10',
  },
};

const ADMIN_TABS = [
  { id: 'subjects', label: 'Validation Queue', Icon: FileText, hint: 'Review proposals' },
  { id: 'groups', label: 'Groups', Icon: Users, hint: 'Manage PFE groups' },
  { id: 'defense', label: 'Defense Plan', Icon: CalendarDays, hint: 'Schedule defenses' },
  { id: 'config', label: 'Configuration', Icon: Settings2, hint: 'System settings' },
];

const TEACHER_TABS = [
  { id: 'subjects', label: 'My Subjects', Icon: BookOpen, hint: 'Your proposals' },
  { id: 'groups', label: 'Groups', Icon: Users, hint: 'Groups on your topics' },
  { id: 'defense', label: 'Defense Plan', Icon: CalendarDays, hint: 'Defense schedule' },
];

const STUDENT_TABS = [
  { id: 'subjects', label: 'Available Subjects', Icon: BookOpen, hint: 'Browse topics' },
  { id: 'groups', label: 'My Group', Icon: Users, hint: 'Your PFE group' },
  { id: 'defense', label: 'Defense Info', Icon: CalendarDays, hint: 'Defense details' },
];

/* ── Skeleton primitives ────────────────────────────────────── */

function Shimmer({ className }) {
  return (
    <div
      className={`animate-pulse rounded bg-surface-300 ${className}`}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-edge bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Shimmer className="h-5 w-3/4" />
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-2/3" />
          <div className="flex gap-2 pt-1">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-16" />
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Shimmer className="h-9 w-20 rounded-lg" />
          <Shimmer className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Shimmer className="h-8 w-24 rounded-full" />
        <Shimmer className="h-8 w-24 rounded-full" />
        <Shimmer className="h-8 w-24 rounded-full" />
      </div>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-6 w-6 rounded-lg" />
      </div>
      <Shimmer className="h-7 w-12" />
    </div>
  );
}

/* ── Small shared UI ────────────────────────────────────────── */

function StatusBadge({ status }) {
  const cfg = SUBJECT_STATUS[status] || {
    label: status || 'Unknown',
    bg: 'bg-surface-200',
    text: 'text-ink-secondary',
    dot: 'bg-ink-muted',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CapacityBar({ used, max }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const isFull = used >= max;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-surface-300 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isFull ? 'bg-danger' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-ink-tertiary whitespace-nowrap">
        {used}/{max}
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, title, hint, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-edge bg-surface p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-200">
        <Icon className="w-6 h-6 text-ink-muted" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-tertiary max-w-xs mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  const MAP = {
    network: { Icon: WifiOff, cls: 'border-warning/30 bg-warning/10', icon: 'text-warning', title: 'Backend unreachable' },
    auth: { Icon: Lock, cls: 'border-warning/30 bg-warning/10', icon: 'text-warning', title: 'Session expired' },
    forbidden: { Icon: Lock, cls: 'border-danger/30 bg-danger/10', icon: 'text-danger', title: 'Access denied' },
    server: { Icon: AlertTriangle, cls: 'border-danger/30 bg-danger/10', icon: 'text-danger', title: 'Server error' },
  };
  const cfg = MAP[error.kind] || MAP.server;
  const { Icon } = cfg;
  return (
    <div className={`flex items-start gap-3 rounded-2xl border ${cfg.cls} p-4`} role="alert">
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.icon}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{cfg.title}</p>
        <p className="mt-0.5 text-sm text-ink-secondary">{error.message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-200 transition-colors flex-shrink-0"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

/* ── Page Header ────────────────────────────────────────────── */

const ROLE_CFG = {
  admin: { label: 'Administrator', cls: 'bg-brand/10 text-brand border-brand/20' },
  enseignant: { label: 'Teacher', cls: 'bg-success/10 text-success border-success/20' },
  etudiant: { label: 'Student', cls: 'bg-warning/10 text-warning border-warning/20' },
};

function PageHeader({ role, onRefresh, loading }) {
  const rc = ROLE_CFG[role] || { label: 'User', cls: 'bg-surface-200 text-ink-secondary border-edge' };
  const subtitle = {
    admin: 'Oversee subjects, groups, jury planning, and system configuration.',
    enseignant: 'Manage your research proposals and track assigned groups.',
    etudiant: 'Browse validated subjects and check your group assignment.',
  }[role] || '';

  return (
    <header className="rounded-3xl border border-edge bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
              PFE Workspace
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${rc.cls}`}>
              <Shield className="w-3 h-3" />
              {rc.label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Campaign Open
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">PFE Configuration</h1>
          <p className="mt-1 text-sm text-ink-secondary max-w-xl">{subtitle}</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-edge bg-surface-200 px-4 py-2 text-sm font-medium text-ink-secondary transition-all hover:bg-surface-300 hover:text-ink disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </header>
  );
}

/* ── Left Navigation ────────────────────────────────────────── */

function NavItem({ tab, isActive, onClick, count }) {
  const { Icon } = tab;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-brand text-surface shadow-md'
          : 'text-ink-secondary hover:bg-surface-200 hover:text-ink'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left leading-none">{tab.label}</span>
      {count != null && count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isActive ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand'
          }`}
        >
          {count}
        </span>
      )}
      <ChevronRight
        className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${
          isActive ? 'opacity-40' : 'opacity-0 group-hover:opacity-30'
        }`}
      />
    </button>
  );
}

function LeftNav({ tabs, activeTab, onTabChange, counts }) {
  return (
    <nav className="rounded-2xl border border-edge bg-surface p-3 shadow-card space-y-0.5">
      <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
        Workspace
      </p>
      {tabs.map((tab) => (
        <NavItem
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          count={counts[tab.id]}
        />
      ))}
    </nav>
  );
}

/* ── Right Panel — Stats + Insights ────────────────────────── */

function StatCard({ icon: Icon, label, value, colorCls, loading: statLoading }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4 transition-shadow hover:shadow-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-ink-tertiary">{label}</p>
        <div className={`rounded-lg p-1.5 ${colorCls}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      {statLoading ? (
        <Shimmer className="h-7 w-10" />
      ) : (
        <p className="text-2xl font-bold tracking-tight text-ink">{value}</p>
      )}
    </div>
  );
}

function SystemDot({ status }) {
  const MAP = {
    online: { dot: 'bg-success', label: 'Online', text: 'text-success' },
    degraded: { dot: 'bg-warning animate-pulse', label: 'Degraded', text: 'text-warning' },
    offline: { dot: 'bg-danger animate-pulse', label: 'Offline', text: 'text-danger' },
  };
  const c = MAP[status] || MAP.online;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
    </div>
  );
}

function RightPanel({ stats, systemStatus, lastUpdated, isAdmin, loading }) {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-edge bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-brand" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Quick Stats
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard icon={FileText} label="Subjects" value={fmt(stats.total)} colorCls="bg-brand/10 text-brand" loading={loading} />
          <StatCard icon={Clock} label="Pending" value={fmt(stats.pending)} colorCls="bg-warning/10 text-warning" loading={loading} />
          <StatCard icon={CheckCircle2} label="Validated" value={fmt(stats.validated)} colorCls="bg-success/10 text-success" loading={loading} />
          <StatCard icon={Users} label="Groups" value={fmt(stats.groups)} colorCls="bg-brand/10 text-brand" loading={loading} />
        </div>
      </div>

      <div className="rounded-2xl border border-edge bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-brand" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            System
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-secondary">API Status</span>
            <SystemDot status={systemStatus} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-secondary">Last sync</span>
            <span className="text-xs font-mono text-ink-tertiary">{lastUpdated}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-secondary">Environment</span>
            <span className="rounded-full bg-surface-200 px-2 py-0.5 text-xs font-medium text-ink-secondary">
              {process.env.NODE_ENV || 'development'}
            </span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-brand" />
            <p className="text-xs font-semibold text-brand">Campaign Active</p>
          </div>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Subject proposals are currently open for this academic year.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-edge bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-brand" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Progress
          </p>
        </div>
        <div className="space-y-3">
          {[
            {
              label: 'Validation rate',
              value: stats.total > 0 ? Math.round((stats.validated / stats.total) * 100) : 0,
              color: 'bg-success',
            },
            {
              label: 'Group fill rate',
              value: stats.total > 0 ? Math.min(100, Math.round((stats.groups / Math.max(1, stats.validated)) * 100)) : 0,
              color: 'bg-brand',
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-ink-secondary">{label}</span>
                <span className="text-xs font-semibold text-ink">{value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-300 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ── Filter pills ───────────────────────────────────────────── */

function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
            value === opt.value
              ? 'bg-brand text-surface shadow-sm'
              : 'bg-surface-200 text-ink-secondary hover:bg-surface-300 hover:text-ink'
          }`}
        >
          {opt.dot && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                value === opt.value ? 'bg-surface/60' : opt.dot
              }`}
            />
          )}
          {opt.label}
          {opt.count != null && (
            <span
              className={`rounded-full px-1.5 text-[10px] font-bold ${
                value === opt.value ? 'bg-white/20' : 'bg-surface-300'
              }`}
            >
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="rounded-2xl border border-edge bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-1.5">
              {eyebrow}
            </p>
          )}
          <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-secondary">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ADMIN VALIDATION QUEUE
   ───────────────────────────────────────────────────────────── */

function AdminValidationQueue({ subjects, loading, error, onValidate, onReject, onRetry }) {
  const [filter, setFilter] = useState('all');

  const allSubjects = Array.isArray(subjects) ? subjects : [];

  const counts = useMemo(
    () => ({
      all: allSubjects.length,
      propose: allSubjects.filter((s) => s.status === 'propose').length,
      valide: allSubjects.filter((s) => s.status === 'valide').length,
      rejected: allSubjects.filter((s) => !['propose', 'valide'].includes(s.status)).length,
    }),
    [allSubjects]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return allSubjects;
    if (filter === 'rejected') return allSubjects.filter((s) => !['propose', 'valide'].includes(s.status));
    return allSubjects.filter((s) => s.status === filter);
  }, [allSubjects, filter]);

  const filterOptions = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'propose', label: 'Pending', count: counts.propose, dot: 'bg-warning' },
    { value: 'valide', label: 'Validated', count: counts.valide, dot: 'bg-success' },
    { value: 'rejected', label: 'Other', count: counts.rejected, dot: 'bg-ink-muted' },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Admin Tools"
        title="Subjects Oversight"
        subtitle={`Review and validate ${allSubjects.length} subject proposal${allSubjects.length !== 1 ? 's' : ''}`}
      />

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorBanner error={error} onRetry={onRetry} />
      ) : allSubjects.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No subjects yet"
          hint="Teachers haven't submitted any proposals yet."
        />
      ) : (
        <>
          <FilterPills options={filterOptions} value={filter} onChange={setFilter} />

          {filtered.length === 0 ? (
            <EmptyState icon={Filter} title={`No ${filter} subjects`} hint="Try a different filter." />
          ) : (
            <div className="space-y-3">
              {filtered.map((subject) => {
                const cfg = SUBJECT_STATUS[subject.status] || SUBJECT_STATUS.affecte;
                const isPending = subject.status === 'propose';
                return (
                  <div
                    key={subject.id}
                    className={`group rounded-2xl border ${cfg.border} bg-surface p-5 shadow-card transition-all duration-200 hover:shadow-card-hover`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Left accent bar */}
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.dot}`} />

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <h3 className="text-sm font-semibold text-ink truncate">
                              {subject.titre_ar || subject.titre_en || `Subject #${subject.id}`}
                            </h3>
                            <StatusBadge status={subject.status} />
                          </div>
                          {isPending && (
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => onValidate(subject.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-surface transition-opacity hover:opacity-90"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => onReject(subject.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-surface transition-opacity hover:opacity-90"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-ink-secondary line-clamp-2 mb-3">
                          {subject.description_ar || subject.description_en || 'No description provided.'}
                        </p>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-tertiary">
                          <span>
                            <span className="font-medium text-ink-secondary">Teacher:</span>{' '}
                            {getUserDisplayName(subject.enseignant?.user)}
                          </span>
                          {subject.typeProjet && (
                            <span className="rounded-md bg-surface-200 px-2 py-0.5 font-medium capitalize">
                              {subject.typeProjet}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                            <span className="font-medium text-ink-secondary">Capacity:</span>
                            <div className="flex-1">
                              <CapacityBar
                                used={subject.groupsPfe?.length || 0}
                                max={subject.maxGrps || 1}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TEACHER SUBJECTS VIEW
   ───────────────────────────────────────────────────────────── */

function TeacherSubjectsView({ subjects, loading, error, onRefresh, teacherProfileId, onRetry }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    titre_ar: '',
    titre_en: '',
    description_ar: '',
    description_en: '',
    typeProjet: 'application',
    maxGrps: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const resetForm = () => {
    setFormData({ titre_ar: '', titre_en: '', description_ar: '', description_en: '', typeProjet: 'application', maxGrps: 1 });
    setSubmitError(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!teacherProfileId) {
      setSubmitError({ kind: 'client', message: 'Teacher profile missing. Please re-login.' });
      return;
    }
    setSubmitting(true);
    try {
      await request('/api/v1/pfe/sujets', {
        method: 'POST',
        body: JSON.stringify({ ...formData, enseignantId: Number(teacherProfileId) }),
      });
      resetForm();
      onRefresh();
    } catch (err) {
      setSubmitError(normalizeApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const list = Array.isArray(subjects) ? subjects : [];

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Research Topics"
        title="My Subjects"
        subtitle={`${list.length} proposal${list.length !== 1 ? 's' : ''} submitted`}
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            disabled={!teacherProfileId}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-surface shadow-sm transition-all hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            New Subject
          </button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-edge bg-surface p-6 shadow-card space-y-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">Propose New Subject</h3>
            <button type="button" onClick={resetForm} className="text-ink-muted hover:text-ink transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {submitError && <ErrorBanner error={submitError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { field: 'titre_ar', label: 'Title (Arabic)', placeholder: 'العنوان', required: true },
              { field: 'titre_en', label: 'Title (English)', placeholder: 'Project title' },
            ].map(({ field, label, placeholder, required }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
                  {label}{required && <span className="text-danger ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  value={formData[field]}
                  onChange={(e) => setFormData((p) => ({ ...p, [field]: e.target.value }))}
                  required={required}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-edge-subtle bg-control-bg px-3 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { field: 'description_ar', label: 'Description (Arabic)', placeholder: 'وصف المشروع', required: true },
              { field: 'description_en', label: 'Description (English)', placeholder: 'Project description' },
            ].map(({ field, label, placeholder, required }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
                  {label}{required && <span className="text-danger ml-0.5">*</span>}
                </label>
                <textarea
                  value={formData[field]}
                  onChange={(e) => setFormData((p) => ({ ...p, [field]: e.target.value }))}
                  required={required}
                  rows={3}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-edge-subtle bg-control-bg px-3 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
                Project Type
              </label>
              <select
                value={formData.typeProjet}
                onChange={(e) => setFormData((p) => ({ ...p, typeProjet: e.target.value }))}
                className="w-full rounded-xl border border-edge-subtle bg-control-bg px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="application">Application</option>
                <option value="research">Research</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
                Max Groups
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={formData.maxGrps}
                onChange={(e) => setFormData((p) => ({ ...p, maxGrps: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                className="w-full rounded-xl border border-edge-subtle bg-control-bg px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-edge-subtle">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-edge bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating…' : 'Create Subject'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorBanner error={error} onRetry={onRetry} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          hint="Create your first research topic proposal."
          action={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-surface"
            >
              <Plus className="w-4 h-4" /> New Subject
            </button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-edge bg-surface shadow-card overflow-hidden">
          <div className="border-b border-edge-subtle bg-surface-200/60 px-5 py-3">
            <div className="grid grid-cols-[1fr_120px_80px_80px] gap-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <span>Subject</span>
              <span>Status</span>
              <span className="text-center">Groups</span>
              <span>Actions</span>
            </div>
          </div>
          <div className="divide-y divide-edge-subtle">
            {list.map((subject) => {
              const cfg = SUBJECT_STATUS[subject.status] || SUBJECT_STATUS.affecte;
              return (
                <div
                  key={subject.id}
                  className="grid grid-cols-[1fr_120px_80px_80px] items-center gap-4 px-5 py-4 hover:bg-surface-200/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {subject.titre_ar || subject.titre_en || `Subject #${subject.id}`}
                    </p>
                    {subject.typeProjet && (
                      <span className="text-xs text-ink-tertiary capitalize">{subject.typeProjet}</span>
                    )}
                  </div>
                  <div>
                    <StatusBadge status={subject.status} />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-ink">{subject.groupsPfe?.length || 0}</span>
                    <span className="text-xs text-ink-tertiary">/{subject.maxGrps || 1}</span>
                  </div>
                  <div>
                    {subject.status === 'propose' && (
                      <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STUDENT SUBJECT GALLERY
   ───────────────────────────────────────────────────────────── */

function StudentSubjectGallery({ subjects, loading, error, onSelect, selectedSubjectId, onRetry }) {
  const validated = (Array.isArray(subjects) ? subjects : []).filter((s) => s.status === 'valide');

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Available Topics"
        title="Subject Gallery"
        subtitle={`${validated.length} validated topic${validated.length !== 1 ? 's' : ''} ready for selection`}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-edge bg-surface p-5 shadow-card">
              <div className="space-y-3">
                <Shimmer className="h-5 w-3/4" />
                <Shimmer className="h-4 w-full" />
                <Shimmer className="h-4 w-full" />
                <Shimmer className="h-4 w-1/2" />
                <Shimmer className="h-9 w-full rounded-xl mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorBanner error={error} onRetry={onRetry} />
      ) : validated.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No validated subjects yet"
          hint="Check back after the administration approves new proposals."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {validated.map((subject) => {
            const isFull = (subject.groupsPfe?.length || 0) >= (subject.maxGrps || 1);
            const isSelected = selectedSubjectId === subject.id;
            return (
              <div
                key={subject.id}
                className={`rounded-2xl border-2 p-5 transition-all duration-200 ${
                  isSelected
                    ? 'border-brand bg-brand/5 shadow-card-hover'
                    : isFull
                    ? 'border-edge bg-surface-200/50 opacity-70'
                    : 'border-edge bg-surface shadow-card hover:border-brand/40 hover:shadow-card-hover cursor-pointer'
                }`}
                onClick={() => !isFull && onSelect(subject.id, !isSelected)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-semibold text-ink leading-snug">
                    {subject.titre_ar || subject.titre_en || `Subject #${subject.id}`}
                  </h3>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-ink-secondary line-clamp-3 mb-4">
                  {subject.description_ar || subject.description_en || '—'}
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-ink-tertiary">
                    <span>by {getUserDisplayName(subject.enseignant?.user)}</span>
                    {subject.typeProjet && (
                      <span className="rounded-md bg-surface-200 px-2 py-0.5 capitalize font-medium">
                        {subject.typeProjet}
                      </span>
                    )}
                  </div>
                  <CapacityBar
                    used={subject.groupsPfe?.length || 0}
                    max={subject.maxGrps || 1}
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelect(subject.id, !isSelected); }}
                  disabled={isFull && !isSelected}
                  className={`mt-4 w-full rounded-xl py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-brand text-surface hover:opacity-90'
                      : isFull
                      ? 'bg-surface-300 text-ink-muted cursor-not-allowed'
                      : 'bg-surface-200 text-ink hover:bg-surface-300'
                  }`}
                >
                  {isSelected ? '✓ Selected' : isFull ? 'Full' : 'Select this topic'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   GROUPS OVERVIEW
   ───────────────────────────────────────────────────────────── */

function GroupsOverview({ groups, loading, error, isAdmin, isTeacher, onRetry }) {
  const list = Array.isArray(groups) ? groups : [];
  const title = isAdmin ? 'All Groups' : isTeacher ? 'Groups on My Subjects' : 'My Group';
  const subtitle = isAdmin
    ? `${list.length} PFE group${list.length !== 1 ? 's' : ''} in the system`
    : isTeacher
    ? 'Groups that selected one of your research topics'
    : 'Your assigned PFE group and members';

  return (
    <div className="space-y-4">
      <SectionHeader eyebrow="PFE Groups" title={title} subtitle={subtitle} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-edge bg-surface p-5 shadow-card space-y-3">
              <Shimmer className="h-5 w-2/3" />
              <Shimmer className="h-4 w-full" />
              <Shimmer className="h-4 w-3/4" />
              <div className="flex gap-2 pt-2">
                {[0, 1, 2].map((j) => <Shimmer key={j} className="h-7 w-7 rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorBanner error={error} onRetry={onRetry} />
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title="No groups found" hint="Groups will appear here once formed." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((group) => {
            const subject = group.sujetFinal;
            const memberCount = group.groupMembers?.length || 0;
            return (
              <div
                key={group.id}
                className="rounded-2xl border border-edge bg-surface p-5 shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      {group.nom_ar || group.nom_en || `Group #${group.id}`}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-tertiary">
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Active
                  </span>
                </div>

                <div className="rounded-xl bg-surface-200/60 px-3 py-2.5 mb-3">
                  <p className="text-xs font-medium text-ink-secondary mb-0.5">Subject</p>
                  <p className="text-sm text-ink font-medium truncate">
                    {subject?.titre_ar || subject?.titre_en || 'No subject assigned'}
                  </p>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    {getUserDisplayName(subject?.enseignant?.user)}
                  </p>
                </div>

                {/* Member avatars */}
                {memberCount > 0 && (
                  <div className="flex items-center gap-1">
                    {(group.groupMembers || []).slice(0, 4).map((m, idx) => (
                      <div
                        key={idx}
                        className="w-7 h-7 rounded-full bg-brand/20 border-2 border-surface flex items-center justify-center text-xs font-semibold text-brand -ml-1 first:ml-0"
                      >
                        {(m?.user?.prenom?.[0] || m?.prenom?.[0] || '?').toUpperCase()}
                      </div>
                    ))}
                    {memberCount > 4 && (
                      <div className="w-7 h-7 rounded-full bg-surface-300 border-2 border-surface flex items-center justify-center text-xs font-semibold text-ink-secondary -ml-1">
                        +{memberCount - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DEFENSE PANEL (placeholder)
   ───────────────────────────────────────────────────────────── */

function DefensePanel() {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Defense Planning"
        title="Defense Schedule"
        subtitle="Oral defense sessions and jury assignments"
      />
      <EmptyState
        icon={CalendarDays}
        title="Defense planning coming soon"
        hint="This module is under development. Check back in the next release."
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────── */

export default function PFEWorkspacePage() {
  const { user, loading: authLoading } = useAuth();

  const { isAdmin, isTeacher, isStudent, teacherProfileId } = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    return {
      isAdmin: roles.includes('admin'),
      isTeacher: roles.includes('enseignant'),
      isStudent: roles.includes('etudiant'),
      teacherProfileId: user?.enseignant?.id ?? null,
    };
  }, [user]);

  const availableTabs = useMemo(
    () => (isAdmin ? ADMIN_TABS : isTeacher ? TEACHER_TABS : STUDENT_TABS),
    [isAdmin, isTeacher]
  );

  const role = isAdmin ? 'admin' : isTeacher ? 'enseignant' : 'etudiant';

  /* ── State ──────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('—');

  useEffect(() => {
    if (!availableTabs.some((t) => t.id === activeTab)) setActiveTab('subjects');
  }, [availableTabs, activeTab]);

  /* ── Data loaders ───────────────────────────────────────────── */

  const loadSubjects = useCallback(async () => {
    if (authLoading) return;
    const endpoint = isStudent
      ? '/api/v1/pfe/sujets?status=valide'
      : isTeacher && teacherProfileId
      ? `/api/v1/pfe/sujets?enseignantId=${teacherProfileId}`
      : '/api/v1/pfe/sujets';
    try {
      setLoading(true);
      setError(null);
      const res = await request(endpoint);
      setSubjects(Array.isArray(res?.data) ? res.data : []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(normalizeApiError(err));
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isStudent, isTeacher, teacherProfileId]);

  const loadGroups = useCallback(async () => {
    if (authLoading) return;
    try {
      setLoading(true);
      setError(null);
      const res = await request('/api/v1/pfe/groupes');
      setGroups(Array.isArray(res?.data) ? res.data : []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(normalizeApiError(err));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading]);

  const loadConfigs = useCallback(async () => {
    if (authLoading) return;
    if (!isAdmin) {
      setConfigs([]);
      setError({ kind: 'forbidden', message: 'Configuration is only available to administrators.' });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await request('/api/v1/pfe/config');
      setConfigs(Array.isArray(res?.data) ? res.data : []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(normalizeApiError(err));
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAdmin]);

  const loadJury = useCallback(async () => {
    if (authLoading) return;
    try {
      setLoading(true);
      setError(null);
      await request('/api/v1/pfe/jury');
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    setError(null);
    if (activeTab === 'subjects') loadSubjects();
    else if (activeTab === 'groups') loadGroups();
    else if (activeTab === 'defense') loadJury();
    else if (activeTab === 'config') loadConfigs();
  }, [activeTab, loadSubjects, loadGroups, loadJury, loadConfigs]);

  /* ── Actions ────────────────────────────────────────────────── */

  const handleValidate = async (sujetId) => {
    try {
      await request(`/api/v1/pfe/sujets/${sujetId}/valider`, {
        method: 'PUT',
        body: JSON.stringify({ adminId: user?.id }),
      });
      loadSubjects();
    } catch (err) {
      setError(normalizeApiError(err));
    }
  };

  const handleReject = async (sujetId) => {
    try {
      await request(`/api/v1/pfe/sujets/${sujetId}/refuser`, {
        method: 'PUT',
        body: JSON.stringify({ adminId: user?.id }),
      });
      loadSubjects();
    } catch (err) {
      setError(normalizeApiError(err));
    }
  };

  const handleSelectSubject = useCallback((sujetId, isSelected) => {
    setSelectedSubjectId(isSelected ? sujetId : null);
  }, []);

  const retryActiveTab = useCallback(() => {
    if (activeTab === 'subjects') loadSubjects();
    else if (activeTab === 'groups') loadGroups();
    else if (activeTab === 'defense') loadJury();
    else if (activeTab === 'config') loadConfigs();
  }, [activeTab, loadSubjects, loadGroups, loadJury, loadConfigs]);

  /* ── Derived stats ──────────────────────────────────────────── */

  const stats = useMemo(
    () => ({
      total: subjects.length,
      pending: subjects.filter((s) => s.status === 'propose').length,
      validated: subjects.filter((s) => s.status === 'valide').length,
      groups: groups.length,
    }),
    [subjects, groups]
  );

  const tabCounts = useMemo(
    () => ({
      subjects: subjects.length || undefined,
      groups: groups.length || undefined,
      config: configs.length || undefined,
    }),
    [subjects, groups, configs]
  );

  const systemStatus = error?.kind === 'network' ? 'offline' : error ? 'degraded' : 'online';

  /* ── Tab content ────────────────────────────────────────────── */

  const renderCenter = () => {
    if (authLoading) return <SkeletonList count={3} />;

    if (activeTab === 'subjects') {
      if (isAdmin)
        return (
          <AdminValidationQueue
            subjects={subjects}
            loading={loading}
            error={error}
            onValidate={handleValidate}
            onReject={handleReject}
            onRetry={retryActiveTab}
          />
        );
      if (isTeacher)
        return (
          <TeacherSubjectsView
            subjects={subjects}
            loading={loading}
            error={error}
            onRefresh={loadSubjects}
            teacherProfileId={teacherProfileId}
            onRetry={retryActiveTab}
          />
        );
      return (
        <StudentSubjectGallery
          subjects={subjects}
          loading={loading}
          error={error}
          onSelect={handleSelectSubject}
          selectedSubjectId={selectedSubjectId}
          onRetry={retryActiveTab}
        />
      );
    }

    if (activeTab === 'groups')
      return (
        <GroupsOverview
          groups={groups}
          loading={loading}
          error={error}
          isAdmin={isAdmin}
          isTeacher={isTeacher}
          onRetry={retryActiveTab}
        />
      );

    if (activeTab === 'defense') return <DefensePanel />;

    if (activeTab === 'config')
      return (
        <div className="space-y-4">
          <SectionHeader
            eyebrow="System"
            title="Configuration"
            subtitle="Manage PFE system parameters and academic year settings"
          />
          <PfeConfigView
            configs={configs}
            loading={loading}
            error={error?.message || ''}
            onRefresh={loadConfigs}
          />
        </div>
      );

    return null;
  };

  /* ── Main render ────────────────────────────────────────────── */

  return (
    <div className="space-y-5 max-w-[1600px] min-w-0">
      {/* Header */}
      <PageHeader role={role} onRefresh={retryActiveTab} loading={loading} />

      {/* Mobile tab bar (visible only on small screens) */}
      <div className="lg:hidden overflow-x-auto">
        <div className="flex gap-1 rounded-2xl border border-edge bg-surface p-1.5 shadow-card w-max min-w-full">
          {availableTabs.map((tab) => {
            const { Icon } = tab;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive ? 'bg-brand text-surface shadow-sm' : 'text-ink-secondary hover:text-ink hover:bg-surface-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tabCounts[tab.id] && (
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-surface-300'}`}>
                    {tabCounts[tab.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-5 items-start">
        {/* Left nav — hidden on mobile (tabs above take over) */}
        <div className="hidden lg:block lg:sticky lg:top-5">
          <LeftNav
            tabs={availableTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={tabCounts}
          />
        </div>

        {/* Center panel */}
        <main className="min-w-0">{renderCenter()}</main>

        {/* Right panel */}
        <div className="lg:sticky lg:top-5">
          <RightPanel
            stats={stats}
            systemStatus={systemStatus}
            lastUpdated={lastUpdated}
            isAdmin={isAdmin}
            loading={loading && subjects.length === 0}
          />
        </div>
      </div>
    </div>
  );
}

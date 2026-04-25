/*
  StudentHistoryPage — Student self-view of their activity history.
  Sections: Disciplinary councils, Reclamations, Justifications.
  Data: GET /api/v1/history/student/me
*/

import React, { useEffect, useMemo, useState } from 'react';
import request from '../services/api';

const TABS = [
  { id: 'disciplinary', label: 'Disciplinary councils' },
  { id: 'reclamations', label: 'Reclamations' },
  { id: 'justifications', label: 'Justifications' },
];

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    info: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (['traitee', 'valide', 'approved', 'resolved'].includes(s)) return 'success';
  if (['refusee', 'refuse', 'rejected'].includes(s)) return 'danger';
  if (['en_cours', 'en_verification', 'en_instruction', 'jugement', 'pending'].includes(s)) return 'warning';
  return 'info';
}

export default function StudentHistoryPage({ endpoint = '/api/v1/history/student/me' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('disciplinary');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await request(endpoint);
        if (!cancelled) setData(res?.data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const counts = useMemo(() => ({
    disciplinary: data?.disciplinaryCouncils?.length || 0,
    reclamations: data?.reclamations?.length || 0,
    justifications: data?.justifications?.length || 0,
  }), [data]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading history…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-rose-600">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">My History</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data?.user?.prenom} {data?.user?.nom}
          {data?.user?.matricule ? ` · ${data.user.matricule}` : ''}
        </p>
      </header>

      <nav className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label} <span className="ml-1 text-xs text-gray-400">({counts[t.id]})</span>
          </button>
        ))}
      </nav>

      <section>
        {tab === 'disciplinary' && (
          <DisciplinaryList items={data?.disciplinaryCouncils || []} />
        )}
        {tab === 'reclamations' && <ReclamationsList items={data?.reclamations || []} />}
        {tab === 'justifications' && <JustificationsList items={data?.justifications || []} />}
      </section>
    </div>
  );
}

function EmptyRow({ label }) {
  return <div className="text-sm text-gray-500 italic py-6">No {label} yet.</div>;
}

function DisciplinaryList({ items }) {
  if (!items.length) return <EmptyRow label="disciplinary cases" />;
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {items.map((d) => (
        <li key={d.id} className="p-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">
                {d.infraction?.nom_en || d.infraction?.nom_ar || 'Infraction'}
              </p>
              <Badge tone={statusTone(d.status)}>{d.status}</Badge>
              {d.infraction?.gravite && (
                <Badge tone="neutral">severity: {d.infraction.gravite}</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Reported: {formatDate(d.dateSignal)}
              {d.reportedBy?.name ? ` · by ${d.reportedBy.name}` : ''}
            </p>
            {d.decision && (
              <p className="text-xs text-gray-500">
                Decision: {d.decision.nom_en || d.decision.nom_ar}
                {d.decision.niveauSanction ? ` (${d.decision.niveauSanction})` : ''}
                {d.dateDecision ? ` · ${formatDate(d.dateDecision)}` : ''}
              </p>
            )}
          </div>
          {d.conseil && (
            <div className="text-right text-xs text-gray-500">
              Council: {formatDate(d.conseil.dateReunion)}
              <br />
              {d.conseil.lieu || ''}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function ReclamationsList({ items }) {
  if (!items.length) return <EmptyRow label="reclamations" />;
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {items.map((r) => (
        <li key={r.id} className="p-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">
              {r.objet_en || r.objet_ar || 'Reclamation'}
            </p>
            <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            {r.type && (
              <Badge tone="info">{r.type.nom_en || r.type.nom_ar}</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Submitted: {formatDate(r.createdAt)}</p>
          <p className="text-sm text-gray-700 mt-2 line-clamp-3">
            {r.description_en || r.description_ar || ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

function JustificationsList({ items }) {
  if (!items.length) return <EmptyRow label="justifications" />;
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {items.map((j) => (
        <li key={j.id} className="p-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">
              {j.motif_en || j.motif_ar || 'Absence'}
            </p>
            <Badge tone={statusTone(j.status)}>{j.status}</Badge>
            {j.type && <Badge tone="info">{j.type.nom_en || j.type.nom_ar}</Badge>}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Absence date: {formatDate(j.dateAbsence)} · Submitted: {formatDate(j.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

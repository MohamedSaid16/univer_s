/*
  TeacherHistoryPage — Teacher self-view of their activity history.
  Sections: Reported students (disciplinary), PFE projects with group members, Documents.
  Data: GET /api/v1/history/teacher/me
*/

import React, { useEffect, useMemo, useState } from 'react';
import request from '../services/api';

const TABS = [
  { id: 'reported', label: 'Reported students' },
  { id: 'pfe', label: 'PFE projects' },
  { id: 'documents', label: 'Documents' },
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

function councilTone(councilStatus) {
  if (councilStatus === 'approved') return 'success';
  if (councilStatus === 'rejected') return 'danger';
  return 'warning';
}

export default function TeacherHistoryPage({ endpoint = '/api/v1/history/teacher/me' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('reported');

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
    reported: data?.reportedStudents?.length || 0,
    pfe: data?.pfeProjects?.length || 0,
    documents: data?.documents?.length || 0,
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
          {data?.user?.grade ? ` · ${data.user.grade.nom_en || data.user.grade.nom_ar}` : ''}
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
        {tab === 'reported' && <ReportedStudents items={data?.reportedStudents || []} />}
        {tab === 'pfe' && <PfeProjects items={data?.pfeProjects || []} />}
        {tab === 'documents' && <TeacherDocuments items={data?.documents || []} />}
      </section>
    </div>
  );
}

function EmptyRow({ label }) {
  return <div className="text-sm text-gray-500 italic py-6">No {label} yet.</div>;
}

function ReportedStudents({ items }) {
  if (!items.length) return <EmptyRow label="reported students" />;
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {items.map((r) => (
        <li key={r.dossierId} className="p-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">
                {r.student ? `${r.student.prenom || ''} ${r.student.nom || ''}`.trim() : 'Student'}
              </p>
              {r.student?.matricule && <Badge tone="neutral">{r.student.matricule}</Badge>}
              <Badge tone={councilTone(r.councilStatus)}>council: {r.councilStatus}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {r.infraction?.nom_en || r.infraction?.nom_ar || 'Infraction'}
              {r.infraction?.gravite ? ` · ${r.infraction.gravite}` : ''}
            </p>
            {r.student?.email && (
              <p className="text-xs text-gray-400">{r.student.email}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-500">
            Reported: {formatDate(r.dateSignal)}
            {r.council?.dateReunion && (
              <>
                <br />
                Council: {formatDate(r.council.dateReunion)}
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PfeProjects({ items }) {
  if (!items.length) return <EmptyRow label="PFE projects" />;
  return (
    <ul className="space-y-4">
      {items.map((p) => (
        <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">
              {p.titre_en || p.titre_ar}
            </p>
            <Badge tone="info">{p.status}</Badge>
            {p.typeProjet && <Badge tone="neutral">{p.typeProjet}</Badge>}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {p.anneeUniversitaire || ''}
            {p.promo?.nom_ar ? ` · ${p.promo.nom_ar}` : ''}
            {p.promo?.section ? ` · section ${p.promo.section}` : ''}
          </p>

          {p.groups.length === 0 ? (
            <p className="text-xs text-gray-500 italic mt-3">No group assigned yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {p.groups.map((g) => (
                <div key={g.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-gray-800">
                      {g.nom_en || g.nom_ar || `Group #${g.id}`}
                    </p>
                    {g.mention && <Badge tone="success">{g.mention}</Badge>}
                    {g.note != null && <Badge tone="info">note: {String(g.note)}</Badge>}
                    {g.dateSoutenance && (
                      <Badge tone="neutral">defense: {formatDate(g.dateSoutenance)}</Badge>
                    )}
                  </div>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {g.members.map((m) => (
                      <li key={`${g.id}-${m.etudiantId}`} className="text-xs text-gray-700">
                        <span className="font-medium">
                          {`${m.prenom || ''} ${m.nom || ''}`.trim() || 'Member'}
                        </span>
                        {m.matricule ? ` · ${m.matricule}` : ''}
                        {m.role === 'chef_groupe' ? ' · (leader)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function docStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (['valide'].includes(s)) return 'success';
  if (['refuse'].includes(s)) return 'danger';
  if (['en_traitement'].includes(s)) return 'warning';
  return 'info';
}

function TeacherDocuments({ items }) {
  if (!items.length) return <EmptyRow label="documents" />;
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {items.map((d) => (
        <li key={d.id} className="p-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">
              {d.typeDoc?.nom_en || d.typeDoc?.nom_ar || 'Document request'}
            </p>
            <Badge tone={docStatusTone(d.status)}>{d.status?.replace(/_/g, ' ')}</Badge>
            {d.typeDoc?.categorie && <Badge tone="neutral">{d.typeDoc.categorie}</Badge>}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Requested: {formatDate(d.dateDemande)}
            {d.dateTraitement ? ` · Processed: ${formatDate(d.dateTraitement)}` : ''}
          </p>
          {(d.description_en || d.description_ar) && (
            <p className="text-sm text-gray-700 mt-2 line-clamp-3">
              {d.description_en || d.description_ar}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

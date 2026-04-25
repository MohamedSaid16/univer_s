/*
  TeacherDashboard — visual replica of the friend-version 5-tab layout,
  wired to the CURRENT backend (/api/v1/teacher/dashboard + /teacher/students).

  We never call the OLD getCharts / getPendingDocuments / getPfe / getModules /
  getJury endpoints — they do not exist here. Instead we derive the data each
  tab displays from the existing overview + students responses and show empty
  states where the NEW backend has no equivalent (jury, PFE themes, pending
  document submissions). Every hook, state value, and API call in the NEW
  project is preserved; only the return JSX was replaced.
*/

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import ProfileHeader from '../../components/dashboard/teacher/ProfileHeader';
import ReportStudentModal from '../../components/dashboard/teacher/ReportStudentModal';
import { teacherDashboardService } from '../../services/teacherDashboard';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'document', label: 'Document' },
  { id: 'pfe', label: 'PFE' },
  { id: 'module', label: 'Module' },
  { id: 'jury', label: 'Jury' },
];

const CHART_PALETTE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#8dd1e1', '#a4de6c'];

const DISCIPLINE_STATUS_LABEL = {
  signale: 'Reported',
  en_instruction: 'Under Review',
  jugement: 'Judgment',
  traite: 'Closed',
};

function StudentListModal({ isOpen, onClose, title, students, onReport }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-surface rounded-xl shadow-card border border-edge w-full max-w-2xl max-h-[80vh] flex flex-col transform transition-all duration-300">
        <div className="flex items-center justify-between p-6 border-b border-edge">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-ink-tertiary hover:text-ink hover:bg-surface-200 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-center text-ink-tertiary">No students found.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-edge/20 text-ink-secondary text-sm">
                <tr>
                  <th className="p-3 border-b border-edge font-medium rounded-tl-lg">Matricule</th>
                  <th className="p-3 border-b border-edge font-medium">Name</th>
                  {onReport && <th className="p-3 border-b border-edge font-medium rounded-tr-lg">Actions</th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-edge/10 border-b border-edge last:border-b-0">
                    <td className="p-3 font-mono text-ink-secondary">{s.matricule}</td>
                    <td className="p-3 font-medium text-ink">{s.name}</td>
                    {onReport && (
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onReport(s)}
                          className="px-3 py-1 text-xs font-medium text-danger border border-danger/40 rounded-md hover:bg-danger/10 transition-colors"
                        >
                          Report
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function countBy(list, keyFn) {
  const counts = {};
  for (const item of list || []) {
    const key = keyFn(item);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');

  const [disciplinaryCases, setDisciplinaryCases] = useState([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [reportTarget, setReportTarget] = useState(null);
  const [toast, setToast] = useState('');

  // State owned by the OLD-style tab UI.
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', students: [] });
  const [docSubTab, setDocSubTab] = useState('demande');
  const [selectedModuleSpec, setSelectedModuleSpec] = useState('');

  const hasPresidentMembership = useMemo(
    () =>
      Array.isArray(user?.memberships) &&
      user.memberships.some(
        (membership) => String(membership?.role || '').toLowerCase() === 'president'
      ),
    [user]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingOverview(true);
        const response = await teacherDashboardService.getOverview();
        if (!cancelled) setOverview(response?.data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load dashboard.');
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingStudents(true);
        const response = await teacherDashboardService.listStudents({ limit: 200 });
        if (!cancelled) setStudents(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        if (!cancelled) {
          setStudents([]);
          setError(err?.message || 'Failed to load students.');
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await teacherDashboardService.getDisciplinaryCases();
        if (!cancelled) {
          setDisciplinaryCases(Array.isArray(response?.data) ? response.data : []);
        }
      } catch {
        // Non-critical: chart will show empty state
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const courses = overview?.courses ?? [];
  const recentAnnouncements = overview?.recentAnnouncements ?? [];
  const recentReclamations = overview?.recentReclamations ?? [];
  const summary = overview?.summary ?? null;

  // ── Overview tab — charts derived from NEW data ───────────────────────
  const chartsData = useMemo(() => {
    const docStatusData = summary
      ? [
          { name: 'Pending', value: summary.pendingDocuments ?? 0 },
          { name: 'Processing', value: summary.processingDocuments ?? 0 },
          { name: 'Approved', value: summary.approvedDocuments ?? 0 },
          { name: 'Rejected', value: summary.rejectedDocuments ?? 0 },
        ].filter((d) => d.value > 0)
      : [];

    return {
      coursesByPromo: countBy(courses, (c) => c.promoName),
      documentsByStatus: docStatusData,
      reclamationsByStatus: [
        { name: 'Pending', value: summary?.pendingReclamations ?? 0 },
        { name: 'Resolved', value: Math.max(0, (summary?.reclamations ?? 0) - (summary?.pendingReclamations ?? 0)) },
      ].filter((d) => d.value > 0),
      conseilDisciplineByType: countBy(
        disciplinaryCases,
        (d) => DISCIPLINE_STATUS_LABEL[d.status] || d.status || 'Unknown',
      ),
    };
  }, [courses, summary, disciplinaryCases]);

  // ── PFE tab — no NEW endpoint; show zeroed placeholders in OLD structure ─
  const pfeData = useMemo(() => ({
    stats: { totalThemes: 0, totalStudents: 0 },
    diversity: [],
    statusDistribution: [],
    themes: [],
  }), []);

  // ── Module tab — group courses by promo/speciality ────────────────────
  const modulesData = useMemo(() => {
    const byPromo = new Map();
    for (const course of courses) {
      const key = String(course.promoId ?? 'na');
      if (!byPromo.has(key)) {
        byPromo.set(key, {
          id: key,
          name: course.promoName || 'Unassigned',
          modules: [],
        });
      }
      const studentsInPromo = students.filter(
        (s) => String(s.promo?.id) === String(course.promoId)
      );
      byPromo.get(key).modules.push({
        id: course.moduleId,
        name: course.moduleName,
        code: course.moduleCode,
        sections: {
          cours: { count: studentsInPromo.length, students: studentsInPromo.map(mapStudentForModal) },
          td: { count: 0, students: [] },
          tp: { count: 0, students: [] },
        },
      });
    }
    return Array.from(byPromo.values());
  }, [courses, students]);

  useEffect(() => {
    if (!selectedModuleSpec && modulesData.length > 0) {
      setSelectedModuleSpec(String(modulesData[0].id));
    }
  }, [modulesData, selectedModuleSpec]);

  // ── Jury tab — no NEW endpoint ────────────────────────────────────────
  const juryData = useMemo(() => ({
    summary: { totalThemes: 0 },
    themes: [],
  }), []);

  const loading = loadingOverview || loadingStudents;

  const handleReport = (student) => {
    setReportTarget(student);
    setModalOpen(false);
  };

  // ── Render helpers for each tab ───────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6 mt-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Students" value={summary?.students ?? 0} accent="brand" />
        <KpiCard label="Courses" value={summary?.courses ?? 0} accent="success" />
        <KpiCard label="Doc Requests" value={summary?.documents ?? 0} accent="warning" />
        <KpiCard label="Reclamations" value={summary?.reclamations ?? 0} accent="danger" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Courses by Promo" data={chartsData.coursesByPromo} variant="bar" color="#00C49F" />
        <ChartCard title="Document Requests by Status" data={chartsData.documentsByStatus} variant="bar" color="#FFBB28" />
        <ChartCard title="Reclamations" data={chartsData.reclamationsByStatus} variant="pie" palette={['#FFBB28', '#00C49F']} />
        <ChartCard title="Disciplinary Cases" data={chartsData.conseilDisciplineByType} variant="bar" color="#FF8042" />
      </div>

      {/* Recent Reclamations */}
      {recentReclamations.length > 0 && (
        <div className="bg-surface rounded-lg border border-edge shadow-card overflow-hidden">
          <h3 className="px-6 py-4 text-sm font-semibold text-ink border-b border-edge">Recent Reclamations</h3>
          <ul className="divide-y divide-edge">
            {recentReclamations.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-6 py-3 text-sm hover:bg-brand/5">
                <div>
                  <p className="font-medium text-ink">{r.title || r.type || 'Request'}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">{r.student?.fullName || ''}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  r.status === 'approved' ? 'bg-success/10 text-success' :
                  r.status === 'rejected' ? 'bg-danger/10 text-danger' :
                  'bg-warning/10 text-warning'
                }`}>{r.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderDocument = () => (
    <div className="mt-6 space-y-4">
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setDocSubTab('demande')}
          className={`px-4 py-2 rounded-md ${docSubTab === 'demande' ? 'bg-brand text-white' : 'bg-edge/20 text-ink'}`}
        >
          Demandes
        </button>
        <button
          onClick={() => setDocSubTab('remise')}
          className={`px-4 py-2 rounded-md ${docSubTab === 'remise' ? 'bg-brand text-white' : 'bg-edge/20 text-ink'}`}
        >
          Remise des Copies
        </button>
      </div>
      {docSubTab === 'demande' ? (
        <div className="bg-surface rounded-lg border border-edge shadow-card p-6 flex flex-col items-center justify-center space-y-4">
          <p className="text-ink-tertiary">Manage your document requests through the standard system.</p>
          <button
            onClick={() => navigate('/dashboard/documents')}
            className="px-4 py-2 bg-brand text-white rounded-md"
          >
            Go to Document Management
          </button>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-edge shadow-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-edge/20 text-ink-secondary text-sm">
              <tr>
                <th className="p-4 border-b border-edge font-medium">Module</th>
                <th className="p-4 border-b border-edge font-medium">Promo</th>
                <th className="p-4 border-b border-edge font-medium">Session</th>
                <th className="p-4 border-b border-edge font-medium">Exam Date</th>
                <th className="p-4 border-b border-edge font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <td colSpan="5" className="p-8 text-center text-ink-tertiary">
                  No pending documents.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPfe = () => (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg border border-edge shadow-card p-6 flex flex-col">
          <span className="text-sm text-ink-secondary uppercase font-semibold tracking-wider">Total Themes</span>
          <span className="text-3xl font-bold text-brand mt-2">{pfeData.stats.totalThemes}</span>
        </div>
        <div className="bg-surface rounded-lg border border-edge shadow-card p-6 flex flex-col">
          <span className="text-sm text-ink-secondary uppercase font-semibold tracking-wider">Total Students</span>
          <span className="text-3xl font-bold text-success mt-2">{pfeData.stats.totalStudents}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Diversity by Speciality" data={pfeData.diversity} variant="pie" palette={CHART_PALETTE} />
        <ChartCard title="Theme Status" data={pfeData.statusDistribution} variant="bar" color="#8884d8" />
      </div>

      <div className="bg-surface rounded-lg border border-edge shadow-card overflow-hidden">
        <h3 className="p-6 text-lg font-bold border-b border-edge">Proposed Themes</h3>
        <table className="w-full text-left border-collapse">
          <thead className="bg-edge/20 text-ink-secondary text-sm">
            <tr>
              <th className="p-4 border-b border-edge font-medium">Title</th>
              <th className="p-4 border-b border-edge font-medium">Type</th>
              <th className="p-4 border-b border-edge font-medium">Speciality</th>
              <th className="p-4 border-b border-edge font-medium">Status</th>
              <th className="p-4 border-b border-edge font-medium">Students</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {pfeData.themes.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-ink-tertiary">
                  No themes found.
                </td>
              </tr>
            ) : (
              pfeData.themes.map((theme) => (
                <tr key={theme.id} className="hover:bg-edge/10">
                  <td className="p-4 border-b border-edge font-medium">{theme.title}</td>
                  <td className="p-4 border-b border-edge capitalize">{theme.type}</td>
                  <td className="p-4 border-b border-edge">{theme.specialite}</td>
                  <td className="p-4 border-b border-edge">
                    <span
                      className={`px-2 py-1 text-xs rounded-full uppercase tracking-wider font-semibold ${
                        theme.status === 'en_attente'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-success/20 text-success'
                      }`}
                    >
                      {String(theme.status || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 border-b border-edge font-bold">{theme.studentsCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderModule = () => {
    if (modulesData.length === 0) {
      return <div className="p-8 text-center text-ink-tertiary">No modules assigned.</div>;
    }
    const currentSpec = modulesData.find((m) => String(m.id) === String(selectedModuleSpec));

    return (
      <div className="mt-6 space-y-6">
        <div className="flex items-center gap-4">
          <label className="font-medium text-ink">Speciality:</label>
          <select
            value={selectedModuleSpec}
            onChange={(e) => setSelectedModuleSpec(e.target.value)}
            className="border border-edge rounded-md px-3 py-2 bg-surface text-sm w-64"
          >
            {modulesData.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.name}
              </option>
            ))}
          </select>
        </div>

        {currentSpec &&
          currentSpec.modules.map((mod) => (
            <div key={mod.id} className="bg-surface rounded-lg border border-edge shadow-card p-6">
              <h3 className="text-xl font-bold mb-4 text-brand">
                {mod.name} <span className="text-ink-tertiary text-sm ml-2">({mod.code})</span>
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'cours', label: 'Cours' },
                  { key: 'td', label: 'TD' },
                  { key: 'tp', label: 'TP' },
                ].map((section) => {
                  const slot = mod.sections[section.key];
                  const active = slot.count > 0;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setModalData({
                            title: `${mod.name} — ${section.label}`,
                            students: slot.students,
                          });
                          setModalOpen(true);
                        }
                      }}
                      className={`p-4 rounded-md border border-edge flex flex-col items-center transition-colors ${
                        active
                          ? 'bg-edge/10 hover:bg-edge/20 cursor-pointer'
                          : 'bg-surface-200 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <span className="uppercase text-xs font-bold text-ink-secondary tracking-wider">
                        {section.label}
                      </span>
                      <span className="text-2xl font-bold mt-2">
                        {slot.count}{' '}
                        <span className="text-sm font-normal text-ink-tertiary">students</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    );
  };

  const renderJury = () => (
    <div className="mt-6 space-y-6">
      <div className="bg-surface rounded-lg border border-edge shadow-card p-6 inline-flex flex-col">
        <span className="text-sm text-ink-secondary uppercase font-semibold tracking-wider">
          Total Jury Themes
        </span>
        <span className="text-3xl font-bold text-brand mt-2">{juryData.summary.totalThemes}</span>
      </div>

      <div className="bg-surface rounded-lg border border-edge shadow-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-edge/20 text-ink-secondary text-sm">
            <tr>
              <th className="p-4 border-b border-edge font-medium">Theme</th>
              <th className="p-4 border-b border-edge font-medium">Roles</th>
              <th className="p-4 border-b border-edge font-medium">Date</th>
              <th className="p-4 border-b border-edge font-medium">Salle</th>
              <th className="p-4 border-b border-edge font-medium">Students</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {juryData.themes.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-ink-tertiary">
                  No jury themes found.
                </td>
              </tr>
            ) : (
              juryData.themes.map((theme) => (
                <tr key={theme.id} className="hover:bg-edge/10">
                  <td className="p-4 border-b border-edge font-medium">{theme.title}</td>
                  <td className="p-4 border-b border-edge">
                    <div className="flex gap-2 flex-wrap">
                      {(theme.roles || []).map((r) => (
                        <span
                          key={r}
                          className="px-2 py-1 bg-brand/10 text-brand text-xs rounded-md font-semibold"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 border-b border-edge">
                    {theme.date ? new Date(theme.date).toLocaleDateString() : 'TBD'}
                  </td>
                  <td className="p-4 border-b border-edge">{theme.salle || 'TBD'}</td>
                  <td className="p-4 border-b border-edge">
                    {(theme.students || []).map((s) => (
                      <div key={s}>{s}</div>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <ProfileHeader profile={user} />

      {hasPresidentMembership && (
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/dashboard/discipline/president')}
            className="px-4 py-2 text-sm font-medium text-surface bg-brand rounded-md hover:bg-brand-hover transition-colors"
          >
            Open Decision Panel
          </button>
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {toast && (
        <div className="bg-success/10 border border-success/30 text-success text-sm px-4 py-3 rounded-md">
          {toast}
        </div>
      )}

      <nav
        className="flex items-center gap-1 border-b border-edge overflow-x-auto"
        role="tablist"
        aria-label="Teacher dashboard sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-tertiary hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {loading && (
        <div className="py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'document' && renderDocument()}
          {activeTab === 'pfe' && renderPfe()}
          {activeTab === 'module' && renderModule()}
          {activeTab === 'jury' && renderJury()}
        </>
      )}

      <StudentListModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        students={modalData.students}
        onReport={handleReport}
      />

      <ReportStudentModal
        student={reportTarget}
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        onSubmitted={() => {
          setToast('Report submitted. Case created for review.');
          window.setTimeout(() => setToast(''), 4000);
        }}
      />
    </div>
  );
}

function KpiCard({ label, value, accent = 'brand' }) {
  const tones = {
    brand:   { bg: 'bg-brand/10',   text: 'text-brand' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    danger:  { bg: 'bg-danger/10',  text: 'text-danger' },
  };
  const tone = tones[accent] || tones.brand;
  return (
    <div className={`${tone.bg} rounded-xl border border-edge p-4 flex flex-col gap-1`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${tone.text}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, data, variant, color, palette, offset = 0 }) {
  const isEmpty = !Array.isArray(data) || data.length === 0 || data.every((d) => !d.value);

  return (
    <div className="bg-surface rounded-lg border border-edge shadow-card p-6">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <div className="h-64">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-sm text-ink-tertiary">
            No data available
          </div>
        ) : variant === 'pie' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={(palette || CHART_PALETTE)[(i + offset) % (palette || CHART_PALETTE).length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={color || '#00C49F'} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function mapStudentForModal(student) {
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ')
    || student.fullName
    || [student.prenom, student.nom].filter(Boolean).join(' ')
    || `Student #${student.id}`;
  return {
    id: student.id,
    matricule: student.matricule || student.cne || String(student.id),
    name: fullName,
    firstName: student.firstName || student.prenom,
    lastName: student.lastName || student.nom,
    nom: student.lastName || student.nom,
    prenom: student.firstName || student.prenom,
    promo: student.promo,
  };
}

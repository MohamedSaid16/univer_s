/*
  AdminUserStatsPage — read-only inspection of any student's or teacher's
  dashboard from an admin context.

  Renders the SAME components the user sees on their own dashboard:
    • student → KPICards, AlertsList, DashboardCharts, ProfileCard,
      GroupePromoCard, PfeInfoCard, CoursesGrid
    • teacher → ProfileHeader, KPITile row, recent activity lists

  Data comes from GET /api/v1/admin/user/:id/stats which delegates to the
  existing dashboard services — zero duplication of statistics logic.
*/

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { adminPanelAPI } from '../../services/api';

import ProfileCard from '../../components/dashboard/student/ProfileCard';
import GroupePromoCard from '../../components/dashboard/student/GroupePromoCard';
import CoursesGrid from '../../components/dashboard/student/CoursesGrid';
import KPICards from '../../components/dashboard/student/KPICards';
import AlertsList from '../../components/dashboard/student/AlertsList';
import DashboardCharts from '../../components/dashboard/student/Charts';
import PfeInfoCard from '../../components/dashboard/student/PfeInfoCard';
import KPITile from '../../components/dashboard/KPITile';
import EmptyState from '../../components/dashboard/EmptyState';

/* ── Shared chart helpers for teacher inspection ─────────────── */

const CHART_PALETTE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-edge rounded-lg shadow-md px-3 py-2 text-xs">
      {label && <p className="font-semibold text-ink mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="tabular-nums">
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

function TeacherChartCard({ title, data, variant = 'bar', color = '#0088FE', palette }) {
  return (
    <div className="bg-surface rounded-lg border border-edge shadow-card overflow-hidden">
      <h3 className="px-5 py-4 text-sm font-semibold text-ink border-b border-edge">{title}</h3>
      <div className="p-4">
        {!data || data.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">
            No data
          </div>
        ) : variant === 'bar' ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-edge, #e6e8eb)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-ink-secondary, #4b5160)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-ink-tertiary, #7c8294)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={72}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={(palette || CHART_PALETTE)[i % (palette || CHART_PALETTE).length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const PFE_STATUS_TO_CHART_LABEL = {
  draft: 'Not selected',
  assigned: 'Pending approval',
  finalized: 'Approved',
};

function deriveStudentStats(summary, pfe) {
  if (!summary) return null;
  const complaintsTotal = summary.reclamations ?? 0;
  const complaintsPending = summary.pendingReclamations ?? 0;
  const complaintsTreated = Math.max(0, complaintsTotal - complaintsPending);
  const justificationsTotal = summary.justifications ?? 0;
  const justificationsPending = summary.pendingJustifications ?? 0;
  const justificationsTreated = summary.treatedJustifications ?? Math.max(0, justificationsTotal - justificationsPending);
  const pfeChartLabel = pfe?.hasPfe
    ? PFE_STATUS_TO_CHART_LABEL[pfe.assignmentStatus] || 'Not selected'
    : 'Not selected';
  const disciplineOpen = summary.disciplineOpenCases ?? 0;
  const disciplineClosed = summary.disciplineClosedCases ?? 0;
  const hasDiscipline = disciplineOpen > 0 || disciplineClosed > 0;
  const disciplineStatus = hasDiscipline
    ? (disciplineOpen > 0 ? 'Under Review' : 'Sanctioned')
    : 'Clean';

  return {
    kpis: {
      justifications: {
        total: justificationsTotal,
        treated: justificationsTreated,
        pending: justificationsPending,
      },
      complaints: { total: complaintsTotal, treated: complaintsTreated, pending: complaintsPending },
    },
    charts: {
      pfeStatus: pfeChartLabel,
      disciplineStatus: disciplineStatus,
      disciplineCounts: { underReview: disciplineOpen, sanctioned: disciplineClosed },
    },
  };
}

function deriveStudentAlerts(summary) {
  if (!summary) return [];
  const alerts = [];
  const pending = summary.pendingReclamations ?? 0;
  if (pending > 0) {
    alerts.push({
      type: 'warning',
      message: `This student has ${pending} pending request${pending === 1 ? '' : 's'} awaiting review.`,
    });
  }
  return alerts;
}

function InspectionBanner({ target }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-md bg-brand/5 border border-brand/20">
      <Eye className="w-5 h-5 shrink-0 text-brand mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-brand">
          Inspecting as admin — read-only view
        </p>
        <p className="text-xs text-ink-secondary mt-0.5">
          You are viewing the dashboard exactly as {target?.fullName || 'this user'} sees
          it. No actions are available from this screen.
        </p>
      </div>
    </div>
  );
}

function StudentInspection({ dashboard }) {
  const summary = dashboard?.summary ?? null;
  const pfe = dashboard?.pfe ?? null;
  const profile = dashboard?.profile ?? null;
  const courses = Array.isArray(dashboard?.modules) ? dashboard.modules : [];

  const stats = useMemo(() => deriveStudentStats(summary, pfe), [summary, pfe]);
  const alerts = useMemo(() => deriveStudentAlerts(summary), [summary]);

  return (
    <>
      <AlertsList alerts={alerts} />
      <KPICards stats={stats} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfileCard profile={profile} />
        <GroupePromoCard promo={profile?.promo} />
      </section>

      <PfeInfoCard pfe={pfe} />

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-semibold text-ink">Courses</h2>
          <span className="text-xs text-ink-tertiary">
            {courses.length} module{courses.length === 1 ? '' : 's'}
          </span>
        </div>
        <CoursesGrid courses={courses} />
      </section>

      <section>
        <DashboardCharts stats={stats} />
      </section>
    </>
  );
}

function RecentList({ title, items, emptyMessage, render }) {
  return (
    <section className="bg-surface rounded-lg border border-edge shadow-card p-5">
      <h3 className="text-sm font-semibold text-ink mb-3">{title}</h3>
      {(!items || items.length === 0) ? (
        <p className="text-sm text-ink-tertiary">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-edge">
          {items.map((item, idx) => (
            <li key={item.id ?? idx} className="py-3 first:pt-0 last:pb-0">
              {render(item)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeacherInspection({ dashboard }) {
  const summary = dashboard?.summary ?? {};
  const recentAnnouncements = dashboard?.recentAnnouncements ?? [];
  const recentReclamations = dashboard?.recentReclamations ?? [];
  const pfeBreakdown = dashboard?.pfeBreakdown ?? [];

  const chartsData = useMemo(() => ({
    studentsPerPfeGroup: pfeBreakdown.map((g) => ({
      name: g.groupName,
      value: g.studentCount ?? 0,
    })),
    pfeProjectsByStatus: [
      { name: 'Active',    value: summary.activePfeProjects    ?? 0 },
      { name: 'Finalized', value: summary.finalizedPfeProjects ?? 0 },
    ].filter((d) => d.value > 0),
    documentsByStatus: [
      { name: 'Pending',    value: summary.pendingDocuments    ?? 0 },
      { name: 'Processing', value: summary.processingDocuments ?? 0 },
      { name: 'Approved',   value: summary.approvedDocuments   ?? 0 },
      { name: 'Rejected',   value: summary.rejectedDocuments   ?? 0 },
    ].filter((d) => d.value > 0),
    reclamationsByStatus: [
      { name: 'Pending',  value: summary.pendingReclamations ?? 0 },
      { name: 'Resolved', value: Math.max(0, (summary.reclamations ?? 0) - (summary.pendingReclamations ?? 0)) },
    ].filter((d) => d.value > 0),
  }), [pfeBreakdown, summary]);

  const hasDocuments = (summary.documents ?? 0) > 0;

  return (
    <>
      {/* ── KPI row 1 ──────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Supervised students"
          value={summary.supervisedStudents ?? summary.students ?? 0}
          subtitle={`Across ${summary.pfeGroups ?? 0} PFE group${(summary.pfeGroups ?? 0) === 1 ? '' : 's'}`}
          accent="brand"
        />
        <KPITile
          title="PFE projects"
          value={summary.pfeProjects ?? 0}
          subtitle={`${summary.activePfeProjects ?? 0} active · ${summary.finalizedPfeProjects ?? 0} finalized`}
          accent="success"
        />
        <KPITile
          title="Doc Requests"
          value={summary.documents ?? 0}
          subtitle={`${summary.pendingDocuments ?? 0} pending`}
          accent="warning"
        />
        <KPITile
          title="Reclamations"
          value={summary.reclamations ?? 0}
          subtitle={`${summary.pendingReclamations ?? 0} pending`}
          accent="danger"
        />
      </section>

      {/* ── KPI row 2 — document details ─────────────────── */}
      {hasDocuments && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPITile title="Pending docs"    value={summary.pendingDocuments    ?? 0} subtitle="Awaiting processing" accent="warning" />
          <KPITile title="Processing"      value={summary.processingDocuments ?? 0} subtitle="Under review"        accent="brand"   />
          <KPITile title="Approved docs"   value={summary.approvedDocuments   ?? 0} subtitle="Delivered"           accent="success" />
          <KPITile title="Rejected docs"   value={summary.rejectedDocuments   ?? 0} subtitle="Declined"            accent="danger"  />
        </section>
      )}

      {/* ── Charts ───────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeacherChartCard
          title="Students per PFE Group"
          data={chartsData.studentsPerPfeGroup}
          variant="bar"
          color="#0088FE"
        />
        <TeacherChartCard
          title="PFE Projects"
          data={chartsData.pfeProjectsByStatus}
          variant="pie"
          palette={['#FFBB28', '#00C49F']}
        />
        <TeacherChartCard
          title="Document Requests by Status"
          data={chartsData.documentsByStatus}
          variant="bar"
          color="#FFBB28"
        />
        <TeacherChartCard
          title="Reclamations — Pending vs Resolved"
          data={chartsData.reclamationsByStatus}
          variant="pie"
          palette={['#FFBB28', '#00C49F']}
        />
      </section>

      {/* ── Recent activity ──────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentList
          title="Recent announcements"
          items={recentAnnouncements}
          emptyMessage="No announcements yet."
          render={(item) => (
            <div>
              <p className="text-sm font-medium text-ink line-clamp-1">
                {item.title || item.titre_en || item.titre_ar || 'Untitled'}
              </p>
              <p className="text-xs text-ink-tertiary mt-0.5">
                {item.module?.name || item.type?.nom_en || item.type?.nom_ar || ''}
                {item.updatedAt ? ` · ${new Date(item.updatedAt).toLocaleDateString()}` : ''}
              </p>
            </div>
          )}
        />
        <RecentList
          title="Recent reclamations"
          items={recentReclamations}
          emptyMessage="No requests in scope."
          render={(item) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink line-clamp-1">
                  {item.title || 'Request'}
                </p>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  {item.student?.fullName ? `From ${item.student.fullName}` : ''}
                </p>
              </div>
              {item.status && (
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  item.status === 'approved' || item.status === 'traitee'
                    ? 'bg-success/10 text-success'
                    : item.status === 'rejected' || item.status === 'refusee'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-warning/10 text-warning'
                }`}>
                  {item.status}
                </span>
              )}
            </div>
          )}
        />
      </section>

      {/* ── Supervised PFE groups ───────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-semibold text-ink">Supervised PFE groups</h2>
          <span className="text-xs text-ink-tertiary">
            {pfeBreakdown.length} group{pfeBreakdown.length === 1 ? '' : 's'}
          </span>
        </div>
        {pfeBreakdown.length === 0 ? (
          <EmptyState
            title="No PFE groups supervised"
            description="This teacher is not co-supervising any PFE groups."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pfeBreakdown.map((group) => (
              <div
                key={group.groupId}
                className="bg-surface rounded-lg border border-edge shadow-sm p-4"
              >
                <p className="text-sm font-semibold text-ink line-clamp-1">{group.groupName}</p>
                {group.subjectTitle ? (
                  <p className="text-xs text-ink-tertiary mt-1 line-clamp-2">{group.subjectTitle}</p>
                ) : null}
                <p className="text-xs text-ink-tertiary mt-1">
                  {group.studentCount ?? 0} student{(group.studentCount ?? 0) === 1 ? '' : 's'}
                  {group.isFinalized ? ' · finalized' : ' · active'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function AdminUserStatsPage() {
  const { id } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const response = await adminPanelAPI.getUserStats(id);
        if (!cancelled) setPayload(response?.data || null);
      } catch (err) {
        if (!cancelled) {
          setPayload(null);
          setError(err?.message || 'Failed to load user stats.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const target = payload?.user ?? null;
  const role = payload?.role ?? null;
  const dashboard = payload?.dashboard ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/admin/analytics"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to analytics
        </Link>
      </div>

      <header className="bg-surface rounded-lg border border-edge shadow-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
          {role === 'student' ? 'Student inspection' : role === 'teacher' ? 'Teacher inspection' : 'User inspection'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {target?.fullName || 'Loading…'}
        </h1>
        {target?.email && (
          <p className="mt-1 text-sm text-ink-tertiary">{target.email}</p>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-edge-strong border-t-brand rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          <InspectionBanner target={target} />
          {role === 'student' && <StudentInspection dashboard={dashboard} />}
          {role === 'teacher' && <TeacherInspection dashboard={dashboard} />}
          {role !== 'student' && role !== 'teacher' && (
            <EmptyState
              title="No dashboard available"
              description="This user has neither a student nor a teacher profile."
            />
          )}
        </>
      )}
    </div>
  );
}

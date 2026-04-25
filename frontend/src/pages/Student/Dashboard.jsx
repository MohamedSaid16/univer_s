/*
  StudentDashboard — read-only home for students.

  Logic and API calls unchanged: single call to studentDashboardService.getOverview(),
  which is backed by /api/v1/student/panel/dashboard.
  UI structure mirrors the OLD friend-version layout (header + alerts + KPIs +
  profile/promo grid + courses + charts).

  The `stats` object consumed by KPICards + DashboardCharts is DERIVED from the
  NEW backend's `summary` shape — we never call the OLD getStats / getAlerts
  endpoints (they do not exist on this backend).
*/

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProfileCard from '../../components/dashboard/student/ProfileCard';
import GroupePromoCard from '../../components/dashboard/student/GroupePromoCard';
import CoursesGrid from '../../components/dashboard/student/CoursesGrid';
import KPICards from '../../components/dashboard/student/KPICards';
import AlertsList from '../../components/dashboard/student/AlertsList';
import DashboardCharts from '../../components/dashboard/student/Charts';
import PfeInfoCard from '../../components/dashboard/student/PfeInfoCard';
import { studentDashboardService } from '../../services/studentDashboard';

const PFE_STATUS_TO_CHART_LABEL = {
  draft: 'Not selected',
  assigned: 'Pending approval',
  finalized: 'Approved',
};

function deriveStats(summary, pfe) {
  if (!summary) return null;

  const complaintsTotal = summary.reclamations ?? 0;
  const complaintsPending = summary.pendingReclamations ?? 0;
  const complaintsTreated = Math.max(0, complaintsTotal - complaintsPending);

  const justificationsTotal = summary.justifications ?? 0;
  const justificationsPending = summary.pendingJustifications ?? 0;
  const justificationsTreated = summary.treatedJustifications ?? 0;

  const disciplineOpen = summary.disciplineOpenCases ?? 0;
  const disciplineClosed = summary.disciplineClosedCases ?? 0;
  
  const hasDiscipline = disciplineOpen > 0 || disciplineClosed > 0;
  const disciplineStatus = hasDiscipline 
    ? (disciplineOpen > 0 ? 'Under Review' : 'Sanctioned')
    : 'Clean';

  const pfeChartLabel = pfe?.hasPfe
    ? PFE_STATUS_TO_CHART_LABEL[pfe.assignmentStatus] || 'Not selected'
    : 'Not selected';

  return {
    kpis: {
      justifications: { 
        total: justificationsTotal, 
        treated: justificationsTreated, 
        pending: justificationsPending 
      },
      complaints: {
        total: complaintsTotal,
        treated: complaintsTreated,
        pending: complaintsPending,
      },
    },
    charts: {
      pfeStatus: pfeChartLabel,
      disciplineStatus: disciplineStatus,
      disciplineCounts: { 
        underReview: disciplineOpen, 
        sanctioned: disciplineClosed 
      },
    },
  };
}

function deriveAlerts(summary) {
  if (!summary) return [];
  const alerts = [];
  const pending = summary.pendingReclamations ?? 0;
  if (pending > 0) {
    alerts.push({
      type: 'warning',
      message: `You have ${pending} pending request${pending === 1 ? '' : 's'} awaiting review.`,
    });
  }
  return alerts;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await studentDashboardService.getOverview();
        if (!cancelled) setData(response?.data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load your dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = data?.summary ?? null;
  const pfe = data?.pfe ?? null;
  const stats = useMemo(() => deriveStats(summary, pfe), [summary, pfe]);
  const alerts = useMemo(() => deriveAlerts(summary), [summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-edge-strong border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  const profile = data?.profile;
  const courses = Array.isArray(data?.modules) ? data.modules : [];
  const greetingName = profile?.prenom || user?.prenom || 'Student';

  return (
    <div className="space-y-6">
      <header className="bg-surface rounded-lg border border-edge shadow-card p-6">
        <h1 className="text-xl font-bold text-ink tracking-tight">
          Welcome, {greetingName}
        </h1>
        <p className="mt-2 text-sm text-ink-tertiary">
          Your personal dashboard — read-only overview of your academic profile.
        </p>
      </header>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <AlertsList alerts={alerts} />

      <KPICards stats={stats} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfileCard profile={profile} />
        <GroupePromoCard promo={profile?.promo} />
      </section>

      <PfeInfoCard pfe={pfe} />

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-semibold text-ink">Your courses</h2>
          <span className="text-xs text-ink-tertiary">
            {courses.length} module{courses.length === 1 ? '' : 's'}
          </span>
        </div>
        <CoursesGrid courses={courses} />
      </section>

      <section>
        <DashboardCharts stats={stats} />
      </section>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const inputClass = 'w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30';

function hasAdminAccess(roles) {
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => String(r || '').toLowerCase() === 'admin');
}

export default function AdminAcademicAssignmentsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const canAccess = useMemo(() => hasAdminAccess(user?.roles), [user?.roles]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState({ promos: [], students: [] });
  const [savingStudentByUserId, setSavingStudentByUserId] = useState({});
  const [studentPromoByUserId, setStudentPromoByUserId] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.adminGetAcademicAssignments();
      const payload = response?.data || {};
      const normalized = {
        promos: Array.isArray(payload.promos) ? payload.promos : [],
        students: Array.isArray(payload.students) ? payload.students : [],
      };
      setData(normalized);

      setStudentPromoByUserId(
        Object.fromEntries(normalized.students.map((student) => [student.userId, student.promoId ? String(student.promoId) : '']))
      );
    } catch (err) {
      setError(err.message || 'Failed to load assignments data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    loadData();
  }, [canAccess]);

  const saveStudentAssignment = async (userId) => {
    const promoId = Number(studentPromoByUserId[userId]);
    if (!promoId) {
      setError('Select a promo for the student.');
      return;
    }

    setSavingStudentByUserId((prev) => ({ ...prev, [userId]: true }));
    setError('');
    setMessage('');
    try {
      await authAPI.adminAssignStudentPromo(userId, promoId);
      setMessage('Student promo assignment saved.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to assign student promo.');
    } finally {
      setSavingStudentByUserId((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (authLoading || loading) {
    return <div className="rounded-2xl border border-edge bg-surface p-6">Loading assignments...</div>;
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-tertiary">Administration</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Academic Assignments</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Link students to promos. Teacher↔course assignment is no longer used; teacher scope is derived from PFE supervision.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-canvas px-3 py-1 text-ink-secondary">
                <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} />
                {data.students.length} students
              </span>
            </div>
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

      <section className="rounded-2xl border border-edge bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <GraduationCap className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Student Assignments</h2>
            <p className="text-sm text-ink-secondary">Assign each student to a promo, section, or group.</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-edge">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-edge-subtle bg-canvas/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Promo / Section</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={`student-${student.userId}`} className="border-b border-edge-subtle transition-colors hover:bg-canvas/40 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-ink">{student.prenom} {student.nom}</td>
                  <td className="px-4 py-3 text-ink-secondary">{student.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className={inputClass}
                      value={studentPromoByUserId[student.userId] || ''}
                      onChange={(e) => setStudentPromoByUserId((prev) => ({ ...prev, [student.userId]: e.target.value }))}
                    >
                      <option value="">Select promo</option>
                      {data.promos.map((promo) => (
                        <option key={`student-promo-${student.userId}-${promo.id}`} value={promo.id}>
                          {(promo.nom || `Promo ${promo.id}`)} | {promo.section || '-'} | {promo.anneeUniversitaire || '-'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={!!savingStudentByUserId[student.userId]}
                      onClick={() => saveStudentAssignment(student.userId)}
                      className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-surface shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
                    >
                      {savingStudentByUserId[student.userId] ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}


import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  Gavel,
  Loader2,
  Users,
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { pfeAdminAPI } from '../../services/pfe';

const SUBJECT_STATUS_CLASS = {
  propose: 'bg-amber-100 text-amber-800 border border-amber-200',
  valide: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  reserve: 'bg-blue-100 text-blue-800 border border-blue-200',
  affecte: 'bg-violet-100 text-violet-800 border border-violet-200',
  rejete: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const CHOICE_STATUS_CLASS = {
  en_attente: 'bg-amber-100 text-amber-800 border border-amber-200',
  accepte: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  refuse: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const TABS = [
  { id: 'subjects', label: 'Subjects', Icon: GraduationCap },
  { id: 'groups', label: 'Groups', Icon: Users },
  { id: 'choices', label: 'Choices', Icon: ClipboardList },
  { id: 'jury', label: 'Jury', Icon: Gavel },
];

const DEFAULT_SUBJECT_FORM = {
  titre: '',
  description: '',
  enseignantId: '',
  promoId: '',
  type_projet: 'application',
  max_grps: 1,
};

const DEFAULT_GROUP_FORM = {
  nom: '',
  sujetFinalId: '',
  coEncadrantId: '',
};

const DEFAULT_MEMBER_FORM = {
  groupId: '',
  etudiantId: '',
  role: 'membre',
};

const DEFAULT_CHOICE_FORM = {
  groupId: '',
  sujetId: '',
  ordre: 1,
};

const DEFAULT_JURY_FORM = {
  groupId: '',
  enseignantId: '',
  role: 'examinateur',
};

const ROLE_OPTIONS = ['president', 'examinateur', 'rapporteur'];

const normalizeRoles = (roles) =>
  Array.isArray(roles)
    ? roles.map((role) => String(role || '').toLowerCase())
    : [];

const getErrorMessage = (error, fallback) => {
  if (error && typeof error === 'object' && 'message' in error && error.message) {
    return String(error.message);
  }
  return fallback;
};

const getStatusClass = (status, map) => map[status] || 'bg-slate-100 text-slate-700 border border-slate-200';

const userLabel = (user) => `${user?.prenom || ''} ${user?.nom || ''} (${user?.email || 'no-email'})`.trim();

const promoLabel = (promo) => promo?.nom_ar || promo?.nom_en || promo?.nom || `Promo ${promo?.id}`;

const subjectLabel = (subject) => subject?.titre || subject?.titre_ar || subject?.titre_en || `Sujet ${subject?.id}`;

const groupLabel = (group) => group?.nom || group?.nom_ar || group?.nom_en || `Groupe ${group?.id}`;

export default function PfeManagementPage() {
  const [activeTab, setActiveTab] = useState('subjects');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [choices, setChoices] = useState([]);
  const [jury, setJury] = useState([]);

  const [promos, setPromos] = useState([]);
  const [users, setUsers] = useState([]);

  const [subjectForm, setSubjectForm] = useState(DEFAULT_SUBJECT_FORM);
  const [groupForm, setGroupForm] = useState(DEFAULT_GROUP_FORM);
  const [memberForm, setMemberForm] = useState(DEFAULT_MEMBER_FORM);
  const [choiceForm, setChoiceForm] = useState(DEFAULT_CHOICE_FORM);
  const [juryForm, setJuryForm] = useState(DEFAULT_JURY_FORM);
  const [juryRoleDrafts, setJuryRoleDrafts] = useState({});

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const teachers = useMemo(
    () => users.filter((user) => normalizeRoles(user.roles).includes('enseignant')),
    [users]
  );

  const students = useMemo(
    () => users.filter((user) => normalizeRoles(user.roles).includes('etudiant')),
    [users]
  );

  const pendingSubjects = useMemo(
    () => subjects.filter((subject) => subject.status === 'propose').length,
    [subjects]
  );

  const refreshData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    const requests = await Promise.allSettled([
      pfeAdminAPI.listSujets(),
      pfeAdminAPI.listGroups(),
      pfeAdminAPI.listChoices(),
      pfeAdminAPI.listJury(),
      authAPI.adminGetUsers(),
      authAPI.adminGetAcademicOptions(),
    ]);

    const [subjectsRes, groupsRes, choicesRes, juryRes, usersRes, optionsRes] = requests;

    if (subjectsRes.status === 'fulfilled') {
      setSubjects(Array.isArray(subjectsRes.value?.data) ? subjectsRes.value.data : []);
    }

    if (groupsRes.status === 'fulfilled') {
      setGroups(Array.isArray(groupsRes.value?.data) ? groupsRes.value.data : []);
    }

    if (choicesRes.status === 'fulfilled') {
      setChoices(Array.isArray(choicesRes.value?.data) ? choicesRes.value.data : []);
    }

    if (juryRes.status === 'fulfilled') {
      setJury(Array.isArray(juryRes.value?.data) ? juryRes.value.data : []);
    }

    if (usersRes.status === 'fulfilled') {
      setUsers(Array.isArray(usersRes.value?.data) ? usersRes.value.data : []);
    }

    if (optionsRes.status === 'fulfilled') {
      setPromos(Array.isArray(optionsRes.value?.data?.promos) ? optionsRes.value.data.promos : []);
    }

    const failedCount = requests.filter((entry) => entry.status === 'rejected').length;
    if (failedCount > 0) {
      setError(`Some resources failed to load (${failedCount}/6).`);
    }

    if (silent) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const runAction = useCallback(
    async (action, successMessage, fallbackError) => {
      setBusy(true);
      setSuccess('');
      setError('');

      try {
        await action();
        setSuccess(successMessage);
        await refreshData(true);
      } catch (actionError) {
        setError(getErrorMessage(actionError, fallbackError));
      } finally {
        setBusy(false);
      }
    },
    [refreshData]
  );

  const handleCreateSubject = async (event) => {
    event.preventDefault();

    if (!subjectForm.titre.trim() || !subjectForm.description.trim()) {
      setError('Subject title and description are required.');
      return;
    }

    if (!subjectForm.enseignantId || !subjectForm.promoId) {
      setError('Please select a teacher and a promo.');
      return;
    }

    await runAction(
      () =>
        pfeAdminAPI.createSujet({
          titre: subjectForm.titre.trim(),
          description: subjectForm.description.trim(),
          enseignantId: Number(subjectForm.enseignantId),
          promoId: Number(subjectForm.promoId),
          type_projet: subjectForm.type_projet,
          max_grps: Number(subjectForm.max_grps) || 1,
        }),
      'Subject created successfully.',
      'Failed to create subject.'
    );

    setSubjectForm(DEFAULT_SUBJECT_FORM);
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();

    if (!groupForm.sujetFinalId) {
      setError('Please select a final subject for the group.');
      return;
    }

    await runAction(
      () =>
        pfeAdminAPI.createGroup({
          nom: groupForm.nom.trim() || undefined,
          sujetFinalId: Number(groupForm.sujetFinalId),
          coEncadrantId: groupForm.coEncadrantId ? Number(groupForm.coEncadrantId) : undefined,
        }),
      'Group created successfully.',
      'Failed to create group.'
    );

    setGroupForm(DEFAULT_GROUP_FORM);
  };

  const handleAddMember = async (event) => {
    event.preventDefault();

    if (!memberForm.groupId || !memberForm.etudiantId) {
      setError('Please select a group and a student.');
      return;
    }

    await runAction(
      () =>
        pfeAdminAPI.addGroupMember(Number(memberForm.groupId), {
          etudiantId: Number(memberForm.etudiantId),
          role: memberForm.role,
        }),
      'Student assigned to group.',
      'Failed to add student to group.'
    );

    setMemberForm(DEFAULT_MEMBER_FORM);
  };

  const handleCreateChoice = async (event) => {
    event.preventDefault();

    if (!choiceForm.groupId || !choiceForm.sujetId || !choiceForm.ordre) {
      setError('Group, subject and order are required.');
      return;
    }

    await runAction(
      () =>
        pfeAdminAPI.createChoice({
          groupId: Number(choiceForm.groupId),
          sujetId: Number(choiceForm.sujetId),
          ordre: Number(choiceForm.ordre),
        }),
      'Choice created successfully.',
      'Failed to create choice.'
    );

    setChoiceForm(DEFAULT_CHOICE_FORM);
  };

  const handleAddJuryMember = async (event) => {
    event.preventDefault();

    if (!juryForm.groupId || !juryForm.enseignantId) {
      setError('Please select a group and a teacher.');
      return;
    }

    await runAction(
      () =>
        pfeAdminAPI.addJuryMember({
          groupId: Number(juryForm.groupId),
          enseignantId: Number(juryForm.enseignantId),
          role: juryForm.role,
        }),
      'Jury member added.',
      'Failed to add jury member.'
    );

    setJuryForm(DEFAULT_JURY_FORM);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Administration</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">PFE Management Hub</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Create, assign, and supervise end-of-studies projects from a single admin workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshData(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            disabled={refreshing || busy}
          >
            <Loader2 className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Subjects</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{subjects.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Groups</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{groups.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pending subjects</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingSubjects}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Jury assignments</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{jury.length}</p>
        </div>
      </section>

      {(error || success) && (
        <section className="space-y-2">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <tab.Icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateSubject} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Subject title"
                value={subjectForm.titre}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, titre: event.target.value }))}
              />
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={subjectForm.enseignantId}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, enseignantId: event.target.value }))}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {userLabel(teacher)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={subjectForm.promoId}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, promoId: event.target.value }))}
              >
                <option value="">Select promo</option>
                {promos.map((promo) => (
                  <option key={promo.id} value={promo.id}>
                    {promoLabel(promo)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={subjectForm.type_projet}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, type_projet: event.target.value }))}
              >
                <option value="application">application</option>
                <option value="recherche">recherche</option>
                <option value="etude">etude</option>
                <option value="innovation">innovation</option>
              </select>
              <input
                type="number"
                min={1}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Max groups"
                value={subjectForm.max_grps}
                onChange={(event) =>
                  setSubjectForm((prev) => ({
                    ...prev,
                    max_grps: Number(event.target.value) || 1,
                  }))
                }
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                disabled={busy}
              >
                Create subject
              </button>
              <textarea
                className="md:col-span-2 xl:col-span-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                rows={3}
                placeholder="Subject description"
                value={subjectForm.description}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </form>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Title</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Teacher</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Promo</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{subjectLabel(subject)}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{subject.description || subject.description_ar || '-'}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{subject.enseignant || '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{subject.promo || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(subject.status, SUBJECT_STATUS_CLASS)}`}>
                          {subject.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          {subject.status === 'propose' && (
                            <>
                              <button
                                type="button"
                                onClick={() => runAction(() => pfeAdminAPI.validateSujet(subject.id), 'Subject validated.', 'Validation failed.')}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                                disabled={busy}
                              >
                                Validate
                              </button>
                              <button
                                type="button"
                                onClick={() => runAction(() => pfeAdminAPI.rejectSujet(subject.id), 'Subject rejected.', 'Rejection failed.')}
                                className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500"
                                disabled={busy}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => runAction(() => pfeAdminAPI.deleteSujet(subject.id), 'Subject deleted.', 'Delete failed.')}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-500"
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateGroup} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Group name"
                value={groupForm.nom}
                onChange={(event) => setGroupForm((prev) => ({ ...prev, nom: event.target.value }))}
              />
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={groupForm.sujetFinalId}
                onChange={(event) => setGroupForm((prev) => ({ ...prev, sujetFinalId: event.target.value }))}
              >
                <option value="">Select final subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subjectLabel(subject)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={groupForm.coEncadrantId}
                onChange={(event) => setGroupForm((prev) => ({ ...prev, coEncadrantId: event.target.value }))}
              >
                <option value="">Select co-supervisor (optional)</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {userLabel(teacher)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                disabled={busy}
              >
                Create group
              </button>
            </form>

            <form onSubmit={handleAddMember} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={memberForm.groupId}
                onChange={(event) => setMemberForm((prev) => ({ ...prev, groupId: event.target.value }))}
              >
                <option value="">Select group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {groupLabel(group)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={memberForm.etudiantId}
                onChange={(event) => setMemberForm((prev) => ({ ...prev, etudiantId: event.target.value }))}
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {userLabel(student)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={memberForm.role}
                onChange={(event) => setMemberForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="membre">membre</option>
                <option value="chef_groupe">chef_groupe</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                disabled={busy}
              >
                Add member
              </button>
            </form>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {groups.map((group) => (
                <article key={group.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{groupLabel(group)}</h3>
                    <button
                      type="button"
                      onClick={() => runAction(() => pfeAdminAPI.assignGroupSubject(group.id), 'Group subject assignment completed.', 'Failed to assign subject.')}
                      className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                      disabled={busy}
                    >
                      Auto assign subject
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Subject: {group.sujet || '-'}</p>
                  <p className="text-sm text-slate-600">Supervisor: {group.encadrant || '-'}</p>
                  <ul className="mt-3 space-y-1 text-sm text-slate-700">
                    {(group.members || []).map((member) => (
                      <li key={`${group.id}-${member.id || member.etudiantId}`}>
                        {member.name} ({member.role})
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'choices' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateChoice} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={choiceForm.groupId}
                onChange={(event) => setChoiceForm((prev) => ({ ...prev, groupId: event.target.value }))}
              >
                <option value="">Select group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {groupLabel(group)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={choiceForm.sujetId}
                onChange={(event) => setChoiceForm((prev) => ({ ...prev, sujetId: event.target.value }))}
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subjectLabel(subject)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={choiceForm.ordre}
                onChange={(event) => setChoiceForm((prev) => ({ ...prev, ordre: Number(event.target.value) || 1 }))}
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                disabled={busy}
              >
                Add choice
              </button>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Group</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Subject</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Order</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {choices.map((choice) => (
                    <tr key={choice.id}>
                      <td className="px-3 py-2 text-slate-700">{choice.group}</td>
                      <td className="px-3 py-2 text-slate-700">{choice.sujet}</td>
                      <td className="px-3 py-2 text-slate-700">{choice.ordre}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(choice.status, CHOICE_STATUS_CLASS)}`}>
                          {choice.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => runAction(() => pfeAdminAPI.updateChoiceStatus(choice.id, 'accepte'), 'Choice accepted.', 'Failed to update choice.')}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                            disabled={busy}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => runAction(() => pfeAdminAPI.updateChoiceStatus(choice.id, 'refuse'), 'Choice rejected.', 'Failed to update choice.')}
                            className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500"
                            disabled={busy}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => runAction(() => pfeAdminAPI.deleteChoice(choice.id), 'Choice deleted.', 'Failed to delete choice.')}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-500"
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'jury' && (
          <div className="space-y-6">
            <form onSubmit={handleAddJuryMember} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={juryForm.groupId}
                onChange={(event) => setJuryForm((prev) => ({ ...prev, groupId: event.target.value }))}
              >
                <option value="">Select group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {groupLabel(group)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={juryForm.enseignantId}
                onChange={(event) => setJuryForm((prev) => ({ ...prev, enseignantId: event.target.value }))}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {userLabel(teacher)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={juryForm.role}
                onChange={(event) => setJuryForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                disabled={busy}
              >
                Add jury member
              </button>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Group</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Teacher</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Role</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {jury.map((member) => {
                    const draftRole = juryRoleDrafts[member.id] || member.role;
                    return (
                      <tr key={member.id}>
                        <td className="px-3 py-2 text-slate-700">{member.group || '-'}</td>
                        <td className="px-3 py-2 text-slate-700">{member.enseignant || '-'}</td>
                        <td className="px-3 py-2">
                          <select
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                            value={draftRole}
                            onChange={(event) =>
                              setJuryRoleDrafts((prev) => ({
                                ...prev,
                                [member.id]: event.target.value,
                              }))
                            }
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                runAction(
                                  () => pfeAdminAPI.updateJuryRole(member.id, draftRole),
                                  'Jury role updated.',
                                  'Failed to update jury role.'
                                )
                              }
                              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                              disabled={busy}
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              onClick={() => runAction(() => pfeAdminAPI.deleteJuryMember(member.id), 'Jury member deleted.', 'Failed to delete jury member.')}
                              className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-500"
                              disabled={busy}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <footer className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">Admin-only workflow</p>
        <p className="mt-1">
          PFE creation, assignment, and jury actions are managed from this hub under admin permissions only.
        </p>
      </footer>
    </div>
  );
}

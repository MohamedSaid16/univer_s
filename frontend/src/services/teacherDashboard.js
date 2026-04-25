/*
  teacherDashboard.js — Role-scoped service for the teacher dashboard.

  All endpoints below are enforced server-side: the backend resolves the
  authenticated teacher's promo IDs from `Enseignement` rows and constrains
  every query to that scope (see backend/src/modules/teacher/teacher.service.ts —
  resolveTeacherContext + assertTeacherCanManageModule).

  Frontend filters are a UX layer only — they cannot widen access.
*/

import request from './api';
import { teacherPanelAPI } from './api';

const TEACHER_DASHBOARD_PATH = '/api/v1/teacher/dashboard';

const buildQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (!entries.length) return '';
  const usp = new URLSearchParams();
  entries.forEach(([key, value]) => usp.set(key, String(value)));
  return `?${usp.toString()}`;
};

export const teacherDashboardService = {
  // Returns: { summary, courses: [{ enseignementId, moduleId, moduleName, moduleCode, promoId, promoName, section }], ... }
  getOverview: () => request(TEACHER_DASHBOARD_PATH),

  // Returns: { items: [{ id, matricule, nom, prenom, email, promo: { id, nom, section }, relatedCourses, ... }], pagination }
  // Server-side scope: only students in the teacher's promo IDs.
  // moduleId (optional) further narrows to that module's promos and is rejected if out-of-scope.
  listStudents: ({ moduleId, search, page, limit } = {}) =>
    teacherPanelAPI.getStudents({ moduleId, search, page, limit }),

  // Open a disciplinary case for a student. Reuses the existing endpoint
  // already used by the legacy DisciplinaryCasesPage teacher form.
  reportStudent: ({ studentId, reason, typeInfraction }) =>
    request('/api/v1/disciplinary/cases', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        reason,
        titre: 'Teacher disciplinary report',
        typeInfraction,
      }),
    }),

  // Returns the discipline dossiers filed by this teacher (server-scoped to caller).
  getDisciplinaryCases: () =>
    request('/api/v1/disciplinary/dossiers-disciplinaires'),
};

// Shape the dashboard `courses` array into a per-course summary
// (groupes assigned + student count). Pure UI helper — no leakage risk.
export const summarizeCourses = (courses = [], students = []) => {
  const byModule = new Map();
  courses.forEach((course) => {
    const entry = byModule.get(course.moduleId) || {
      moduleId: course.moduleId,
      moduleName: course.moduleName,
      moduleCode: course.moduleCode,
      groupes: [],
    };
    if (!entry.groupes.find((g) => g.promoId === course.promoId)) {
      entry.groupes.push({
        promoId: course.promoId,
        promoName: course.promoName,
        section: course.section,
      });
    }
    byModule.set(course.moduleId, entry);
  });

  const studentCountByPromo = new Map();
  students.forEach((student) => {
    const promoId = student?.promo?.id;
    if (!promoId) return;
    studentCountByPromo.set(promoId, (studentCountByPromo.get(promoId) || 0) + 1);
  });

  return Array.from(byModule.values()).map((entry) => {
    const studentCount = entry.groupes.reduce(
      (sum, g) => sum + (studentCountByPromo.get(g.promoId) || 0),
      0
    );
    return { ...entry, studentCount };
  });
};

// Distinct option lists for the FilterBar — fed from the already-scoped courses
// array so we never expose anything the teacher isn't authorized to see.
export const extractFilterOptions = (courses = []) => {
  const groupesMap = new Map();
  const promosMap = new Map();
  const modulesMap = new Map();

  courses.forEach((course) => {
    const groupeKey = `${course.promoId}::${course.section || ''}`;
    if (!groupesMap.has(groupeKey)) {
      groupesMap.set(groupeKey, {
        id: groupeKey,
        promoId: course.promoId,
        section: course.section,
        label: `${course.promoName}${course.section && course.section !== 'N/A' ? ` — ${course.section}` : ''}`,
      });
    }
    if (!promosMap.has(course.promoId)) {
      promosMap.set(course.promoId, { id: course.promoId, label: course.promoName });
    }
    if (!modulesMap.has(course.moduleId)) {
      modulesMap.set(course.moduleId, {
        id: course.moduleId,
        label: `${course.moduleName} (${course.moduleCode})`,
      });
    }
  });

  return {
    groupes: Array.from(groupesMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
    promos: Array.from(promosMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
    modules: Array.from(modulesMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
  };
};

export default teacherDashboardService;

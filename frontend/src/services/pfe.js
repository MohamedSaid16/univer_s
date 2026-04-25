import request from './api';

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');

  if (!entries.length) {
    return '';
  }

  const query = new URLSearchParams();
  entries.forEach(([key, value]) => {
    query.set(key, String(value));
  });

  return `?${query.toString()}`;
}

export const pfeAPI = {
  getSummary: () => request('/api/v1/pfe/summary'),
  listSubjects: (params = {}) => request(`/api/v1/pfe/subjects${buildQuery(params)}`),
  getSubject: (subjectId) => request(`/api/v1/pfe/subjects/${subjectId}`),
  getTeacherCourses: (teacherId) => request(`/api/v1/pfe/teacher/${teacherId}/courses`),
  getCourseGroups: (courseId) => request(`/api/v1/pfe/course/${courseId}/groups`),
  getGroupStudents: (groupId) => request(`/api/v1/pfe/groups/${groupId}/students`),
};

export const pfeAdminAPI = {
  listSujets: (params = {}) => request(`/api/v1/pfe/sujets${buildQuery(params)}`),
  createSujet: (payload) =>
    request('/api/v1/pfe/sujets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSujet: (subjectId, payload) =>
    request(`/api/v1/pfe/sujets/${subjectId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteSujet: (subjectId) =>
    request(`/api/v1/pfe/sujets/${subjectId}`, {
      method: 'DELETE',
    }),
  validateSujet: (subjectId) =>
    request(`/api/v1/pfe/sujets/${subjectId}/valider`, {
      method: 'POST',
    }),
  rejectSujet: (subjectId) =>
    request(`/api/v1/pfe/sujets/${subjectId}/rejeter`, {
      method: 'POST',
    }),
  listPendingSujets: () => request('/api/v1/pfe/sujets/pending'),

  listGroups: () => request('/api/v1/pfe/groups'),
  getGroupById: (groupId) => request(`/api/v1/pfe/groups/${groupId}`),
  createGroup: (payload) =>
    request('/api/v1/pfe/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteGroup: (groupId) =>
    request(`/api/v1/pfe/groups/${groupId}`, {
      method: 'DELETE',
    }),
  addGroupMember: (groupId, payload) =>
    request(`/api/v1/pfe/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  assignGroupSubject: (groupId) =>
    request(`/api/v1/pfe/groups/${groupId}/assign-subject`, {
      method: 'POST',
    }),

  listChoices: () => request('/api/v1/pfe/choix-sujets'),
  createChoice: (payload) =>
    request('/api/v1/pfe/choix-sujets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateChoiceStatus: (choiceId, status) =>
    request(`/api/v1/pfe/choix-sujets/${choiceId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  deleteChoice: (choiceId) =>
    request(`/api/v1/pfe/choix-sujets/${choiceId}`, {
      method: 'DELETE',
    }),

  listJury: () => request('/api/v1/pfe/jury'),
  listGroupJury: (groupId) => request(`/api/v1/pfe/groups/${groupId}/jury`),
  addJuryMember: (payload) =>
    request('/api/v1/pfe/jury', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateJuryRole: (juryId, role) =>
    request(`/api/v1/pfe/jury/${juryId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  deleteJuryMember: (juryId) =>
    request(`/api/v1/pfe/jury/${juryId}`, {
      method: 'DELETE',
    }),
};

export default pfeAPI;
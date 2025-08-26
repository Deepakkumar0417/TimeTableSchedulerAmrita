import { apiFetch } from './client';

// Degrees
export const listDegrees   = () => apiFetch('/api/admin/degrees', { method: 'GET' });
export const createDegree  = (payload) => apiFetch('/api/admin/degrees', { method: 'POST', body: JSON.stringify(payload) });

// Departments
export const listDepartments  = () => apiFetch('/api/admin/departments', { method: 'GET' });
export const createDepartment = (payload) => apiFetch('/api/admin/departments', { method: 'POST', body: JSON.stringify(payload) });

// Cohorts (Degree + Dept + Intake)
export const listCohorts   = () => apiFetch('/api/admin/cohorts', { method: 'GET' });
export const createCohort  = (payload) => apiFetch('/api/admin/cohorts', { method: 'POST', body: JSON.stringify(payload) });

// Semesters
export const listSemesters = (cohortId) => apiFetch(`/api/admin/semesters?cohortId=${encodeURIComponent(cohortId)}`, { method: 'GET' });
export const createSemester = (payload) => apiFetch('/api/admin/semesters', { method: 'POST', body: JSON.stringify(payload) });

// Queries
export const listQueries   = () => apiFetch('/api/admin/queries', { method: 'GET' });
export const replyQuery    = (id, body) => apiFetch(`/api/admin/queries/${id}/reply`, { method: 'POST', body: JSON.stringify(body) });
export const setQueryStatus= (id, status) => apiFetch(`/api/admin/queries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });

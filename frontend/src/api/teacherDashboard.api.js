import { teacherRequest } from './teacherProjectAdvisor.api.js';

export const getTeacherDashboard = (query = {}, signal) => teacherRequest(`/api/teachers/dashboard?${new URLSearchParams(query)}`, { signal });

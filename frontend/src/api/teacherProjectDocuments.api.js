import { teacherRequest } from './teacherProjectAdvisor.api.js';
const root = '/api/teachers/project-documents/students';
export const listTeacherProjectDocuments = (query, signal) => teacherRequest(`${root}?${new URLSearchParams(query)}`, { signal });
export const readTeacherProjectDocuments = (id, query, signal) => teacherRequest(`${root}/${encodeURIComponent(id)}?${new URLSearchParams(query)}`, { signal });
export const readTeacherProjectFile = (id, category, file, action, signal) => teacherRequest(
  `${root}/${encodeURIComponent(id)}/documents/${encodeURIComponent(category)}/files/${encodeURIComponent(file.id)}/${action}?${new URLSearchParams({ revision: file.revision })}`,
  { responseType: 'blob', signal });

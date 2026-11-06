import { staffRequest } from './staffDocuments.api.js';
const root = '/api/staff/coop-prerequisite-catalog';
export const getCatalogPermissions = () => staffRequest(root + '/permissions');
export const getStaffPrerequisiteCatalog = program => staffRequest(root + '?' + new URLSearchParams({ program }));
export const saveStaffPrerequisiteCourse = (id, body) => staffRequest(root + (id ? '/' + encodeURIComponent(id) : ''), { method: id ? 'PATCH' : 'POST', body });

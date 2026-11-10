// Current definitions for explicit initialization; importing does not apply DDL.
const checks = {
  coop_project_links_category_check: "category IN ('project-book','poster')",
  coop_project_links_version_check: "version >= 1",
  coop_project_links_url_check: "document_url = '' OR (document_url LIKE 'https://%' AND length(document_url) <= 2000)",
};
module.exports = {
  constraints: Object.entries(checks).map(([name, expression]) => ({ table_name: "coop_project_links", name, type: "c", definition: `CHECK (${expression})`, key_count: 1 })),
  functions: [], triggers: [],
};

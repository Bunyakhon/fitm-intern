# Teacher Dashboard — Modern Academic Action Center

11 November 2026 (Asia/Bangkok). Baseline **28 Modified / 26 Untracked**. Source audit recorded before implementation; all local work is preserved. Tests: NOT RUN — USER-OWNED TESTING.

## Before / design decisions

- `teacherDashboard.js` currently calls account + supervised students + two pending lists; two pending totals are combined into one metric and each queue shows five examples. It has no combined filter/page, and existing list default sorting is academic year, not received date. Separately fetched totals can represent different instants.
- `teacherNavigation.js` owns panels/hash/focus/drawer. Existing `teacher:task-open` consumers open owner-scoped detail by `{kind,id}`. Preserve that contract and navigation source; do not replace list filters, popup state or decision flows.
- Coop ownership is `students.advisor_teacher_id`, pending action status `advisor_review`. Advisor ownership is `requested_advisor_teacher_id`, pending status `pending`. Supervised count is students with `coop_advisor_teacher_id` and `track=co_op`; it is distinct from class-advisor count.
- Supervision API has student list/detail and appointment actions, but no safe aggregate upcoming appointment endpoint. Project Documents has private owner-scoped readers/viewer; it is not a pending task source. Keep real navigation shortcuts and an honest unavailable aggregate schedule state; no detail fan-out, invented urgency, deadline or completed-today metric.
- Round3 Teacher tokens/variants are canonical. Its ENUM/text fix and current Advisor status policy remain intact. Existing Round1–3 results stay historical/pending; no new PASS from source edits.
- No reference image is included in the current attachment directory (text only). Follow the written Modern Academic Blue direction without claiming pixel comparison or using mockup identities/counts/dates.

## Implementation

### Layout and interaction

Three KPI cards: Coop awaiting this class advisor, pending requests addressed to this project advisor, and supervised co-op students. The first two are native buttons opening the matching pending category in the Action Center and focusing its heading; the third keeps the existing student-menu link. This keeps KPI scope and task results aligned without resetting another menu's saved filters. Counts are never sample data.

Desktop uses three KPI columns and an approximately 70/30 task/summary layout. At ≤1100px the main/side sections stack; at ≤600px cards and side panels are one column and task actions wrap below their content. The right panel shows the two pending totals and their sum, honest aggregate-schedule unavailability, and existing schedule/result/document links. Existing document and supervision shortcuts remain accessible. No generic “view all” link is added because there is no separate combined-task destination; pagination exposes the complete queue.

Task rows include type icon/title, student name/code/major, real company/job or project topic, submitted/requested timestamp in Asia/Bangkok, real pending status text and primary action. They dispatch the existing `teacher:task-open` event with the exact request kind/ID before existing hash navigation. No decision mutation occurs on Dashboard; detail controllers retain current authorization, confirmation and draft handling. A row changed by another user can correctly produce the existing stale/detail status instead of acting from cached Dashboard data.

Round3 colors are reused by variable reference only; no duplicate palette. SVGs are inline stroke icons, decorative and hidden from assistive tech. Native filter buttons use `role=group`, `aria-pressed`, `aria-controls` (not incomplete ARIA tab semantics). Focus-visible/44px controls/disabled/loading/spinner reuse Round3. Static skeletons avoid motion; inherited reduced-motion rules remain effective. Dashboard CSS scope is `body.teacher-page[data-workflow-role="teacher"] #teacherOverview`; Navbar, sidebar, account menu, other role themes and other menu layouts are untouched.

### Why a Dashboard read endpoint is necessary

Existing lists provide per-menu totals and academic-year sorting, not a globally ordered cross-type task page. A Dashboard-only read projection avoids fetching all records or merging independently paged subsets in the browser, and makes all displayed totals and tasks use the same snapshot. The old list APIs/defaults/allowlists/preferences remain unchanged.

`GET /api/teachers/dashboard?type=all|coop|advisor&offset=<multiple-of-5>` returns:

```text
{ success: true, data: {
  teacher: { id, academic_title, first_name, last_name },
  summary: { coop_pending, advisor_pending, supervised_students, pending_total },
  tasks: [{ kind, id, received_at, status, student_record_id, student_id,
            first_name, last_name, major, company_name, job_title, topic }],
  pagination: { type, offset, limit: 5, total }
} }
```

Type is allowlisted, unknown/repeated/object query parameters are rejected, offset must be a nonnegative safe integer divisible by five, and the page size is fixed at five. Bind parameters carry teacher/type/offset/limit. Authentication reuses `authenticateToken` (signature, live role/account/revocation) and `createRequireTeacher`; no admin override. Service also checks the active Teacher and selects only the four safe identity fields. Cache-Control is private/no-store and errors never return raw SQL.

Read-only REPEATABLE READ transaction: Coop CTE selects `advisor_review` owned through `students.advisor_teacher_id`; Advisor CTE selects `pending` addressed through `requested_advisor_teacher_id`; Student count uses `track=co_op` and `coop_advisor_teacher_id`. `UNION ALL` preserves distinct real task types. Optional job/project joins use unique IDs/student-project key, preserving one row per request. No N+1 student/detail/file/mentor requests or document-byte access.

SQL orders the combined eligible queue by **received_at ASC NULLS LAST, kind ASC, request ID ASC**, filters the chosen category and applies OFFSET/LIMIT before returning at most five rows. Counts use the same pending CTEs before pagination; supervised count is separate and never added to pending total. Request type plus ID provides stable tie-breaking; no deadline/priority inference or academic-year substitution. Source pending-date columns are non-null by model; nullable display handling remains defensive. `status::text` makes both union branches compatible while stored status values stay unchanged; Round3 old-list ENUM/text fix is untouched.

### Requests, failure and pagination

Dashboard makes one aggregate request per initial load, return to overview, changed category, Previous/Next or explicit error Retry. Selecting the same first-page filter again does not fetch. Busy guard + WeakMap mounting prevent duplicate action/mount requests. AbortController + serial + captured token prevent stale responses after navigation/logout/session change; only the current request can settle loading. Response shape/count/status/unique kind+ID/row identity/page checks reject inconsistent payloads rather than silently dropping rows or showing false zero. Native focus disabled by loading is restored when appropriate.

Changing category resets only Dashboard offset; other menu search/filter/sort/view/page-size state is untouched. Returning from a decision reloads current totals. If a changed queue empties the last page, one extra request resets to page one; no retry loop/polling. Offset pagination over mutable queues may shift when another user processes tasks between requests; each response is internally consistent and no cross-page immutable snapshot is claimed.

Loading uses skeletons/placeholders; API/schema/network/contract errors show unavailable metrics plus Retry, never zero or a false empty state. 401/403 or changed session clears identity/tasks/counts and shows sign-in. No session policy/token lifetime changes. Absence of a safe upcoming aggregate API is presented as unavailability, not as “no appointments exist.”

### Changed files / evidence

Added six files: this design/audit note; `docs/testing/TEACHER_DASHBOARD_ACTION_CENTER_MANUAL_ACCEPTANCE.md`; `backend/src/services/teacherDashboard.service.js`; `backend/src/routes/teacherDashboard.routes.js`; `frontend/src/api/teacherDashboard.api.js`; `frontend/src/styles/teacher_dashboard.css`.

Modified five existing paths: `backend/src/app.js` (mount only), `frontend/src/pages/teacherDashboard.js`, `frontend/src/teacher_coop/teacher_coop.html` (Dashboard section + stylesheet link only), `README.md`, `HANDOFF_fitm-intern.md`. No deletions. Git **28M/26U → 28M/32U**; all baseline modified/untracked files retained. Old Dashboard queue DOM had no remaining external callers in related source; existing detail event consumers stay unchanged.

Database Changes: NONE. No models/schema/data/seed/constraints/auth/JWT/RBAC/approval/rejection/supervision rules/Student popup/private PDF/files/upload/link workflows changed. No commit/push. Round3 remains PENDING USER RETEST, including its earlier user-reported PASS4/FAIL3/NOT TESTED3; this task supplies no new acceptance results.

Tests: NOT RUN — USER-OWNED TESTING. Source/callers/schema definitions/contracts/Git diff/UTF-8 text read only; no application execution, API/DB calls, automated checks, build/lint/typecheck/syntax/health checks or browser automation. New SQL, endpoint, focus, responsive layout, actual computed colors, session and deep-link behavior are **not runtime verified**. A Backend restart/Frontend reload is needed to pick up the added route/assets. No WCAG or pixel-match claim. No new policy decision; missing mockup and upcoming aggregate API are stated limitations, not permission blockers.

NEXT TASK: User Manual Chrome Acceptance using the [20-case checklist](../testing/TEACHER_DASHBOARD_ACTION_CENTER_MANUAL_ACCEPTANCE.md).

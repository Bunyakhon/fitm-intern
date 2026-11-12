# Teacher Dashboard Action Center — Manual Chrome Acceptance

11 November 2026 (Asia/Bangkok). **Tests: NOT RUN — USER-OWNED TESTING.** Every case starts **NOT TESTED**. Implementation is not a PASS. Existing Round3 remains pending user retest; historical user results retain their original scope/date.

Restart Backend/reload Frontend normally after source update. Use existing authorized accounts and records; no seed/reset/schema/data/account/privilege changes are part of this task. Do not record JWT, Authorization headers, cookies or private student/document content in reports. Dashboard reads only; any real workflow decision follows the user's normal acceptance process.

| ID | Chrome action | Expected result | Result |
|---|---|---|---|
| DASH-01 | Open Teacher Dashboard | One Dashboard aggregate request from this module, correct real account name, three KPI cards, tasks and summary; no console/runtime error | NOT TESTED |
| DASH-02 | Compare three KPI values with actual owned pending requests / supervised students | Coop = advisor_review of class-advised students; Advisor = pending addressed to current teacher; Students = co_op assigned via coop_advisor_teacher_id; no sample counts | NOT TESTED |
| DASH-03 | Compare KPI/tab/right-panel totals and task pagination total | Same-response counts agree; All = Coop + Advisor; supervised count excluded from pending total; per-page rows are a subset of total | NOT TESTED |
| DASH-04 | Choose All/Coop/Advisor, click first two KPI buttons, page Next/Previous; reselect same first-page category | Correct type/status only, page size five, category resets page one; KPI buttons focus task heading; same unchanged category does not fetch; other menus' filters/preferences remain | NOT TESTED |
| DASH-05 | Inspect status and sent dates on task rows | Real advisor_review/pending with meaningful warning labels; actual submitted/requested timestamp formatted Asia/Bangkok; no invented urgency/deadline or completed-today count | NOT TESTED |
| DASH-06 | Open actions for different students/request types, including off-page destination list records | Existing detail opens exact kind/request ID, not just a generic menu; correct student/company/topic; confirmation/decision rules unchanged | NOT TESTED |
| DASH-07 | Page through mixed tasks, including equal timestamps where present | At most five per page; received-date ASC, unknown last, kind/ID deterministic tie-breaker before pagination; no duplicate kind+ID; no full-list browser fetching | NOT TESTED |
| DASH-08 | Compare displayed identities/company/job/topic/dates with existing record details | Real fields match selected student/request; missing fields explicitly unknown; no reference-image names/numbers/dates; no copied student data | NOT TESTED |
| DASH-09 | Slow/offline/error response, Retry, rapid clicks and navigation away during load | Skeletons/locked controls/spinner settle; errors say unavailable instead of zero; Retry appropriate and guarded; old response never replaces current view/session; one request per action except documented empty-last-page fallback | NOT TESTED |
| DASH-10 | Existing account/category with truly no pending tasks | Genuine zero counts and accurate empty message; Previous/Next disabled; no fake error/false empty from network failure; schedule unavailability does not claim no appointments | NOT TESTED |
| DASH-11 | 1280px | Three KPI cards, task list/main summary split, readable long text/action buttons, no whole-page overflow | NOT TESTED |
| DASH-12 | 768px | Main/summary stack, KPI arrangement fits, toolbar and task content wrap; no whole-page overflow | NOT TESTED |
| DASH-13 | 390px | One-column cards/panels; actions/filters/pagination reachable, text uncut, no whole-page overflow | NOT TESTED |
| DASH-14 | 320px and zoom | Long names/statuses/topics/error text fit; focus/controls usable without horizontal page scrolling | NOT TESTED |
| DASH-15 | Keyboard Tab/Shift+Tab/Enter/Space through KPI/filter/page/task/shortcut controls | Accessible names and visible focus; native buttons/anchors work; KPI focus lands at tasks; loading does not strand focus; existing detail modal trap/return remains | NOT TESTED |
| DASH-16 | Hover/press/focus/disabled/loading and reduced-motion setting | Primary/secondary/warning semantics follow Round3, controls ≥44px high, disabled distinct from loading, skeletons static, no forced motion; actual rendered contrast meets applicable AA targets | NOT TESTED |
| DASH-17 | Existing second Teacher/Student/Staff/Admin account access where authorized | Backend enforces actual Teacher identity and relationship scopes; no other Teacher's tasks/students/counts leak; unavailable accounts remain unverified | NOT TESTED |
| DASH-18 | Expiry/logout/cross-tab session change during load and before task click | Stale response discarded, identity/tasks/counts cleared when invalidation is observed; sign-in shown; no stale click/confirmation or changed account token cleared by Dashboard | NOT TESTED |
| DASH-19 | Sidebar/Navbar/account menu, Dashboard↔lists, students popup, schedule/results/document shortcuts; return after normal decision | Navigation structure/focus unchanged; selected details and existing drafts preserved; return refreshes counts; no duplicate initial/refocus fetch; private documents/Overleaf/Drive/upload readback unchanged | NOT TESTED |
| DASH-20 | Round3 regression: Coop all +10/25/50/Search/Sort/CardTable; Advisor current labels/history exclusion; students popup/page size; document preview | ENUM/text fix retained; other menus' controls/preferences/workflows and shared colors unchanged. Round3 acceptance still requires its separate checklist/results | NOT TESTED |

Pending limits: no upcoming-appointment aggregate endpoint; schedule panel provides real existing per-student navigation, not a calendar. Current attachment contains no reference image, so pixel comparison remains unavailable. Other modules may make their normal existing initialization requests; the single-request criterion applies to this Dashboard module, not to every page module combined. Queues can change between page requests because users process real records; compare order within a stable dataset and distinguish live updates.

For any issue report case ID, steps, expected/actual, width and sanitized HTTP status/error code. All results stay NOT TESTED until the user reports evidence. See [design/source notes](../development/TEACHER_DASHBOARD_ACTION_CENTER.md).

NEXT TASK: User Manual Chrome Acceptance.

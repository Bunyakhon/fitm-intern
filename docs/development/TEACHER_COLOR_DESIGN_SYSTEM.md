# Teacher Color Design System — Round 3

11 November 2026 (Asia/Bangkok). Source updated; **PENDING USER RETEST**. Canonical CSS: `frontend/src/styles/teacher_design.css`, loaded after Teacher Workspace CSS. Scope: `body.teacher-page[data-workflow-role="teacher"]`, including shared dialogs/toasts portaled under the same body. Legacy styles stay for existing callers/other roles; component overrides and compatibility aliases select these tokens for Teacher. Logo, Noto Sans Thai, navigation structure and business workflows stay unchanged.

## Tokens

All names below have the `--teacher-` prefix.

| Token | Value | Use |
|---|---|---|
| primary / primary-hover / primary-active | #1D4ED8 / #1E40AF / #1E3A8A | Search, save, main navigation action, selected view, focus |
| heading | #0F172A | Headings and default text |
| background / surface | #F8FAFC / #FFFFFF | Page / cards, dialogs and controls |
| muted | #475569 | Supporting text and placeholders |
| border | #CBD5E1 | Decorative separators/card edges; never the sole enabled input boundary |
| control-border | #64748B | Enabled input/secondary button boundary |
| success / success-hover / success-active | #166534 / #14532D / #052E16 | Approve, accept, complete |
| success-bg | #DCFCE7 | Success badge/message/icon |
| warning / warning-bg | #92400E / #FEF3C7 | Pending, awaiting confirmation, revision requested |
| danger / danger-hover / danger-active | #B91C1C / #991B1B / #7F1D1D | Reject and destructive confirmation |
| danger-bg | #FEE2E2 | Error/rejection badge and feedback |
| info / info-bg | primary-hover / #DBEAFE | In progress, document available, informational feedback |
| neutral-bg | #F1F5F9 | Unknown/missing/historical/draft badge, disabled controls, table heading |
| overlay / dialog-shadow | rgba(15,23,42,.58) / 0 24px 64px rgba(15,23,42,.24) | Dialog/drawer backdrop and dialog shadow |

## Components and states

- Primary: `.teacher-button--primary`; secondary: base `.teacher-button`; success: `--success` or approval `--accept`; danger: `--danger` or `--reject`; neutral: `--neutral`. Search, welcome shortcut, schedule save and result draft save use primary. Details/download/reset/back/close remain secondary. Approval and completion use success; rejection uses danger.
- Each variant defines default/hover/pressed colors through button custom properties. Focus-visible is a 3px primary outline with 3px offset. Real disabled controls use neutral background/muted text and not-allowed cursor; loading retains its semantic variant, spinner/currentColor, progress cursor and busy text. Existing busy locks prevent double submissions. Search spinner represents only a list request, not a disabled toolbar behind a modal.
- Buttons/view toggles retain at least 44px height; icon/Toast close buttons are at least 44px wide. Toast padding reserves close-button space. Table actions stack with 8px gap; controls/text wrap inside existing responsive containers. Tables retain their existing contained horizontal scroll region.
- Shared `showConfirmModal({variant})` accepts primary/success/danger intent only for Teacher. Other roles retain the previous rendering. Existing confirmation, reason requirement, draft, parent modal, session and action guards stay unchanged.
- `teacherStatus.js` maps real status values to tones and adds text + `data-status` + `data-tone` to badges. Pending/review/needs_revision → warning; confirmed/approved/document_issued/verified/completed → success; rejected/unavailable → danger; in_progress/searching/placed/file/link/file_and_link → info; unknown/missing/cancelled/superseded/draft → neutral. Color grants no action and changes no stored status. Card/Table share the same mapping; appointment/result readback uses the same palette. Planned features retain explanatory text.
- Inputs, sort, view toggle, pagination, sidebar active/hover, Dashboard queue badges, document badges, dialogs and toasts use scoped tokens. Reduced motion shortens Teacher animations/transitions and uses non-smooth scrolling for existing detail-navigation calls. Keyboard names, focus trap/return and modal close behavior remain in existing controllers.

## Contrast arithmetic — actual chosen pairs

Calculated directly from sRGB hex values using linearized relative luminance: component ≤ .04045 → component/12.92, otherwise ((component+.055)/1.055)^2.4; luminance .2126R+.7152G+.0722B; ratio (lighter+.05)/(darker+.05). Rounded to two decimals. This is the explicitly requested design arithmetic, **not an application test, browser computed-style result or full WCAG certification**.

| Foreground / background | Ratio | Application |
|---|---:|---|
| White / primary, hover, active | 6.70 / 8.72 / 10.36 | Primary button / active toggle |
| White / success, hover, active | 7.13 / 9.11 / 14.91 | Accept/approve/complete button |
| White / danger, hover, active | 6.47 / 8.31 / 10.02 | Reject button |
| Success / success-bg | 6.49 | Success status/message |
| Warning / warning-bg | 6.37 | Pending status/toast icon |
| Danger / danger-bg | 5.30 | Rejection/error feedback |
| Info / info-bg | 7.15 | Informational badge, secondary pressed state |
| Muted / neutral-bg | 6.92 | Neutral/unknown/disabled text |
| Heading / surface | 17.85 | Default text / secondary button |
| Muted / surface, background | 7.58 / 7.24 | Helper/placeholder text |
| Muted / info-bg | 6.21 | Welcome copy / selected table helper text |
| Heading / background, neutral-bg, info-bg | 17.06 / 16.30 / 14.63 | Page, table heading and selected-row text |
| Warning / surface | 7.09 | Warning toast text |
| Danger-hover / danger-bg | 6.80 | Pressed outlined Logout |
| Primary / info-bg | 5.49 | Secondary hover / active sidebar |
| Primary / background, neutral-bg | 6.41 / 6.12 | Link/focus on page / neutral control |
| Control-border / surface, background | 4.76 / 4.55 | Enabled input/secondary boundary (3:1 target) |
| Decorative border / surface | 1.48 | Decorative only; insufficient as the sole input boundary |

Text pairs above exceed 4.5:1; enabled boundary pairs above exceed 3:1. Disabled controls have a WCAG contrast exception but use readable neutral text. Focus against actual adjacent colors, overlays, browser-selected options, all rendered text sizes, zoom, keyboard/screen reader behavior and no page overflow at 1280/768/390/320px remain **PENDING USER CHROME RETEST**. Do not infer full AA compliance from token arithmetic.

Tests: NOT RUN — USER-OWNED TESTING. See [Round 3 audit](../audits/TEACHER_UX_COLOR_ROUND3_2026-11-11.md) and [manual retest](../testing/TEACHER_UX_COLOR_ROUND3_MANUAL_RETEST.md).

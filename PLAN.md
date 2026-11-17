# Sidebar Project Filter Roadmap

Summary: Keep the plugin focused on fast, temporary project filtering. First make its private DOM integration safe and testable, then add a useful empty state and a Command Center action; avoid recreating Paseo's sidebar organization features.

## Context

- The plugin is small and healthy: client-only, no runtime dependencies, no network or persistence, and both `npm test` and `npm run typecheck` pass.
- `shared/filter.ts` already provides dependency-free, Unicode-aware fuzzy subsequence matching against project names and keys/paths.
- `client/sidebar-filter.ts` injects a web input above the native sidebar and hides project groups with `style.display`.
- Paseo does not expose an API for decorating its default sidebar with a search field. Its current `addSidebarView` API replaces the whole sidebar and would require this plugin to reproduce native project/workspace behavior.
- The current DOM seam is therefore the smallest solution, but it relies on private test IDs, ARIA structure, and the location of the New workspace row.
- Comparable IDEs support visible filter feedback and keyboard entry. VS Code offers filter/highlight modes, fuzzy matching, and result navigation; JetBrains tool windows provide Speed Search keyboard navigation.
- Paseo and the Project groups plugin already cover broader organization concerns such as grouping, sorting, labels, pinning, colors, icons, and custom sidebar views.

## System impact

- Paseo remains the only source of truth for projects, workspaces, their order, and navigation.
- The plugin continues to own only an in-memory query and temporary DOM visibility changes.
- No server entry, settings document, network access, or persisted filter state is introduced.
- Lifecycle cleanup must restore every changed element exactly and prevent queued work from remounting the plugin after disable/reload.
- Desktop/web remains the supported surface. Native/mobile parity would require a separate custom-sidebar product, not a small extension of this plugin.

## Prioritized features

### P0: Harden lifecycle and DOM integration

Fix before adding user-facing features.

- Invalidate or cancel queued animation frames during cleanup so the filter cannot remount after disable/reload.
- Observe the narrowest stable sidebar ancestor after discovery rather than rescanning after every mutation anywhere in `document.body`.
- Preserve and restore each project's original inline `display` value.
- Move browser-only globals and DOM code into the documented `client/web.ts` boundary.
- Treat missing or changed anchors as a safe no-op and cover sidebar replacement/remount behavior.
- Replace the unbounded `>=0.10.1` claim with a compatibility range verified against actual Paseo versions.

Files:

- `client/sidebar-filter.ts` — split pure orchestration from browser-only implementation or replace with `client/web.ts`.
- `index.client.ts` — use the hardened lifecycle handle.
- `paseo-plugin.json` — declare a verified compatibility range.
- `shared/filter.test.mjs` plus one small DOM/lifecycle test file — cover cleanup and remount regressions.

### P1: Add clear filter feedback and accessibility

- Show a compact `No matching projects` state when a nonempty query has zero results.
- Show a restrained `N projects` count only if it remains visually quiet; the empty state is the required part.
- Restore visible keyboard focus for the input and clear button instead of relying on `outline: none`.
- Keep Escape and the clear button as the only clearing mechanisms.
- Treat punctuation-only normalized input consistently, preferably as an empty query.

Files:

- `client/web.ts` — render/update/remove feedback and focus styles.
- DOM/lifecycle tests — verify zero/one/many results, clear, Escape, and cleanup.
- `OVERVIEW.md` — mention the empty state only if useful to users.

### P2: Add “Focus project filter” to Command Center

This is the best small feature addition after reliability work.

- Register a web-only global Command Center item named `Focus project filter`.
- Add search keywords: `project`, `filter`, `sidebar`, `find`.
- Mount the input if needed, then focus it without adding a custom global shortcut.
- Do not register the action on native clients where the filter does not exist.

Files:

- `index.client.ts` — register and clean up the Command Center item.
- `client/web.ts` — expose a narrow `focus()` operation from the active filter instance.

### P3: Optional keyboard result navigation

Only implement after user feedback demonstrates demand.

- Down/Up moves between matching project rows.
- Enter opens the selected project.
- Escape continues to clear the query.

This increases dependence on Paseo's private DOM and click behavior, so it should not be part of the initial roadmap.

## Explicitly out of scope

- Persisted queries, query history, or a settings screen: stale filters make projects appear missing and add machinery without clear value.
- Sorting by activity, hiding empty projects, project nesting, labels, groups, colors, icons, and pinning: these belong to Paseo or a custom sidebar view such as Project groups.
- A complete custom sidebar/mobile implementation: it would duplicate native project/workspace rendering and make users replace the default sidebar merely to gain search.
- A separate workspace search screen: Paseo's Command Center already searches recent workspaces and agent/workspace titles.
- Search libraries, typo tolerance, ranking controls, or configurable fuzzy modes: the current matcher is adequate for a project list and has no dependency cost.

## Verification

Automated:

1. `npm test`
2. `npm run typecheck`
3. Lifecycle test: schedule an update, clean up before the frame, and assert no remount.
4. DOM test: preserve original display values, restore all groups, remount once after sidebar replacement, and ignore unrelated page mutations.
5. Behavior test: zero/one/many matches, punctuation-only input, clear button, Escape, and focus action.

Manual in Paseo desktop/web:

1. Test light and dark themes at wide and compact widths.
2. Filter by project display name and project key/path.
3. Verify the empty state and keyboard focus indicators.
4. Reload/disable with an active query and confirm every project is restored and the input stays removed.
5. Use ⌘K/Ctrl+K to run `Focus project filter` before and after the sidebar is recreated.
6. Confirm mutations from an active streaming agent do not repeatedly rescan the sidebar.

## Delivery sequence

1. **0.1.1** — lifecycle safety, scoped observation, exact style restoration, browser-boundary cleanup, DOM smoke tests, verified Paseo range.
2. **0.1.2** — no-results state and focus accessibility.
3. **0.2.0** — Command Center focus action.
4. Stop unless real usage justifies keyboard result navigation.

## Research sources

- Paseo plugin reference: https://paseo.sh/docs/plugins/reference.md
- Paseo custom sidebar views: https://paseo.sh/docs/plugins/sidebar-views.md
- Paseo custom-sidebar API rationale: https://github.com/getpaseo/paseo/pull/8906
- Paseo project visibility issue: https://github.com/getpaseo/paseo/issues/9182
- Paseo recent-activity sidebar proposal: https://github.com/getpaseo/paseo/pull/6932
- Project groups plugin: https://github.com/topar12/paseo-project-groups
- VS Code Explorer filtering: https://code.visualstudio.com/docs/getstarted/userinterface
- JetBrains Speed Search: https://www.jetbrains.com/help/idea/speed-search-in-the-tool-windows.html
- WCAG focus visibility: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html

# Sidebar Project Filter Plugin Plan

Summary: Create a small local Paseo desktop plugin that adds a search box to the sidebar and filters project groups as the user types. Keep it client-only, dependency-free at runtime, and easy to remove.

Context:

- Paseo 0.10.1 exposes stable `sidebar-project-row-*` test IDs but no plugin API for inserting a sidebar search field.
- The existing clusters plugin uses the same DOM seam successfully, but includes far more state and behavior than needed.
- The plugin belongs in `~/.local/share/paseo-plugins/sidebar-project-filter`; no server entry or persisted backend state is needed.

System Impact:

- The native project/workspace data remains Paseo’s source of truth.
- The plugin owns only the current search string in memory.
- A `MutationObserver` reapplies the filter when Paseo changes the sidebar.
- Cleanup removes the injected search field, disconnects observers/listeners, and restores every hidden project group.
- Desktop/web only; mobile remains unchanged.

Approach:

- Inject one styled search input near the sidebar’s “New workspace” control.
- Match case-insensitively against the visible project name and project row key/path.
- Hide or restore the whole project group with `style.display`; do not alter Paseo stores or project data.
- Support Escape and a clear button. An empty query restores all projects.

Changes:

- `paseo-plugin.json` — declare the local plugin and Paseo compatibility.
- `package.json` / `tsconfig.json` — provide local typechecking and a tiny Node test command.
- `index.client.ts` — start and clean up the desktop sidebar filter.
- `client/sidebar-filter.ts` — mount the input, observe sidebar changes, filter project groups, and restore the DOM on unload.
- `shared/filter.ts` — pure normalized matching helper.
- `shared/filter.test.ts` — verify case-insensitive name/path matching and empty-query behavior.
- `README.md` — document installation, reload, and removal.

Verification:

- Run `npm install`, `npm run typecheck`, and `npm test` in the plugin directory.
- Install as a local directory only after explicit approval.
- Manually verify matching, no-match, clear/Escape, newly added projects, and full DOM restoration after plugin disable/reload.

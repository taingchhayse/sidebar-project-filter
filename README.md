# Sidebar Project Filter

A private, client-only Paseo desktop plugin that adds a project search box above the sidebar workspace controls.

## Install

```bash
cd ~/.local/share/paseo-plugins/sidebar-project-filter
npm install
npm run typecheck
npm test
paseo plugin install "$PWD"
```

Reload after source changes:

```bash
paseo plugin reload sidebar-project-filter
```

Remove it:

```bash
paseo plugin remove sidebar-project-filter
```

The query is kept only in memory. The plugin does not use the network or write project data.

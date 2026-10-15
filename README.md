# Sidebar Project Filter

A client-only Paseo plugin that adds a project search box above the sidebar workspace controls. Type part of a project name or path to show only matching project groups and their workspaces.

## Install

```bash
paseo plugin add git:taingchhayse/sidebar-project-filter
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

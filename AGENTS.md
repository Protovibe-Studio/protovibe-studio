# AGENTS.md: Protovibe Monorepo Context Rules

Protovibe is a monorepo containing several independent sub-projects. **You must always work within a single project context — never across multiple at once.**

## Folder Structure

```
protovibe/
├── protovibe-project-manager/   # Home screen app (create/run/delete projects)
├── protovibe-project-template/  # Template copied when a new project is created
└── projects/                    # Runtime-created projects (copies of the template)
    ├── MyProject/
    └── AnotherProject/
```

## Critical Rule: Work in One Context at a Time

Each of the following is a **fully independent app** with its own `package.json`, `node_modules`, and dev server:

- `protovibe-project-manager/`
- `protovibe-project-template/`
- `projects/<ProjectName>/` (each subdirectory is separate)

**Do not mix concerns across these boundaries.** If you are working on `projects/MyProject/`, do not read, modify, or reference files from `protovibe-project-manager/` or `protovibe-project-template/`, and vice versa.

When given a task:
1. Identify which single sub-project the task belongs to.
2. Confine all reads, edits, and commands to that sub-project's directory.
3. Run `pnpm install` and `pnpm dev` from within that sub-project's directory, not the monorepo root.

## Which Context to Use

| Task | Directory |
|------|-----------|
| Managing projects (create/delete/run) | `protovibe-project-manager/` |
| Editing the shared template or the vite plugin | `protovibe-project-template/` |
| Working on a specific user project | `projects/<ProjectName>/` |

## Projects in `projects/`

Projects under `projects/` are normally created and managed via the project manager UI. When a coding agent is asked to work on one, open **only that project's folder** as the working root. Each project is a self-contained copy and has its own `AGENTS.md` with component-authoring rules.

## Sub-project-specific Rules

Each sub-project may contain its own `AGENTS.md` with additional rules relevant to that context. Always read and follow those rules when working inside that sub-project.

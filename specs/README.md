# psf-memo Specifications

This directory holds cross-component and per-component behavior specifications.

## Layout

```text
specs/
├── README.md             # this file
├── feature-backlog.md    # monorepo-wide prioritized backlog
└── (per-component specs live next to their component)
```

Per-component feature files:

- `psf-memo-client/specs/*.feature` — React SPA behavior (write + read paths)
- `psf-memo-indexer/specs/*.feature` — indexer behavior (future)
- `psf-memo-db/specs/*.feature` — DB REST API behavior (future)

## Why split specs by component?

A single user-facing feature (e.g. "Like a Memo") usually needs coordinated
changes in all three layers:

1. **psf-memo-db** exposes a new route or store for like counts / liked state.
2. **psf-memo-indexer** parses and stores `0x6d04` like transactions.
3. **psf-memo-client** renders the heart icon, modal, and broadcast.

Keeping feature files next to the component they exercise lets that component's
acceptance pipeline own the spec. The monorepo backlog (`feature-backlog.md`)
tracks which components are touched by each user-facing feature.

## Gherkin conventions

- Each feature file uses `Feature:`, one optional `Background:`, and `Scenario`
  or `Scenario Outline:` with `Examples:`.
- Name each scenario `Feature Name - N`.
- Put a `#` comment listing all scenario names immediately before the
  `Feature:` line.
- Use `<parameter>` placeholders for values that vary and improve mutation.
- Prune identical example-table columns that do not improve Gherkin acceptance
  mutation.
- Run `bb gherkin-ir-dry-checker` on each IR to normalize and prune before
  handing off.

# psf-memo-db Specifications

This directory holds Gherkin feature files that specify the LevelDB REST API:
CRUD routes, query endpoints, backup/restore, and health checks.

Feature files here exercise `psf-memo-db` in isolation. Cross-component
features that also touch the client or indexer are tracked in the root backlog
at `specs/feature-backlog.md`.

## Conventions

- Use `Feature:`, one optional `Background:`, `Scenario` or `Scenario Outline:`.
- Name each scenario `Feature Name - N`.
- List scenario names in a `#` comment immediately before the `Feature:` line.
- Use `<parameter>` placeholders for mutation-relevant values.

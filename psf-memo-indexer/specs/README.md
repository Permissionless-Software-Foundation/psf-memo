# psf-memo-indexer Specifications

This directory holds Gherkin feature files that specify indexer behavior:
how the indexer detects, parses, validates, and stores Memo protocol
transactions.

Feature files here exercise `psf-memo-indexer` in isolation. Cross-component
features that also touch the client or DB are tracked in the root backlog at
`specs/feature-backlog.md`.

## Conventions

- Use `Feature:`, one optional `Background:`, `Scenario` or `Scenario Outline:`.
- Name each scenario `Feature Name - N`.
- List scenario names in a `#` comment immediately before the `Feature:` line.
- Use `<parameter>` placeholders for mutation-relevant values.

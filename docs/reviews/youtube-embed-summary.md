# Review: youtube-embed

**By architect.**

## Task and commits reviewed
- Task: `youtube-embed` — render YouTube links in Memo post text as embedded players in
  the recent-posts feed, preserving surrounding text and leaving non-embeddable URLs as
  plain text. Read-only rendering feature in psf-memo-client (no Memo action, no DB change).
- Inbound handoff: refactorer `93baa25ad0` (merged fast-forward onto `swarmforge-architect`).
- Reviewed commits: `1466854` (spec), `8e606ae` (implementation by coder), `93baa25`
  (refactorer CRAP reduction). The merged refactorer branch also carried `4eea327`
  (psf-memo-db CRAP/DRY, a separate task) which was verified but is not the focus here.

## Architectural findings and fixes applied
- **Good UI/Core separation:** `youtube-embed.js` is a pure service module with no React or
  network dependencies, so the parser is directly unit-testable. `post-content.js` is written
  in plain `React.createElement` style so the same component is reused by the browser JSX
  build and by the acceptance adapter (`render-post.js`), which renders it to static HTML
  under Node. Acceptance assertions therefore inspect the same markup the browser renders.
- **Refactorer CRAP reduction:** extracted `validVideoId`, `parseCandidate`,
  `videoIdFromWatchUrl`, `videoIdFromShortUrl`, and `pushText` helpers. All functions now
  have cyclomatic complexity ≤ 5 and CRAP ≤ 5.0 (well under threshold).
- **Hardening (this review):** added two unit tests to kill mutation survivors — a watch URL
  with an invalid video id (special characters) and a `youtube.com` URL that is not `/watch`.
- **Carried-in psf-memo-db work (`4eea327`, separate task):** extracted pure filename/path
  helpers into testable `db-backup-util.js` (keeping the zip/unzip adapter a thin shell) and
  a shared `handleControllerError` across 7 REST controllers. Architecturally sound; verified
  healthy but not the subject of this handoff.

## Verification results
- **Language mutation** (`mutate4javascript src/services/youtube-embed.js --max-workers 8 --mutate-all`):
  Killed 6, Survived 1, Uncovered 0.
  - Survivor `line 82 1 -> 0` in `parsePostText` (`match[1]` → `match[0]`) is a **genuine
    equivalent**: `URL_RE`'s capture group spans the entire pattern, so `match[0]` ===
    `match[1]`. Documented, not chased.
- **DRY** (`dry4javascript src/services/youtube-embed.js`): no duplicate candidates.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft` on `youtube-embed.feature`):
  7 killed, 18 survived. All 18 survivors are single-character case/value mutations of example
  values (addresses, txids, text, URLs) used consistently on both the setup and assertion sides
  of their scenarios — intrinsic equivalents for a read-only feature, not implementation gaps.
- **CRAP** (`crap4javascript src/services/youtube-embed.js`): all functions CC ≤ 5, CRAP ≤ 5.0.

## Suite status
- psf-memo-client: 260 unit passing, 33 property passing, all acceptance suites PASS
  (including the new youtube-embed scenarios 1-3), lint clean, build OK.
- psf-memo-db (carried-in merge): 331 unit passing, lint clean.

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the review commit for follow-up
  review.

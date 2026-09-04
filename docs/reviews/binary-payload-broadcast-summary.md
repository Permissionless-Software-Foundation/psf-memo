# Architect Review — binary-payload-broadcast

**Reviewed commits**
- `62e0479` Specify binary hash160 broadcast payload for follow/mute (specifier)
- `5e1f473` Broadcast follow/mute/unfollow/unmute hash160 payloads as Uint8Array (coder)
- `53f6b90` / `8d40f2b` Deduplicate Memo follow/mute onto shared MemoStateAction base (refactorer)

**Task**: Follow/unfollow and mute/unmute must broadcast the target's raw
20-byte hash160 (not its display-form cash address text) as the OP_RETURN
payload, and must not depend on the Node-only `Buffer` global. The refactorer
also consolidated the previously near-identical `MemoFollow`/`MemoMute` action
classes onto a shared `MemoStateAction` base.

## Architectural findings

**UI/Core separation — good.** The follow/mute services remain pure logic over
injected `wallet`/`profiles` adapters. No UI, framework, or IO leaked into the
core; everything network/UI-specific stays behind the small wallet/profile
adapter boundaries. The modules remain fully testable without launching a UI or
network.

**Dependency rule — good.** `MemoFollow`/`MemoMute` → `MemoStateAction` →
`MemoAction` → `hex`/`utf8`. High-level action semantics depend on low-level
byte/hex helpers through a stable base; the direction is inward. The base
subclasses (`MemoFollow`, `MemoMute`) are thin facades exposing only
`follow`/`unfollow` and `mute`/`unmute`.

**Information hiding / encapsulation — good.** `MemoStateAction` encapsulates
the shared validate → toHash160 → hexToBytes → sendOpReturn → reflect
transition. Subclasses expose only config (`followConfig`/`muteConfig`) and
their two public methods; static exports and the public API are preserved. The
20-byte length lives on the base as `PK_HASH_LENGTH`, surfaced on both
subclasses.

**Local code quality.** The refactor is a clean DRY extraction (~150 duplicate
lines removed). Two minor, pre-existing notes (not requiring change):
- Each config carries a `prefix` key that is unused (state actions pass the
  prefix explicitly to `_setState`); harmless dead config carried over from the
  prior `MemoAction` contract.
- `MemoStateAction.validate` throws a typed error whereas the base
  `MemoAction.validate` returns `{ok:false}`; contract difference is intended
  and documented in the module header.

No architectural changes were required. The merged work confirms and preserves
the earlier binary `Uint8Array` broadcast behavior (`hexToBytes`) and the
Buffer-free production source.

## Verification

All per-component verification for `psf-memo-client` (the only touched
component) passed.

- **Unit tests**: 280/280 pass
- **Property tests**: 40/40 pass (run separately, as required)
- **Lint**: clean (`standard`)
- **Acceptance**: all 23 generated feature suites pass, including the new
  `binary-payload-broadcast.feature`
- **Language mutation** (`mutate4javascript --mutate-all --max-workers 8`):
  - `memo-follow.js`: 2 killed, 0 survived, 0 uncovered
  - `memo-mute.js`: 2 killed, 0 survived, 0 uncovered
  - `memo-state-action.js` (new base): 5 killed, 0 survived, 0 uncovered
  - `hex.js`/`memo-action.js` unchanged and unaffected.
- **DRY** (`dry4javascript`) on `memo-state-action.js`/`memo-follow.js`/
  `memo-mute.js`: no duplicate candidates.

## Soft Gherkin acceptance mutation (survivors)

`gherkin-mutator --level soft` over `binary-payload-broadcast.feature`:
4 mutations run, 4 survived, 0 killed, 0 errors. All four are single-character
**case** mutations of the shared example cash address (`q`→`Q`, `x`→`X`,
`c`→`C`, `k`→`K`). Each mutated example is applied consistently on both the
broadcast setup side and the assertion side of its scenario, so the scenario
still passes under the mutation (both sides derive from the same mutated
value). These are **genuine intrinsic equivalents**, not implementation gaps,
and match the documented read-only-payload survivor pattern. Documented here;
no chase performed.

## Handoffs

No functional handoffs sent. The work was a review of an already-functional
refactorer merge; my branch adds only the durable review summary plus the
tool-refreshed manifests (mutation `tested_at` timestamps and the new
acceptance-mutation manifest) from the verification runs. Function and module
hashes in the mutation manifests are unchanged, confirming no code drift.

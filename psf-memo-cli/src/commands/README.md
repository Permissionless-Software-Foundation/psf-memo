# Commands

All commands should follow the same structure:
- async **run()** is the primary execution function. This function shoudl always include a try/catch handler to report errors. 
- **validateFlags()** should run first and preform input validation on input flags.

## Output and exit codes

New `memo-*` commands adopt the shared reporter in `src/lib/reporter.js` so
every command has one machine-readable interface:

- Human mode prints a readable result to stdout; `--json` prints exactly one
  JSON object to stdout (`{ "message": ..., ...fields }`).
- Failures print the real error on stderr -- as `{ "error": ... }` in JSON mode.
  Diagnostics always go to stderr, never to stdout.
- Exit codes: `0` success, `1` runtime/validation failure, `2` usage failure
  (missing or invalid required flags).

A command returns `{ message, data }`, and `runCommand` turns that into output
plus an exit code:

```js
import { runCommand, UsageError } from '../lib/reporter.js'

async run (flags) {
  process.exitCode = await runCommand(async () => {
    // ... do the work ...
    return { message: 'Read 3 posts', data: { posts } }
  }, { json: flags.json })
}
```

A missing required flag throws a `UsageError` (from `reporter.js`) so the
process exits `2`; any other thrown error exits `1`.

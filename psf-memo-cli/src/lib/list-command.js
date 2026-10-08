/*
  Shared scaffolding for read commands that report a formatted page.

  Each command supplies its own flag parser, read method, and summary formatter;
  this base class owns the validate -> read -> report pipeline, the read-only
  client wiring, and commander's method binding, mirroring read-command.js for
  the generic read path and post-page-command.js for the post-page path.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runOutcomeCommand } from './read-command.js'

export class ListReadCommand {
  constructor (options, readMethod) {
    this.readMethod = readMethod
    initReadCommand(this, options, readMethod)
  }

  // Validate the flags, read through this.readMethod, and report this.format.
  // Returns the exit code (0/1/2) and assigns it to process.exitCode.
  async run (flags = {}) {
    return runOutcomeCommand({
      command: this,
      flags,
      readMethod: this.readMethod,
      format: (result) => this.format(result)
    })
  }

  // Validate and resolve the command's flags before any request. Throws a
  // UsageError (exit 2) when they are invalid.
  validateFlags (flags) {
    return this.parseFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }
}

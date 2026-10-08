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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T00:45:40.422Z","module_hash":"84caba208dce064fefd707aec4e481a05e919cd5c9766ceb887a6b766455e363","functions":[{"id":"func/ListReadCommand.constructor","name":"ListReadCommand.constructor","line":14,"end_line":17,"hash":"98fe076523e33c5377249238266af71332d0faeac837b7cacbd7608759cf8416"},{"id":"func/ListReadCommand.run","name":"ListReadCommand.run","line":21,"end_line":28,"hash":"f3f269723024f80109f0ffe6abe5bb9660b62251a911389bf96d78e06c6f7b15"},{"id":"func/ListReadCommand.validateFlags","name":"ListReadCommand.validateFlags","line":32,"end_line":34,"hash":"764e184c7075ff5880e5da41bb4a91d0a67620cc92870b887d1cde5fb9313747"},{"id":"func/ListReadCommand.createClient","name":"ListReadCommand.createClient","line":37,"end_line":39,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"}]}
// mutate4javascript-manifest-end

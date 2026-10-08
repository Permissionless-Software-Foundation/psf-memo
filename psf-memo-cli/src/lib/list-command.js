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

// Build a command class for a paginated list read. The factory owns the
// validate -> read -> report pipeline and the read-only client wiring, while
// each command declares only its flag parser, reader, list field, and formatter.
// `format` receives the list items and the service pagination unchanged.
export function defineListReadCommand ({ readMethod, clientMethod, listField, parseFlags, format }) {
  return class extends ListReadCommand {
    constructor (options = {}) {
      super(options, readMethod)
      this.listField = listField
      this.clientMethod = clientMethod
      this.parseFlagsImpl = parseFlags
      this.formatImpl = format
    }

    // Validate and resolve the page flags before any request. Throws a
    // UsageError (exit 2) for bad page flags.
    parseFlags (flags) {
      return this.parseFlagsImpl(flags)
    }

    // Render the reported list items and the service pagination unchanged.
    format (result) {
      const { [this.listField]: items = [], pagination = {} } = result

      return {
        message: this.formatImpl(items, pagination),
        data: { [this.listField]: items, pagination }
      }
    }

    // Fetch one page of the list described by the command's client method.
    async [readMethod] ({ limit, offset, dbUrl }) {
      return this.createClient(dbUrl)[this.clientMethod]({ limit, offset })
    }
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:51:05.324Z","module_hash":"b3fc264a61a0eb422d419cfae2ee8d500b32a9784440a65e229dd9c20920f6ec","functions":[{"id":"func/ListReadCommand.constructor","name":"ListReadCommand.constructor","line":14,"end_line":17,"hash":"98fe076523e33c5377249238266af71332d0faeac837b7cacbd7608759cf8416"},{"id":"func/ListReadCommand.run","name":"ListReadCommand.run","line":21,"end_line":28,"hash":"f3f269723024f80109f0ffe6abe5bb9660b62251a911389bf96d78e06c6f7b15"},{"id":"func/ListReadCommand.validateFlags","name":"ListReadCommand.validateFlags","line":32,"end_line":34,"hash":"764e184c7075ff5880e5da41bb4a91d0a67620cc92870b887d1cde5fb9313747"},{"id":"func/ListReadCommand.createClient","name":"ListReadCommand.createClient","line":37,"end_line":39,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/defineListReadCommand","name":"defineListReadCommand","line":46,"end_line":77,"hash":"5cd6b8746f049136cb36cacbb44422444af35ae91171f83426ffdcae70148489"},{"id":"func/AnonymousClass.constructor","name":"AnonymousClass.constructor","line":48,"end_line":54,"hash":"cc7b3d296a7b4e4c763355973868d96af514b97a384f8fb5c4de5b598ca0201c"},{"id":"func/AnonymousClass.parseFlags","name":"AnonymousClass.parseFlags","line":58,"end_line":60,"hash":"2a1f69c470500286674518d0c62e26a47f7bc042c46de81d2ae57c9462f35a44"},{"id":"func/AnonymousClass.format","name":"AnonymousClass.format","line":63,"end_line":70,"hash":"83fddff6c9dd2050c6ec9cd0fcc354eb38e96d86c38e217759a9707195f1114a"},{"id":"func/AnonymousClass.readMethod","name":"AnonymousClass.readMethod","line":73,"end_line":75,"hash":"508db2fa2b7f21aac84d564092f322ac6ee60ff1d6f7c1431172acd95336cfb3"}]}
// mutate4javascript-manifest-end

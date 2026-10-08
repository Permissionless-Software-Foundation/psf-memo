/*
  Shared scaffolding for read-only Memo DB commands.

  Each command validates and resolves its own flags, reads its own resource
  through the Memo DB client, and maps the result to a reporter outcome. This
  module owns the dependency wiring, the read-only client, and the reporter /
  exit-code plumbing so those commands stay thin, mirroring send-command.js for
  the write path.
*/

// Local libraries
import MemoDb from './memo-db.js'
import { runCommand } from './reporter.js'
import { bindMethods } from './bind-methods.js'

// Wire the shared read-command dependencies onto `command` and bind the command
// methods -- including the supplied service-read method -- so they survive
// commander's callback dispatch.
export function initReadCommand (command, {
  MemoDbClass = MemoDb,
  fetchImpl,
  dbUrl,
  envUrl = process.env.MEMO_DB_URL,
  stdout,
  stderr
} = {}, readMethod) {
  // Encapsulate dependencies so tests and acceptance can inject a fake service
  // and capture output instead of touching the network or terminal.
  command.MemoDbClass = MemoDbClass
  command.fetchImpl = fetchImpl
  command.dbUrl = dbUrl
  command.envUrl = envUrl
  command.stdout = stdout
  command.stderr = stderr

  bindMethods(command, ['run', 'validateFlags', 'createClient', readMethod])
}

// Build the read-only Memo DB client, honoring a --db-url override.
export function createMemoDbClient (command, dbUrl) {
  return new command.MemoDbClass({
    dbUrl: dbUrl || command.dbUrl,
    envUrl: command.envUrl,
    fetchImpl: command.fetchImpl
  })
}

// Run a read command's outcome through the shared reporter and publish the
// exit code. `outcome` returns { message, data } (or nothing).
export async function runReadCommand ({ command, flags, outcome }) {
  const code = await runCommand(outcome, {
    json: flags.json,
    stdout: command.stdout,
    stderr: command.stderr
  })

  process.exitCode = code
  return code
}

// Run the shared read pipeline: validate the flags, read through the command's
// own read method, then map the result to a { message, data } outcome with
// `format`. Read commands that report a non-post page reuse this so the
// validate -> read -> report shape lives in one place.
export async function runOutcomeCommand ({ command, flags, readMethod, format }) {
  return runReadCommand({
    command,
    flags,
    outcome: async () => {
      const fields = command.validateFlags(flags)
      const result = await command[readMethod]({ ...fields, dbUrl: flags.dbUrl })

      return format(result)
    }
  })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T02:26:14.496Z","module_hash":"1b6009ed267c4c9352a02d0282f52db9e8be09d87bcc4c1a84db7af0c38a047a","functions":[{"id":"func/initReadCommand","name":"initReadCommand","line":19,"end_line":37,"hash":"6927e0c1c451d51b91724a4c8b575ff5917627e0012bb7e418f5f6c709cc0170"},{"id":"func/createMemoDbClient","name":"createMemoDbClient","line":40,"end_line":46,"hash":"16346e25f50d734aa1114b00a78165bef28a7a51dfd66710161afbd3097391c1"},{"id":"func/runReadCommand","name":"runReadCommand","line":50,"end_line":59,"hash":"b0975f420d4daceee6a48daacf4a57bcdbe53d35fbe21a186ebbedf6b8939aee"}]}
// mutate4javascript-manifest-end

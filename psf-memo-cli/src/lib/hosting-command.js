/*
  Shared base and factory for read-only bch-file-hosting commands.

  file-check and file-status validate a required flag, look up hosting state
  through the hosting API, and report the result through the shared reporter.
  They differ only in the flag, the look-up, and the rendering, so those three
  pieces are supplied as a spec and this module owns the dependency wiring and
  the validate -> look-up -> report pipeline.
*/

// Local libraries
import defaultConfig from '../../config/index.js'
import HostingApi from './hosting-api.js'
import { runCommand, UsageError } from './reporter.js'
import { bindMethods } from './bind-methods.js'

class HostingCommand {
  constructor ({
    HostingApiClass = HostingApi,
    config = defaultConfig,
    fetchImpl,
    stdout,
    stderr,
    flag,
    lookup,
    format
  } = {}) {
    // Encapsulate dependencies so tests and acceptance can inject a fake API
    // and capture output instead of touching the network or terminal.
    this.config = config
    this.hostingApi = new HostingApiClass({ config, fetch: fetchImpl })
    this.stdout = stdout
    this.stderr = stderr
    this.flag = flag
    this.lookup = lookup
    this.format = format

    bindMethods(this, ['run', 'validateFlags'])
  }

  // Validate the flags, look the resource up, render it, and publish the exit
  // code for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      const fields = this.validateFlags(flags)
      const result = await this.lookup(this.hostingApi, fields)

      return { message: this.format(result), data: result }
    }, {
      json: flags.json,
      stdout: this.stdout,
      stderr: this.stderr
    })

    process.exitCode = code
    return code
  }

  // Resolve the command's required flag, throwing its usage error (exit 2)
  // when it is missing.
  validateFlags (flags = {}) {
    const { name, message } = this.flag

    return { [name]: requireUsageFlag(flags, name, message) }
  }
}

// Build a hosting command class from its spec: the required flag descriptor,
// the look-up `(hostingApi, fields) => result`, and the `(result) => string`
// renderer.
export function createHostingCommand (spec) {
  return class extends HostingCommand {
    constructor (options = {}) {
      super({ ...spec, ...options })
    }
  }
}

// Resolve a required flag, throwing the supplied usage error when it is
// missing.
function requireUsageFlag (flags, name, message) {
  const value = flags[name]
  if (!value) throw new UsageError(message)

  return value
}

export { requireUsageFlag }
export default HostingCommand

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:36:48.678Z","module_hash":"568c0d27b54dff3d1c0ccddafff11ff22dffa99253331a0382024210a2457a7e","functions":[{"id":"func/HostingCommand.constructor","name":"HostingCommand.constructor","line":18,"end_line":39,"hash":"4ab648bec934f6867ff52f0c8841f1e6bc9da812a7a1cbdbc8216275329d8f5e"},{"id":"func/HostingCommand.run","name":"HostingCommand.run","line":43,"end_line":57,"hash":"e9903bc32cffb98a7a0da6830dea870ac69f80c3954f23d96efdcd61c3c3e5de"},{"id":"func/HostingCommand.validateFlags","name":"HostingCommand.validateFlags","line":61,"end_line":65,"hash":"3a3918aa36d00dad5ccdd4d6fcf27d29ab5928c65d9aa73cedcc2c607901c621"},{"id":"func/createHostingCommand","name":"createHostingCommand","line":71,"end_line":77,"hash":"cf4ca7f935c93b3e83c44d348f52df2db672f7c41128de8d1af260f8c600d0cf"},{"id":"func/AnonymousClass.constructor","name":"AnonymousClass.constructor","line":73,"end_line":75,"hash":"5614c89b4fb0bea43c1b750503cedaa4598b9c4b4ae081b70abd8fedbf2d3cd5"},{"id":"func/requireUsageFlag","name":"requireUsageFlag","line":81,"end_line":86,"hash":"b4ec5a927ba4a2bfcd8549504ae7180c464079652714dc71225ea364d7b0308c"}]}
// mutate4javascript-manifest-end

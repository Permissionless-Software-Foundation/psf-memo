/*
  file-status: look up a hosted file by CID.

  A read-only command for the bch-file-hosting GET /files/:cid route. The file
  is identified by its CID via the required -c flag. It reports the CID, name,
  size, status, hosting window, and pins. GET /files/:cid returns metadata and
  pins but no download/view URLs; those come from file-check. No wallet and no
  payment. A missing -c flag is a usage error (exit 2); an unknown CID or an
  API error is a runtime error (exit 1).
*/

// Local libraries
import config from '../../config/index.js'
import { runCommand, UsageError } from '../lib/reporter.js'
import HostingApi from '../lib/hosting-api.js'
import { formatFileStatusMessage } from '../lib/file-status.js'
import { bindMethods } from '../lib/bind-methods.js'

class FileStatus {
  constructor ({
    HostingApiClass = HostingApi,
    config: cfg = config,
    fetchImpl,
    stdout,
    stderr
  } = {}) {
    // Encapsulate dependencies so tests and acceptance can inject a fake API
    // instead of touching the network.
    this.config = cfg
    this.hostingApi = new HostingApiClass({ config: cfg, fetch: fetchImpl })
    this.stdout = stdout
    this.stderr = stderr

    bindMethods(this, ['run', 'validateFlags'])
  }

  // Read the file record and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      const { cid } = this.validateFlags(flags)
      const file = await this.hostingApi.getStatus({ cid })

      return { message: formatFileStatusMessage(file), data: file }
    }, {
      json: flags.json,
      stdout: this.stdout,
      stderr: this.stderr
    })

    process.exitCode = code
    return code
  }

  // Validate and resolve the required -c CID before any request. Throws a
  // UsageError (exit 2) when it is missing.
  validateFlags (flags = {}) {
    if (!flags.cid) {
      throw new UsageError('You must specify a CID with the -c flag.')
    }

    return { cid: flags.cid }
  }
}

export default FileStatus

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:29:25.745Z","module_hash":"7b3fb666629c5c5730a082b9ce29c23a763c90a80c04233e55da7f5e4ce11987","functions":[{"id":"func/FileStatus.constructor","name":"FileStatus.constructor","line":20,"end_line":35,"hash":"57708a11e0ea9505be20cdbd8a6da71d1942e7c4324ee2e4a07d97c956dc29cb"},{"id":"func/FileStatus.run","name":"FileStatus.run","line":39,"end_line":53,"hash":"7dfe3b0d7a5393ed348f177906b1db664e1796369f71f24eb65933080ad86e4a"},{"id":"func/FileStatus.validateFlags","name":"FileStatus.validateFlags","line":57,"end_line":63,"hash":"6044b063049a4229132b41279c570ab4220ae01a20dc5fda4dff9a97824afbc7"}]}
// mutate4javascript-manifest-end

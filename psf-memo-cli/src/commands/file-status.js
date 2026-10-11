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

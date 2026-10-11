/*
  file-upload: upload a local file to the bch-file-hosting REST API.

  Quote-only. The command reads a local file, POSTs it to the hosting API, and
  reports the price quote (file name, size, billed size when it differs, price,
  payment address, and expiry) or the already-hosted download/view links. It
  never touches a wallet and never pays, so a caller can pay from any external
  wallet and recover the links later with file-check. A missing -f flag is a
  usage error (exit 2) with no upload; a missing local file or an API rejection
  is a runtime error (exit 1).
*/

// Node libraries
import fs from 'node:fs'
import path from 'node:path'

// Local libraries
import config from '../../config/index.js'
import { runCommand, UsageError } from '../lib/reporter.js'
import HostingApi from '../lib/hosting-api.js'
import { formatFileUploadMessage } from '../lib/file-upload.js'
import { bindMethods } from '../lib/bind-methods.js'

class FileUpload {
  constructor ({
    HostingApiClass = HostingApi,
    config: cfg = config,
    fetchImpl,
    readFile,
    stdout,
    stderr
  } = {}) {
    // Encapsulate dependencies so tests and acceptance can inject a fake API
    // and file reader instead of touching the network or disk.
    this.config = cfg
    this.hostingApi = new HostingApiClass({ config: cfg, fetch: fetchImpl })
    this.readFile = readFile || fs.readFileSync
    this.stdout = stdout
    this.stderr = stderr

    bindMethods(this, ['run', 'validateFlags', 'readLocalFile'])
  }

  // Upload the file and report the quote. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      const buffer = this.readLocalFile(flags.file)
      const filename = path.basename(flags.file)
      const result = await this.hostingApi.upload({ filename, buffer })

      return { message: formatFileUploadMessage(result), data: result }
    }, {
      json: flags.json,
      stdout: this.stdout,
      stderr: this.stderr
    })

    process.exitCode = code
    return code
  }

  // Validate the required -f file flag before reading or uploading. Throws a
  // UsageError (exit 2) when it is missing.
  validateFlags (flags = {}) {
    if (!flags.file) {
      throw new UsageError('You must specify a file with the -f flag.')
    }

    return true
  }

  // Read the local file, mapping any read failure to the documented message.
  readLocalFile (filePath) {
    try {
      return this.readFile(filePath)
    } catch (err) {
      throw new Error(`Cannot read file: ${filePath}`)
    }
  }
}

export default FileUpload

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
import { createHostingCommand } from '../lib/hosting-command.js'
import { formatFileStatusMessage } from '../lib/file-status.js'

const CID_FLAG_ERROR = 'You must specify a CID with the -c flag.'

export default createHostingCommand({
  flag: { name: 'cid', message: CID_FLAG_ERROR },
  lookup: (hostingApi, { cid }) => hostingApi.getStatus({ cid }),
  format: formatFileStatusMessage
})

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:36:48.858Z","module_hash":"d9dc7e4f250b56b82239d4a0caaee1f39040572ff91759b77b8e71b5b4af5d67","functions":[]}
// mutate4javascript-manifest-end

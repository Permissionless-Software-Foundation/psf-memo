/*
  memo-topics: read one page of the Memo topic list.

  A read-only command for the psf-memo-db GET /topics route. It reports the
  topics (room, post count, last-post time as lastSeen, and follower count) in
  the service's order and the service pagination unchanged. A failed request is
  an error (exit 1). No wallet and no broadcast.
*/

// Local libraries
import { defineListReadCommand } from '../lib/list-command.js'
import { parseTopicsFlags, formatTopicsMessage } from '../lib/memo-topics.js'

const MemoTopics = defineListReadCommand({
  readMethod: 'readTopics',
  clientMethod: 'getTopics',
  listField: 'topics',
  parseFlags: parseTopicsFlags,
  format: formatTopicsMessage
})

export default MemoTopics

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:46:57.799Z","module_hash":"848a4b9ac1731717af27e0b64c2ed54c5e1f4b8699097f95fbaa76f8b130c178","functions":[]}
// mutate4javascript-manifest-end

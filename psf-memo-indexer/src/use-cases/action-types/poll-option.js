import { storePollChildRecord } from './poll-child.js'

export async function handleAddPollOption (ctx) {
  return storePollChildRecord({
    ctx,
    db: ctx.adapters.pollOptionDb,
    valueField: 'option',
    label: 'add-poll-option',
    emptyMessage: 'empty poll option'
  })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:29:33.229Z","module_hash":"50ee5536a207f62677a966a88ecd995602dde333aa18d3f0d71dd9d3b8853874","functions":[{"id":"func/handleAddPollOption","name":"handleAddPollOption","line":3,"end_line":11,"hash":"50244872bf651830f3bc2587a8ad42634a2a40fe3a65bcba0e19a3f0d0a5da88"}]}
// mutate4javascript-manifest-end

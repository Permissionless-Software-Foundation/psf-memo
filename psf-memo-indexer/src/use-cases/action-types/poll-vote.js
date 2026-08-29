import { storePollChildRecord } from './poll-child.js'

export async function handlePollVote (ctx) {
  return storePollChildRecord({
    ctx,
    db: ctx.adapters.pollVoteDb,
    valueField: 'comment',
    label: 'poll-vote',
    emptyMessage: 'empty poll vote comment'
  })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:29:57.015Z","module_hash":"8be639071a4a0e8fb44c6a083a8625571b14b3abc47c455ce9e83067ed1f8a1f","functions":[{"id":"func/handlePollVote","name":"handlePollVote","line":3,"end_line":11,"hash":"c734c3f5457394be8929e28526ea2f1ff5cc456e8ea9a4a2eaa9792ee11ef135"}]}
// mutate4javascript-manifest-end

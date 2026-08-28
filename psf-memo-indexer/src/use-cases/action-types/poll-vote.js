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

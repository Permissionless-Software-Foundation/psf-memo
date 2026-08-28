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

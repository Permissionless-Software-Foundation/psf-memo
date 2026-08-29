import { handleSetName } from './set-name.js'
import { handlePost } from './post.js'
import { handleReply } from './reply.js'
import { handleLike } from './like.js'
import { handleSetProfile } from './set-profile.js'
import { handleFollow } from './follow.js'
import { handleSetProfilePic } from './set-profile-pic.js'
import { handleTopicMessage } from './topic-message.js'
import { handleTopicFollow } from './topic-follow.js'
import { handleCreatePoll } from './poll-create.js'
import { handleAddPollOption } from './poll-option.js'
import { handlePollVote } from './poll-vote.js'

export const ACTION_HANDLERS = {
  setName: handleSetName,
  post: handlePost,
  reply: handleReply,
  like: handleLike,
  setProfile: handleSetProfile,
  follow: handleFollow,
  unfollow: handleFollow,
  setProfilePic: handleSetProfilePic,
  topicMessage: handleTopicMessage,
  topicFollow: handleTopicFollow,
  topicUnfollow: handleTopicFollow,
  createPoll: handleCreatePoll,
  addPollOption: handleAddPollOption,
  pollVote: handlePollVote
}

export async function dispatchMemoAction (ctx) {
  const handler = ACTION_HANDLERS[ctx.decoded.action]
  if (!handler) {
    console.log(`No handler for action ${ctx.decoded.action}`)
    return false
  }
  await handler(ctx)
  return true
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:35:27.947Z","module_hash":"a46edb4e6c6464ab3bad2bcb1eb502f6f5e1a78a8cc21006086c7543e9ed1ce1","functions":[{"id":"func/dispatchMemoAction","name":"dispatchMemoAction","line":31,"end_line":39,"hash":"975fe763535301df68af8ec017104e93f5cc591539b79e850f5b70e01cb37fec"}]}
// mutate4javascript-manifest-end

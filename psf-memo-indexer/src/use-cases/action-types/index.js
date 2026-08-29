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
import { handleMute } from './mute.js'

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
  pollVote: handlePollVote,
  mute: handleMute,
  unmute: handleMute
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
// {"version":1,"tested_at":"2026-08-29T03:35:13.616Z","module_hash":"dd4df3c6f2758eb0d8c2e7550a83a56918f54f42bffa1088f32161bd10faa5a5","functions":[{"id":"func/dispatchMemoAction","name":"dispatchMemoAction","line":34,"end_line":42,"hash":"975fe763535301df68af8ec017104e93f5cc591539b79e850f5b70e01cb37fec"}]}
// mutate4javascript-manifest-end

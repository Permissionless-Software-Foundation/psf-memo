/*
  Memo protocol action codes (mirrors Go ref/bitcoin/memo/codes.go).
*/

export const CODE_PREFIX = 0x6d

export const CODE_SET_NAME = 0x01
export const CODE_POST = 0x02
export const CODE_REPLY = 0x03
export const CODE_LIKE = 0x04
export const CODE_SET_PROFILE = 0x05
export const CODE_FOLLOW = 0x06
export const CODE_UNFOLLOW = 0x07
export const CODE_SET_PROFILE_PIC = 0x0a
export const CODE_TOPIC_MESSAGE = 0x0c
export const CODE_TOPIC_FOLLOW = 0x0d
export const CODE_TOPIC_UNFOLLOW = 0x0e
export const CODE_CREATE_POLL = 0x10
export const CODE_ADD_POLL_OPTION = 0x13
export const CODE_POLL_VOTE = 0x14

export const PREFIX_SET_NAME = Buffer.from([CODE_PREFIX, CODE_SET_NAME])
export const PREFIX_POST = Buffer.from([CODE_PREFIX, CODE_POST])
export const PREFIX_REPLY = Buffer.from([CODE_PREFIX, CODE_REPLY])
export const PREFIX_LIKE = Buffer.from([CODE_PREFIX, CODE_LIKE])
export const PREFIX_SET_PROFILE = Buffer.from([CODE_PREFIX, CODE_SET_PROFILE])
export const PREFIX_FOLLOW = Buffer.from([CODE_PREFIX, CODE_FOLLOW])
export const PREFIX_UNFOLLOW = Buffer.from([CODE_PREFIX, CODE_UNFOLLOW])
export const PREFIX_SET_PROFILE_PIC = Buffer.from([CODE_PREFIX, CODE_SET_PROFILE_PIC])
export const PREFIX_TOPIC_MESSAGE = Buffer.from([CODE_PREFIX, CODE_TOPIC_MESSAGE])
export const PREFIX_TOPIC_FOLLOW = Buffer.from([CODE_PREFIX, CODE_TOPIC_FOLLOW])
export const PREFIX_TOPIC_UNFOLLOW = Buffer.from([CODE_PREFIX, CODE_TOPIC_UNFOLLOW])
export const PREFIX_CREATE_POLL = Buffer.from([CODE_PREFIX, CODE_CREATE_POLL])
export const PREFIX_ADD_POLL_OPTION = Buffer.from([CODE_PREFIX, CODE_ADD_POLL_OPTION])
export const PREFIX_POLL_VOTE = Buffer.from([CODE_PREFIX, CODE_POLL_VOTE])

export const MAX_POST_SIZE = 65000
export const MAX_REPLY_SIZE = 65000
export const TX_HASH_LENGTH = 32
export const PK_HASH_LENGTH = 20

export const ACTION_NAMES = {
  [`${CODE_PREFIX}-${CODE_SET_NAME}`]: 'setName',
  [`${CODE_PREFIX}-${CODE_POST}`]: 'post',
  [`${CODE_PREFIX}-${CODE_REPLY}`]: 'reply',
  [`${CODE_PREFIX}-${CODE_LIKE}`]: 'like',
  [`${CODE_PREFIX}-${CODE_SET_PROFILE}`]: 'setProfile',
  [`${CODE_PREFIX}-${CODE_FOLLOW}`]: 'follow',
  [`${CODE_PREFIX}-${CODE_UNFOLLOW}`]: 'unfollow',
  [`${CODE_PREFIX}-${CODE_SET_PROFILE_PIC}`]: 'setProfilePic',
  [`${CODE_PREFIX}-${CODE_TOPIC_MESSAGE}`]: 'topicMessage',
  [`${CODE_PREFIX}-${CODE_TOPIC_FOLLOW}`]: 'topicFollow',
  [`${CODE_PREFIX}-${CODE_TOPIC_UNFOLLOW}`]: 'topicUnfollow',
  [`${CODE_PREFIX}-${CODE_CREATE_POLL}`]: 'createPoll',
  [`${CODE_PREFIX}-${CODE_ADD_POLL_OPTION}`]: 'addPollOption',
  [`${CODE_PREFIX}-${CODE_POLL_VOTE}`]: 'pollVote'
}

export function isMemoPrefix (buf) {
  return buf && buf.length >= 2 && buf[0] === CODE_PREFIX
}

export function getActionFromPrefix (prefixBuf) {
  if (!isMemoPrefix(prefixBuf)) return null
  return ACTION_NAMES[`${prefixBuf[0]}-${prefixBuf[1]}`] || null
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:34:16.405Z","module_hash":"d2cadfbbec174eedf255ae25df8891bd27f5a337b390df97064fe80f9c1ee712","functions":[{"id":"func/isMemoPrefix","name":"isMemoPrefix","line":59,"end_line":61,"hash":"38aab4da302e269a0b2206cb93704a17ae8f42f49d3c969ef525243ce9a42792"},{"id":"func/getActionFromPrefix","name":"getActionFromPrefix","line":63,"end_line":66,"hash":"31ff61d788f5043d043f07abe79e9242ec1d31180b2737e81af95e7c97fdc71c"}]}
// mutate4javascript-manifest-end

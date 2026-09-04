/*
  Project step handlers for the psf-memo-client acceptance pipeline.

  These handlers connect Gherkin step text to real project behavior
  (src/services/memo-post.js, src/services/new-post.js, src/services/memo-reply.js,
  src/services/reply-thread-page.js, src/services/memo-set-name.js, and
  src/services/set-name-page.js), driving them through small injected adapters
  (a fake wallet, a fake feed, a fake thread, and a fake navigator) so the
  acceptance run is deterministic and offline.

  Regex matching with placeholder-name capture is the default style: a single
  handler pattern captures the placeholder name (e.g. <message>) and fetches
  the example value from the scenario example store.

  The handlers serve specs/post-memo.feature, specs/memo-new.feature,
  specs/reply-memo.feature, and specs/set-name.feature, whose wording differs
  but which share the same underlying Memo action/page-controller behavior.
*/

'use strict'

const MemoPost = require('../../src/services/memo-post')
const NewPostPage = require('../../src/services/new-post')
const MemoReply = require('../../src/services/memo-reply')
const ReplyThreadPage = require('../../src/services/reply-thread-page')
const MemoSetName = require('../../src/services/memo-set-name')
const SetNamePage = require('../../src/services/set-name-page')
const MemoSetBio = require('../../src/services/memo-set-bio')
const SetBioPage = require('../../src/services/set-bio-page')
const MemoSetAvatarUrl = require('../../src/services/memo-set-avatar-url')
const SetAvatarUrlPage = require('../../src/services/set-avatar-url-page')
const AccountPage = require('../../src/services/account-page')
const MemoLike = require('../../src/services/memo-like')
const LikeTipPage = require('../../src/services/like-tip-page')
const MemoFollow = require('../../src/services/memo-follow')
const MemoMute = require('../../src/services/memo-mute')
const RecentFeedPage = require('../../src/services/recent-feed-page')
const FollowingFeedPage = require('../../src/services/following-feed-page')
const ProfilePage = require('../../src/services/profile-page')
const ThreadPage = require('../../src/services/thread-page')
const TopicDiscoveryPage = require('../../src/services/topic-discovery-page')
const TopicFeedPage = require('../../src/services/topic-feed-page')
const SearchPage = require('../../src/services/search-page')
const NotificationsPage = require('../../src/services/notifications-page')
const RecentProfilesPage = require('../../src/services/recent-profiles-page')
const MemoTopicFollow = require('../../src/services/memo-topic-follow')
const MemoTopicPost = require('../../src/services/memo-topic-post')
const TopicPostPage = require('../../src/services/topic-post-page')
const MemoPollCreate = require('../../src/services/memo-poll-create')
const PollCreatePage = require('../../src/services/poll-create-page')
const MemoPollOption = require('../../src/services/memo-poll-option')
const PollOptionPage = require('../../src/services/poll-option-page')
const MemoPollVote = require('../../src/services/memo-poll-vote')
const PollVotePage = require('../../src/services/poll-vote-page')
const { renderPostText } = require('./render-post')
const { YOUTUBE_EMBED_BASE_URL } = require('../../src/services/youtube-embed')

const MEMO_POST_PREFIX = MemoPost.MEMO_POST_PREFIX
const MEMO_REPLY_PREFIX = MemoReply.MEMO_REPLY_PREFIX
const MEMO_SET_NAME_PREFIX = MemoSetName.MEMO_SET_NAME_PREFIX
const MEMO_SET_BIO_PREFIX = MemoSetBio.MEMO_SET_BIO_PREFIX
const MEMO_SET_AVATAR_URL_PREFIX = MemoSetAvatarUrl.MEMO_SET_AVATAR_URL_PREFIX
const MEMO_LIKE_PREFIX = MemoLike.MEMO_LIKE_PREFIX
const MEMO_FOLLOW_PREFIX = MemoFollow.MEMO_FOLLOW_PREFIX
const MEMO_UNFOLLOW_PREFIX = MemoFollow.MEMO_UNFOLLOW_PREFIX
const MEMO_MUTE_PREFIX = MemoMute.MEMO_MUTE_PREFIX
const MEMO_UNMUTE_PREFIX = MemoMute.MEMO_UNMUTE_PREFIX
const MEMO_TOPIC_MESSAGE_PREFIX = MemoTopicPost.MEMO_TOPIC_MESSAGE_PREFIX
const MEMO_TOPIC_FOLLOW_PREFIX = MemoTopicFollow.MEMO_TOPIC_FOLLOW_PREFIX
const MEMO_TOPIC_UNFOLLOW_PREFIX = MemoTopicFollow.MEMO_TOPIC_UNFOLLOW_PREFIX
const MEMO_CREATE_POLL_PREFIX = MemoPollCreate.MEMO_CREATE_POLL_PREFIX
const MEMO_ADD_POLL_OPTION_PREFIX = MemoPollOption.MEMO_ADD_POLL_OPTION_PREFIX
const MEMO_POLL_VOTE_PREFIX = MemoPollVote.MEMO_POLL_VOTE_PREFIX

// Default author address used by Gherkin steps that refer to "the author address".
const AUTHOR_ADDRESS = 'bitcoincash:qz7v6ztvzu2f2xd2ww8pnx9vwk0g4ncvfvavktg0jc'

// Placeholder addresses used by Gherkin steps that refer to 'a second address'
// or 'a third address'.
const SECOND_ADDRESS = 'bitcoincash:second-address'
const THIRD_ADDRESS = 'bitcoincash:third-address'

// A fake wallet exposing the minimal-slp-wallet adapter surface the app uses.
function makeWallet (address) {
  const wallet = {
    walletInfo: { cashAddress: address },
    bchjs: {
      Address: {
        toHash160 (addr) {
          // Stable fake hash160: first 20 bytes of sha256 of the address.
          return require('crypto').createHash('sha256').update(addr).digest('hex').slice(0, 40)
        }
      }
    },
    utxos: [],
    broadcasts: [],
    getUtxos: async function () {
      return this.utxos
    },
    sendOpReturn: async function (msg, prefix, bchOutput = []) {
      // Record the broadcast attempt, then fail if configured to do so.
      this.broadcasts.push({ msg, prefix, bchOutput })
      if (this.failWith) throw new Error(this.failWith)
      return 'aa'.repeat(32)
    }
  }
  return wallet
}

// A fake feed reflecting posts added to the recent posts feed.
function makeFeed () {
  const posts = []
  return {
    posts,
    addPost: (post) => posts.push(post)
  }
}

// A fake poll store recording polls, options, and votes.
function makePolls () {
  const polls = []
  const options = []
  const votes = []
  return {
    polls,
    options,
    votes,
    addPoll: (poll) => polls.push(poll),
    addOption: (option) => options.push(option),
    addVote: (vote) => votes.push(vote),
    getPoll: (txid) => polls.find((p) => p.txid === txid) || null,
    getOptions: (txid) => options.filter((o) => o.pollTxid === txid),
    getVotes: (txid) => votes.filter((v) => v.pollTxid === txid)
  }
}

// A fake profile store recording display names, bios, avatar URLs, and follow state.
function makeProfiles () {
  const names = {}
  const bios = {}
  const avatarUrls = {}
  const following = {}
  const topicFollowing = {}
  const muting = {}
  return {
    names,
    bios,
    avatarUrls,
    following,
    topicFollowing,
    muting: {},
    setMuteState: (selfAddr, targetAddr, isMuting) => {
      if (!muting[selfAddr]) muting[selfAddr] = {}
      muting[selfAddr][targetAddr] = isMuting
    },
    getMuteState: (selfAddr, targetAddr) => muting[selfAddr]?.[targetAddr] || false,
    setName: (addr, name) => { names[addr] = name },
    getName: (addr) => names[addr] || null,
    setBio: (addr, bio) => { bios[addr] = bio },
    getBio: (addr) => bios[addr] || null,
    setAvatarUrl: (addr, url) => { avatarUrls[addr] = url },
    getAvatarUrl: (addr) => avatarUrls[addr] || null,
    setFollowState: (selfAddr, targetAddr, isFollowing) => {
      if (!following[selfAddr]) following[selfAddr] = {}
      following[selfAddr][targetAddr] = isFollowing
    },
    getFollowState: (selfAddr, targetAddr) => following[selfAddr]?.[targetAddr] || false,
    setTopicFollowState: (selfAddr, room, isFollowing) => {
      if (!topicFollowing[selfAddr]) topicFollowing[selfAddr] = {}
      topicFollowing[selfAddr][room] = isFollowing
    },
    getTopicFollowState: (selfAddr, room) => topicFollowing[selfAddr]?.[room] || false
  }
}

// A fake thread store recording replies added to a post thread.
function makeThread () {
  const replies = []
  return {
    rootTxid: null,
    replies,
    addReply: (r) => replies.push(r)
  }
}

// A fake psf-memo-db API backing the read-only feed, profile, thread,
// topic, and search pages used to verify read-side behavior.
function makeMemoDb () {
  const posts = []
  const profiles = []
  const searchPosts = []
  const searchProfiles = []
  const threads = {}
  const followState = {}
  const muteState = {}
  const replyTxids = new Set()
  const replies = []
  const likes = []
  const followers = new Map()
  const topics = []
  const topicPosts = {}
  const topicCounts = new Map()
  const topicFollow = new Map()

  return {
    posts,
    profiles,
    searchPosts,
    searchProfiles,
    threads,
    followState,
    topics,
    topicPosts,
    topicCounts,
    addPost (post) {
      posts.push(post)
    },
    addReply (reply) {
      replyTxids.add(reply.txid)
      replies.push({
        txid: reply.txid,
        parentTxid: reply.parentTxid,
        text: reply.text,
        addr: reply.addr || 'bitcoincash:reply-author',
        blockHeight: reply.blockHeight ?? 100
      })
      posts.push({
        txid: reply.txid,
        addr: reply.addr || 'bitcoincash:reply-author',
        text: reply.text,
        blockHeight: reply.blockHeight ?? 100,
        seen: reply.seen ?? 0
      })
    },
    addSearchPost (post) {
      searchPosts.push(post)
    },
    addSearchProfile (profile) {
      searchProfiles.push(profile)
    },
    addLike (like) {
      likes.push({
        txid: like.txid,
        postTxid: like.postTxid,
        addr: like.addr,
        blockHeight: like.blockHeight ?? 100
      })
    },
    addFollower (followerAddr, followeeAddr, opts = {}) {
      const list = followers.get(followeeAddr) || []
      list.push({
        followerAddr,
        followeeAddr,
        txid: opts.txid || require('crypto').createHash('sha256').update(`${followerAddr}:${followeeAddr}`).digest('hex'),
        blockHeight: opts.blockHeight ?? 100
      })
      followers.set(followeeAddr, list)
    },
    addTopic (room, postCount) {
      topicCounts.set(room, postCount)
      topicPosts[room] = []
      for (let i = 0; i < postCount; i++) {
        const txid = `${room}-post-${i + 1}`.padEnd(64, '0')
        topicPosts[room].push({
          txid,
          addr: `addr-${i + 1}`,
          text: `Sample post ${i + 1}`,
          blockHeight: 100 + i
        })
      }
    },
    addTopicPost (room, post) {
      if (!topicPosts[room]) topicPosts[room] = []
      topicPosts[room].push(post)
      topicCounts.set(room, (topicCounts.get(room) || 0) + 1)
    },
    addThread (txid, thread) {
      threads[txid] = thread
    },
    setFollowState (followerAddr, followeeAddr, following) {
      followState[`${followerAddr}|${followeeAddr}`] = following
    },
    setMuteState (muterAddr, muteeAddr, muted) {
      muteState[`${muterAddr}:${muteeAddr}`] = muted
    },
    setTopicFollowState (addr, room, following) {
      if (!topicFollow.has(room)) topicFollow.set(room, new Map())
      topicFollow.get(room).set(addr, following)
    },
    async getTopicFollowState (room, addr) {
      return topicFollow.get(room)?.get(addr) || false
    },
    async getTopicFollowers (room) {
      const addrs = []
      for (const [addr, following] of (topicFollow.get(room) || new Map()).entries()) {
        if (following) addrs.push(addr)
      }
      return addrs
    },
    async search (q, { limit = 50, offset = 0 } = {}) {
      const normalized = String(q).trim().toLowerCase()
      if (normalized.length === 0) {
        return { posts: [], profiles: [], pagination: { total: 0, hasMore: false } }
      }
      const matchedPosts = searchPosts.filter((p) =>
        typeof p.text === 'string' && p.text.toLowerCase().includes(normalized)
      )
      const matchedProfiles = searchProfiles.filter((p) =>
        (typeof p.name === 'string' && p.name.toLowerCase().includes(normalized)) ||
        (typeof p.text === 'string' && p.text.toLowerCase().includes(normalized))
      )
      const total = matchedPosts.length
      const page = matchedPosts.slice(offset, offset + limit)
      return {
        posts: page,
        profiles: matchedProfiles,
        pagination: { total, limit, offset, hasMore: offset + page.length < total }
      }
    },
    async getRecentPosts ({ limit = 50, offset = 0 } = {}) {
      const page = posts.slice(offset, offset + limit)
      return { posts: page, pagination: { total: posts.length, limit, offset, hasMore: offset + page.length < posts.length } }
    },
    async getPostsByAddr (addr, { limit = 50, offset = 0 } = {}) {
      const filtered = posts.filter((p) => p.addr === addr)
      const page = filtered.slice(offset, offset + limit)
      return { posts: page, pagination: { total: filtered.length, limit, offset, hasMore: offset + page.length < filtered.length } }
    },
    async getPostThread (txid) {
      return threads[txid] || { post: null }
    },
    async getFollowState (followerAddr, followeeAddr) {
      return followState[`${followerAddr}|${followeeAddr}`] || false
    },
    async getMuteState (muterAddr, muteeAddr) {
      return muteState[`${muterAddr}:${muteeAddr}`] || false
    },
    async getTopics () {
      const list = []
      for (const [room, postCount] of topicCounts.entries()) {
        list.push({ room, postCount })
      }
      list.sort((a, b) => a.room.localeCompare(b.room))
      return { topics: list }
    },
    async getTopicPosts (room, { limit = 50, offset = 0 } = {}) {
      const all = topicPosts[room] || []
      const page = all.slice(offset, offset + limit)
      return { posts: page, pagination: { total: all.length, limit, offset, hasMore: offset + page.length < all.length } }
    },
    async getNotifications (addr, { limit = 50, offset = 0 } = {}) {
      const notifications = []

      for (const reply of replies) {
        const parent = posts.find((p) => p.txid === reply.parentTxid)
        if (!parent || parent.addr !== addr) continue
        if (reply.addr === addr) continue
        notifications.push({
          type: 'reply',
          txid: reply.txid,
          addr: reply.addr,
          postTxid: reply.parentTxid,
          text: reply.text,
          blockHeight: reply.blockHeight ?? parent.blockHeight ?? 0
        })
      }

      for (const like of likes) {
        const post = posts.find((p) => p.txid === like.postTxid)
        if (!post || post.addr !== addr) continue
        if (like.addr === addr) continue
        notifications.push({
          type: 'like',
          txid: like.txid,
          addr: like.addr,
          postTxid: like.postTxid,
          blockHeight: like.blockHeight ?? post.blockHeight ?? 0
        })
      }

      for (const follow of (followers.get(addr) || [])) {
        if (follow.followerAddr === addr) continue
        notifications.push({
          type: 'follow',
          txid: follow.txid,
          addr: follow.followerAddr,
          blockHeight: follow.blockHeight ?? 0
        })
      }

      notifications.sort((a, b) => (b.blockHeight ?? 0) - (a.blockHeight ?? 0))

      const total = notifications.length
      const page = notifications.slice(offset, offset + limit)
      return { notifications: page, pagination: { total, limit, offset, hasMore: offset + page.length < total } }
    },
    async getRecentProfiles ({ limit = 50, offset = 0 } = {}) {
      const page = profiles.slice(offset, offset + limit)
      return { profiles: page, pagination: { total: profiles.length, limit, offset, hasMore: offset + page.length < profiles.length } }
    },
    async getFollowingFeed (addr, { limit = 50, offset = 0 } = {}) {
      const followees = new Set()
      for (const [key, following] of Object.entries(followState)) {
        if (!following) continue
        const [follower, followee] = key.split('|')
        if (follower === addr) followees.add(followee)
      }
      const all = posts
        .filter((p) => followees.has(p.addr) && p.addr !== addr && !replyTxids.has(p.txid))
        .sort((a, b) => (b.blockHeight ?? 0) - (a.blockHeight ?? 0))
      const page = all.slice(offset, offset + limit)
      return { posts: page, pagination: { total: all.length, limit, offset, hasMore: offset + page.length < all.length } }
    }
  }
}

// Fresh world/state object for a single scenario execution.
function createWorld () {
  const wallet = makeWallet('bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d')
  const feed = makeFeed()
  const profiles = makeProfiles()
  const memoPost = new MemoPost({ wallet, feed })
  const thread = makeThread()
  const memoReply = new MemoReply({ wallet, thread })
  const memoLike = new MemoLike({ wallet, feed })
  const memoFollow = new MemoFollow({ wallet, profiles })
  const memoMute = new MemoMute({ wallet, profiles })
  const memoTopicFollow = new MemoTopicFollow({ wallet, profiles })
  const polls = makePolls()
  const memoPollCreate = new MemoPollCreate({ wallet, polls })
  const memoDb = makeMemoDb()

  const world = {
    wallet,
    feed,
    thread,
    memoPost,
    memoReply,
    memoLike,
    memoFollow,
    memoMute,
    memoTopicFollow,
    polls,
    memoPollCreate,
    memoDb,
    currentPath: null,
    menuOpen: false,
    likedTxids: new Set()
  }

  // Read-only page controllers backed by the fake psf-memo-db API.
  world.recentFeedPage = new RecentFeedPage({ memoDb })
  world.followingFeedPage = new FollowingFeedPage({ memoDb, wallet })
  world.notificationsPage = new NotificationsPage({ memoDb, wallet })
  world.profilePage = new ProfilePage({ memoDb })
  world.threadPage = new ThreadPage({ memoDb })
  world.topicDiscoveryPage = new TopicDiscoveryPage({
    memoDb,
    navigate: (path) => { world.currentPath = path }
  })
  world.searchPage = new SearchPage({
    memoDb,
    navigate: (path) => { world.currentPath = path }
  })
  world.recentProfilesPage = new RecentProfilesPage({ memoDb })

  // The New Post Page controller wraps the memo post behavior. Its navigate
  // adapter updates the world's current path so navigation can be asserted.
  world.newPage = new NewPostPage({
    memoPost,
    navigate: (path) => { world.currentPath = path },
    menuLinks: []
  })

  // The Reply Thread Page controller wraps the memo reply behavior. It does
  // not navigate on success so the user stays in the thread modal.
  world.replyPage = new ReplyThreadPage({
    memoReply,
    navigate: () => {}
  })

  // The Like / Tip Page controller wraps the memo like behavior.
  world.likeTipPage = new LikeTipPage({ memoLike })

  // The Set Name Page and Account Page controllers share a profile store so
  // a name set on one page is visible on the other.
  const memoSetName = new MemoSetName({ wallet, profiles })
  world.setNamePage = new SetNamePage({
    memoSetName,
    navigate: (path) => { world.currentPath = path }
  })

  // The Set Bio Page controller shares the same profile store.
  const memoSetBio = new MemoSetBio({ wallet, profiles })
  world.setBioPage = new SetBioPage({
    memoSetBio,
    navigate: (path) => { world.currentPath = path }
  })

  // The Set Avatar URL Page controller shares the same profile store.
  const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet, profiles })
  world.setAvatarUrlPage = new SetAvatarUrlPage({
    memoSetAvatarUrl,
    navigate: (path) => { world.currentPath = path }
  })

  world.accountPage = new AccountPage({
    wallet,
    profiles,
    navigate: (path) => { world.currentPath = path }
  })

  // The Poll Create Page controller wraps the memo poll create behavior.
  world.pollCreatePage = new PollCreatePage({
    memoPollCreate,
    navigate: (path) => { world.currentPath = path }
  })

  return world
}

// Decode a raw reply payload into its parent txid (hex) and reply text.
function decodeReplyPayload (raw) {
  const buf = Buffer.from(raw)
  const parentTxid = buf.slice(0, 32).toString('hex')
  const text = buf.slice(32).toString('utf8')
  return { parentTxid, text }
}

// Decode a raw like payload back into the liked post txid (hex).
function decodeLikeTxid (raw) {
  return Buffer.from(raw).toString('hex')
}

// Resolve a literal value or a <parameter> placeholder from the example store.
function resolveParam (value, example) {
  const match = /^<([A-Za-z0-9_]+)>$/.exec(String(value).trim())
  if (match) {
    const param = match[1]
    if (!(param in example)) {
      throw new Error(`Missing example value for "${param}"`)
    }
    return example[param]
  }
  return String(value).trim()
}

// Resolve a step value that may be a quoted literal or a <parameter> placeholder.
function resolveText (value, example) {
  const trimmed = String(value).trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1)
  }
  return resolveParam(value, example)
}

// Look up a post that has been loaded onto one of the read-only pages.
function findDisplayedPost (txid, world) {
  const fromThread = world.threadPage.getPost(txid)
  if (fromThread) return fromThread

  const fromProfile = world.profilePage.getPost(txid)
  if (fromProfile) return fromProfile

  const fromFeed = world.recentFeedPage.getPost(txid)
  if (fromFeed) return fromFeed

  return null
}

// True when the currently displayed page is a topic feed (used to dispatch the
// shared "Follow/Unfollow button" steps between the profile page and the topic
// feed page).
function isTopicFeedActive (world) {
  return Boolean(world.currentPath && String(world.currentPath).startsWith('/topics/'))
}

// Handler registry. Each entry: { pattern, run }.
// run receives (match, exampleStore, world, step).
const handlers = [
  {
    name: 'wallet authenticated for address',
    pattern: /^a wallet authenticated for the address (.+)$/,
    run (m, example, world) {
      world.wallet.walletInfo.cashAddress = m[1].trim()
    }
  },
  {
    name: 'wallet has spendable output',
    pattern: /^the wallet has (?:a )?spendable output to pay the transaction fee$/,
    run (m, example, world) {
      world.wallet.utxos = [{ txid: 'utxo-for-fee', value: 100000 }]
    }
  },
  {
    name: 'viewing recent posts feed',
    pattern: /^I am viewing the recent posts feed$/,
    run (m, example, world) {
      world.currentPath = NewPostPage.RECENT_FEED_PATH
    }
  },
  {
    name: 'wallet fails to broadcast with error',
    pattern: /^the wallet fails to broadcast with the error "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.wallet.failWith = example[param]
    }
  },
  {
    name: 'navigate to path',
    pattern: /^I navigate to the path (.+)$/,
    run (m, example, world, step) {
      const target = m[1].trim()
      if (step.keyword === 'Then') {
        if (world.currentPath !== target) {
          throw new Error(`Expected to be on path ${target}, but current path is ${world.currentPath}.`)
        }
      } else {
        world.currentPath = target
      }
    }
  },
  {
    name: 'remain on path',
    pattern: /^I remain on the path (.+)$/,
    run (m, example, world) {
      const target = m[1].trim()
      if (world.currentPath !== target) {
        throw new Error(`Expected to remain on path ${target}, but current path is ${world.currentPath}.`)
      }
    }
  },
  {
    name: 'open navigation menu',
    pattern: /^I open the navigation menu$/,
    run (m, example, world) {
      world.menuOpen = true
    }
  },
  {
    name: 'menu shows link to path',
    pattern: /^the menu shows a link to the path (.+)$/,
    run (m, example, world) {
      const target = m[1].trim()
      if (!world.newPage.hasMenuLink(target)) {
        throw new Error(`Navigation menu does not link to ${target}.`)
      }
    }
  },
  {
    name: 'compose/type memo text',
    pattern: /^I (?:compose|type) a memo with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.newPage.setInput(example[param])
    }
  },
  {
    name: 'type bio text',
    pattern: /^I type a bio with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.setBioPage.setInput(example[param])
    }
  },
  {
    name: 'type name text',
    pattern: /^I type a name with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.setNamePage.setInput(example[param])
    }
  },
  {
    name: 'submit/click post',
    pattern: /^I (?:submit the memo|click the post button)$/,
    async run (m, example, world) {
      await world.newPage.submit()
    }
  },
  {
    name: 'submit bio',
    pattern: /^I submit the bio$/,
    async run (m, example, world) {
      await world.setBioPage.submit()
    }
  },
  {
    name: 'submit name',
    pattern: /^I submit the name$/,
    async run (m, example, world) {
      await world.setNamePage.submit()
    }
  },
  {
    name: 'thread modal shows reply form',
    pattern: /^the thread modal shows a reply form$/,
    run (m, example, world) {
      // The reply form is always considered visible once the thread is open.
      if (!world.replyPage) {
        throw new Error('No reply page is attached to the thread.')
      }
    }
  },
  {
    name: 'post with txid has no replies',
    pattern: /^a post with the txid (.+) has no replies$/,
    run (m, example, world) {
      const txid = m[1].trim()
      world.thread.rootTxid = txid
      world.replyPage.setParent(txid)
      // A fresh thread store already has no replies.
      if (world.thread.replies.length !== 0) {
        throw new Error(`Expected post ${txid} to have no replies, but it has ${world.thread.replies.length}.`)
      }
    }
  },
  {
    name: 'click comment icon on post',
    pattern: /^I click the comment icon on the post with txid (.+)$/,
    run (m, example, world) {
      const txid = m[1].trim()
      // Opening the thread modal means setting the active thread txid.
      world.thread.rootTxid = txid
      world.replyPage.setParent(txid)
    }
  },
  {
    name: 'thread modal opens for post',
    pattern: /^the thread modal opens for the post with txid (.+)$/,
    run (m, example, world) {
      const txid = m[1].trim()
      if (world.thread.rootTxid !== txid) {
        throw new Error(`Expected thread modal to open for ${txid}, but current thread is ${world.thread.rootTxid}.`)
      }
      if (!world.replyPage) {
        throw new Error('Thread modal opened without a reply form page.')
      }
    }
  },
  {
    name: 'open reply thread',
    pattern: /^I open the thread for the post with txid (.+)$/,
    async run (m, example, world) {
      const txid = resolveParam(m[1], example)
      world.thread.rootTxid = txid
      world.replyPage.setParent(txid)
      await world.threadPage.load(txid)
    }
  },
  {
    name: 'type reply text',
    pattern: /^I type a reply with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.replyPage.setInput(example[param])
      world.replyPage.setParent(world.thread.rootTxid)
    }
  },
  {
    name: 'type reply to nested reply',
    pattern: /^I type a reply to the nested reply with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.replyPage.setInput(example[param])
      if (!world.nestedTxid) {
        throw new Error('No nested reply has been selected.')
      }
      world.replyPage.setParent(world.nestedTxid)
    }
  },
  {
    name: 'submit reply',
    pattern: /^I submit the reply$/,
    async run (m, example, world) {
      await world.replyPage.submit()
    }
  },
  {
    name: 'thread shows nested reply',
    pattern: /^the thread shows a nested reply with the txid (.+)$/,
    run (m, example, world) {
      const txid = m[1].trim()
      world.nestedTxid = txid
      world.thread.addReply({
        txid,
        address: 'someone-else',
        text: 'nested reply',
        parentTxid: world.thread.rootTxid
      })
    }
  },
  {
    name: 'click Set Bio button',
    pattern: /^I click the Set Bio button$/,
    run (m, example, world) {
      world.accountPage.clickSetBio()
    }
  },
  {
    name: 'type avatar URL text',
    pattern: /^I type an avatar URL with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.setAvatarUrlPage.setInput(example[param])
    }
  },
  {
    name: 'submit avatar URL',
    pattern: /^I submit the avatar URL$/,
    async run (m, example, world) {
      await world.setAvatarUrlPage.submit()
    }
  },
  {
    name: 'click Set Avatar URL button',
    pattern: /^I click the Set Avatar URL button$/,
    run (m, example, world) {
      world.accountPage.clickSetAvatarUrl()
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo set-profile-picture prefix',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo set-profile-picture prefix$/,
    run (m, example, world) {
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_SET_AVATAR_URL_PREFIX) {
        throw new Error(`Expected Memo set-profile-picture prefix ${MEMO_SET_AVATAR_URL_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg !== world.setAvatarUrlPage.input) {
        throw new Error('Broadcast avatar URL text did not match the typed avatar URL.')
      }
    }
  },
  {
    name: 'set avatar page shows validation/length error',
    pattern: /^the set avatar page shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'avatar_url_validation' : 'avatar_url_length'
      if (world.setAvatarUrlPage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.setAvatarUrlPage.submitError}.`)
      }
    }
  },
  {
    name: 'set avatar page remaining byte count',
    pattern: /^the set avatar page shows a remaining byte count of <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const param = m[1]
      const expected = parseInt(example[param], 10)
      if (Number.isNaN(expected)) {
        throw new Error(`Invalid expected count for "${param}".`)
      }
      const actual = world.setAvatarUrlPage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining bytes, got ${actual}.`)
      }
    }
  },
  {
    name: 'account page shows avatar URL',
    pattern: /^the account page shows my avatar URL as "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      const expected = example[param]
      const actual = world.accountPage.getAvatarUrl()
      if (actual !== expected) {
        throw new Error(`Expected account avatar URL "${expected}", got "${actual}".`)
      }
    }
  },
  {
    name: 'account page shows Set Avatar URL button',
    pattern: /^the account page shows a Set Avatar URL button$/,
    run (m, example, world) {
      if (!world.accountPage.hasSetAvatarUrlButton()) {
        throw new Error('Account page does not show a Set Avatar URL button.')
      }
    }
  },
  {
    name: 'click Set Name button',
    pattern: /^I click the Set Name button$/,
    run (m, example, world) {
      world.accountPage.clickSetName()
    }
  },
  {
    name: 'broadcasts/attempts OP_RETURN with Memo post prefix',
    pattern: /^(?:the wallet|the app) (?:broadcasts|attempts to broadcast) an OP_RETURN transaction with the Memo post prefix$/,
    run (m, example, world) {
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_POST_PREFIX) {
        throw new Error(`Expected Memo post prefix ${MEMO_POST_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg !== world.newPage.input) {
        throw new Error('Broadcast message text did not match the composed memo.')
      }
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo set-name prefix',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo set-name prefix$/,
    run (m, example, world) {
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_SET_NAME_PREFIX) {
        throw new Error(`Expected Memo set-name prefix ${MEMO_SET_NAME_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg !== world.setNamePage.input) {
        throw new Error('Broadcast name text did not match the typed name.')
      }
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo set-profile prefix',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo set-profile prefix$/,
    run (m, example, world) {
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_SET_BIO_PREFIX) {
        throw new Error(`Expected Memo set-profile prefix ${MEMO_SET_BIO_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg !== world.setBioPage.input) {
        throw new Error('Broadcast bio text did not match the typed bio.')
      }
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo reply prefix',
    pattern: /^(?:the wallet|the app) broadcasts an OP_RETURN transaction with the Memo reply prefix$/,
    run (m, example, world) {
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_REPLY_PREFIX) {
        throw new Error(`Expected Memo reply prefix ${MEMO_REPLY_PREFIX}, got "${last.prefix}".`)
      }
      const { parentTxid, text } = decodeReplyPayload(last.msg)
      if (parentTxid !== world.replyPage.parentTxid) {
        throw new Error('Broadcast parent txid did not match the expected reply target.')
      }
      if (text !== world.replyPage.input) {
        throw new Error('Broadcast reply text did not match the typed reply.')
      }
    }
  },
  {
    name: 'thread shows new reply from my address',
    pattern: /^the thread shows a new reply from my address with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      const expectedText = example[param]
      const myAddress = world.wallet.walletInfo.cashAddress
      const found = world.thread.replies.find(
        (r) => r.text === expectedText && r.address === myAddress
      )
      if (!found) {
        throw new Error(`Thread does not show the new reply with text "${expectedText}".`)
      }
    }
  },
  {
    name: 'thread shows validation/length error',
    pattern: /^the thread shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'reply_validation' : 'reply_length'
      if (world.replyPage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.replyPage.submitError}.`)
      }
    }
  },
  {
    name: 'thread remaining byte count',
    pattern: /^the thread shows a remaining byte count of <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const param = m[1]
      const expected = parseInt(example[param], 10)
      if (Number.isNaN(expected)) {
        throw new Error(`Invalid expected count for "${param}".`)
      }
      const actual = world.replyPage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining bytes, got ${actual}.`)
      }
    }
  },
  {
    name: 'feed shows new post from my address',
    pattern: /^the feed shows a new post from my address with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      const expectedText = example[param]
      const myAddress = world.wallet.walletInfo.cashAddress
      const found = world.feed.posts.find(
        (p) => p.text === expectedText && p.address === myAddress
      )
      if (!found) {
        throw new Error(`Feed does not show the new post with text "${expectedText}".`)
      }
    }
  },
  {
    name: 'page shows error containing text',
    pattern: /^the new post page shows an error containing "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      const expected = example[param]
      const actual = world.newPage.broadcastError || ''
      if (!actual.includes(expected)) {
        throw new Error(`Expected an error containing "${expected}", got "${actual}".`)
      }
    }
  },
  {
    name: 'page shows validation/length error',
    pattern: /^the (?:app|new post page) shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'memo_validation' : 'memo_length'
      if (world.newPage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.newPage.submitError}.`)
      }
    }
  },
  {
    name: 'set name page shows validation/length error',
    pattern: /^the set name page shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'name_validation' : 'name_length'
      if (world.setNamePage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.setNamePage.submitError}.`)
      }
    }
  },
  {
    name: 'set bio page shows validation/length error',
    pattern: /^the set bio page shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'bio_validation' : 'bio_length'
      if (world.setBioPage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.setBioPage.submitError}.`)
      }
    }
  },
  {
    name: 'remaining character count',
    pattern: /^the new post page shows a remaining character count of <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const param = m[1]
      const expected = parseInt(example[param], 10)
      if (Number.isNaN(expected)) {
        throw new Error(`Invalid expected count for "${param}".`)
      }
      const actual = world.newPage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining characters, got ${actual}.`)
      }
    }
  },
  {
    name: 'remaining byte count',
    pattern: /^the set name page shows a remaining byte count of <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const param = m[1]
      const expected = parseInt(example[param], 10)
      if (Number.isNaN(expected)) {
        throw new Error(`Invalid expected count for "${param}".`)
      }
      const actual = world.setNamePage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining bytes, got ${actual}.`)
      }
    }
  },
  {
    name: 'set bio remaining byte count',
    pattern: /^the set bio page shows a remaining byte count of <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const param = m[1]
      const expected = parseInt(example[param], 10)
      if (Number.isNaN(expected)) {
        throw new Error(`Invalid expected count for "${param}".`)
      }
      const actual = world.setBioPage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining bytes, got ${actual}.`)
      }
    }
  },
  {
    name: 'app does not broadcast any transaction',
    pattern: /^(?:the wallet|the app) does not broadcast any transaction$/,
    run (m, example, world) {
      if (world.wallet.broadcasts.length !== 0) {
        throw new Error('A transaction was broadcast when none was expected.')
      }
    }
  },
  {
    name: 'account page shows name',
    pattern: /^the account page shows my name as "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      const expected = example[param]
      const actual = world.accountPage.getName()
      if (actual !== expected) {
        throw new Error(`Expected account name "${expected}", got "${actual}".`)
      }
    }
  },
  {
    name: 'account page shows bio',
    pattern: /^the account page shows my bio as "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      const expected = example[param]
      const actual = world.accountPage.getBio()
      if (actual !== expected) {
        throw new Error(`Expected account bio "${expected}", got "${actual}".`)
      }
    }
  },
  {
    name: 'account page shows Set Name button',
    pattern: /^the account page shows a Set Name button$/,
    run (m, example, world) {
      if (!world.accountPage.hasSetNameButton()) {
        throw new Error('Account page does not show a Set Name button.')
      }
    }
  },
  {
    name: 'account page shows Set Bio button',
    pattern: /^the account page shows a Set Bio button$/,
    run (m, example, world) {
      if (!world.accountPage.hasSetBioButton()) {
        throw new Error('Account page does not show a Set Bio button.')
      }
    }
  },
  {
    name: 'wallet has spendable balance',
    pattern: /^the wallet has a spendable balance of (.+) sats$/,
    run (m, example, world) {
      const balance = parseInt(resolveParam(m[1], example), 10)
      if (Number.isNaN(balance)) {
        throw new Error(`Invalid balance value "${m[1]}"`)
      }
      world.wallet.utxos = [{ txid: 'utxo-for-balance', value: balance }]
    }
  },
  {
    name: 'post with txid authored by author address',
    pattern: /^a post with the txid (.+) authored by the author address$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const post = {
        txid,
        addr: AUTHOR_ADDRESS,
        address: AUTHOR_ADDRESS,
        text: 'A sample post',
        likeCount: 0
      }
      world.feed.addPost(post)
    }
  },
  {
    name: 'post with txid authored by my address',
    pattern: /^a post with the txid (.+) authored by my address$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const myAddress = world.wallet.walletInfo.cashAddress
      const post = {
        txid,
        addr: myAddress,
        address: myAddress,
        text: 'My own post',
        likeCount: 0
      }
      world.feed.addPost(post)
    }
  },
  {
    name: 'click heart icon on post',
    pattern: /^I click the heart icon on the post with txid (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const post = world.feed.posts.find((p) => p.txid === txid)
      const authorAddress = post ? post.addr : AUTHOR_ADDRESS
      world.likeTipPage.open(txid, authorAddress)
    }
  },
  {
    name: 'like/tip modal opens for post',
    pattern: /^a like\/tip modal opens for the post with txid (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      if (!world.likeTipPage.modalOpen) {
        throw new Error('Expected like/tip modal to be open.')
      }
      if (world.likeTipPage.postTxid !== txid) {
        throw new Error(`Expected like/tip modal for ${txid}, but got ${world.likeTipPage.postTxid}.`)
      }
    }
  },
  {
    name: 'submit like without tip',
    pattern: /^I submit the like without a tip$/,
    async run (m, example, world) {
      world.likeTipPage.setTip('')
      const result = await world.likeTipPage.submit()
      if (result.ok) {
        world.likedTxids.add(world.likeTipPage.postTxid)
      }
    }
  },
  {
    name: 'enter tip',
    pattern: /^I enter a tip of (.+)$/,
    run (m, example, world) {
      world.likeTipPage.setTip(resolveParam(m[1], example))
    }
  },
  {
    name: 'submit like',
    pattern: /^I submit the like$/,
    async run (m, example, world) {
      const result = await world.likeTipPage.submit()
      if (result.ok) {
        world.likedTxids.add(world.likeTipPage.postTxid)
      }
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo like prefix',
    pattern: /^the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_LIKE_PREFIX) {
        throw new Error(`Expected Memo like prefix ${MEMO_LIKE_PREFIX}, got "${last.prefix}".`)
      }
      if (decodeLikeTxid(last.msg) !== txid) {
        throw new Error(`Broadcast liked txid did not match ${txid}.`)
      }
    }
  },
  {
    name: 'wallet sends no tip',
    pattern: /^the wallet sends no tip$/,
    run (m, example, world) {
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (!Array.isArray(last.bchOutput) || last.bchOutput.length !== 0) {
        throw new Error('Expected no tip output, but one was present.')
      }
    }
  },
  {
    name: 'wallet sends tip to author',
    pattern: /^the wallet sends a tip of (.+) to the author address$/,
    run (m, example, world) {
      const expectedTip = parseInt(resolveParam(m[1], example), 10)
      if (Number.isNaN(expectedTip)) {
        throw new Error(`Invalid tip value "${m[1]}"`)
      }
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (!Array.isArray(last.bchOutput) || last.bchOutput.length === 0) {
        throw new Error('Expected a tip output, but none was present.')
      }
      const tipOutput = last.bchOutput[0]
      if (tipOutput.amountSat !== expectedTip) {
        throw new Error(`Expected tip ${expectedTip} sats, got ${tipOutput.amountSat}.`)
      }
      const post = world.feed.posts.find((p) => p.txid === world.likeTipPage.postTxid)
      const expectedAddress = post ? post.addr : AUTHOR_ADDRESS
      if (tipOutput.address !== expectedAddress) {
        throw new Error(`Expected tip to ${expectedAddress}, got ${tipOutput.address}.`)
      }
    }
  },
  {
    name: 'like count increases by one',
    pattern: /^the like count on the post increases by one$/,
    run (m, example, world) {
      const postTxid = world.likeTipPage.postTxid
      const post = world.feed.posts.find((p) => p.txid === postTxid)
      if (!post) {
        throw new Error(`Post ${postTxid} not found in feed.`)
      }
      if (post.likeCount !== 1) {
        throw new Error(`Expected like count to be 1, got ${post.likeCount}.`)
      }
    }
  },
  {
    name: 'heart icon shows as filled',
    pattern: /^the heart icon on the post shows as filled$/,
    run (m, example, world) {
      const postTxid = world.likeTipPage.postTxid
      if (!world.likedTxids.has(postTxid)) {
        throw new Error(`Expected heart icon to be filled for ${postTxid}.`)
      }
    }
  },
  {
    name: 'like/tip modal shows error containing text',
    pattern: /^the like\/tip modal shows an error containing "(.+)"$/,
    run (m, example, world) {
      const expected = m[1]
      const actual = world.likeTipPage.broadcastError || ''
      if (!actual.includes(expected)) {
        throw new Error(`Expected an error containing "${expected}", got "${actual}".`)
      }
    }
  },
  {
    name: 'click cancel button',
    pattern: /^I click the cancel button$/,
    run (m, example, world) {
      world.likeTipPage.close()
    }
  },
  {
    name: 'like/tip modal closes',
    pattern: /^the like\/tip modal closes$/,
    run (m, example, world) {
      if (world.likeTipPage.modalOpen) {
        throw new Error('Expected like/tip modal to be closed.')
      }
    }
  },
  {
    name: 'API serves post with explicit address and like count',
    pattern: /^the psf-memo-db API serves a post with txid (.+) authored by the address (.+) with a like count of (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const addr = resolveParam(m[2], example)
      const likeCount = parseInt(resolveParam(m[3], example), 10)
      world.memoDb.addPost({ txid, addr, likeCount, text: 'A sample post', blockHeight: 100 })
    }
  },
  {
    name: 'API serves post with explicit address and no like count',
    pattern: /^the psf-memo-db API serves a post with txid (.+) authored by the address (.+) with no like count recorded$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const addr = resolveParam(m[2], example)
      world.memoDb.addPost({ txid, addr, likeCount: undefined, text: 'A sample post', blockHeight: 100 })
    }
  },
  {
    name: 'API serves post with second/third address and like count',
    pattern: /^the psf-memo-db API serves a post with txid (.+) authored by a (second|third) address with a like count of (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const addr = m[2] === 'second' ? SECOND_ADDRESS : THIRD_ADDRESS
      const likeCount = parseInt(resolveParam(m[3], example), 10)
      world.memoDb.addPost({ txid, addr, likeCount, text: 'A sample post', blockHeight: 100 })
    }
  },
  {
    name: 'API serves post with second/third address and no like count',
    pattern: /^the psf-memo-db API serves a post with txid (.+) authored by a (second|third) address with no like count recorded$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const addr = m[2] === 'second' ? SECOND_ADDRESS : THIRD_ADDRESS
      world.memoDb.addPost({ txid, addr, likeCount: undefined, text: 'A sample post', blockHeight: 100 })
    }
  },
  {
    name: 'open recent posts feed',
    pattern: /^I open the recent posts feed$/,
    async run (m, example, world) {
      await world.recentFeedPage.load()
      world.currentPath = RecentFeedPage.RECENT_FEED_PATH
      world.renderedFeed = world.recentFeedPage.posts.map((post) => renderPostText(post.text))
    }
  },
  {
    name: 'open profile page for author',
    pattern: /^I open the profile page for the author of the post with txid (.+)$/,
    async run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const post = world.memoDb.posts.find((p) => p.txid === txid)
      if (!post) {
        throw new Error(`No API post found for txid ${txid}.`)
      }
      world.profilePage.addr = post.addr
      await world.profilePage.load()
      world.currentPath = `${ProfilePage.PROFILE_PATH_PREFIX}/${encodeURIComponent(post.addr)}`
    }
  },
  {
    name: 'thread contains a reply',
    pattern: /^the thread for the post with txid (.+) contains a reply with txid (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const replyTxid = resolveParam(m[2], example)
      const expectedReplyCount = parseInt(example.expected_reply, 10)
      const rootPost = world.memoDb.posts.find((p) => p.txid === txid)
      if (!rootPost) {
        throw new Error(`No API post found for txid ${txid}.`)
      }
      const thread = {
        post: {
          ...rootPost,
          replies: [{
            txid: replyTxid,
            addr: 'bitcoincash:reply-author',
            text: 'A sample reply',
            likeCount: Number.isNaN(expectedReplyCount) ? 0 : expectedReplyCount,
            blockHeight: rootPost.blockHeight + 1,
            replies: []
          }]
        }
      }
      world.memoDb.addThread(txid, thread)
    }
  },
  {
    name: 'post shows like count',
    pattern: /^the post with txid (.+) shows the like count (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const post = findDisplayedPost(txid, world)
      if (!post) {
        throw new Error(`Post ${txid} is not displayed.`)
      }
      const actual = post.likeCount ?? 0
      if (actual !== expected) {
        throw new Error(`Expected like count ${expected} for ${txid}, got ${actual}.`)
      }
    }
  },
  {
    name: 'reply shows like count',
    pattern: /^the reply with txid (.+) shows the like count (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const post = world.threadPage.getPost(txid)
      if (!post) {
        throw new Error(`Reply ${txid} is not displayed.`)
      }
      const actual = post.likeCount ?? 0
      if (actual !== expected) {
        throw new Error(`Expected like count ${expected} for reply ${txid}, got ${actual}.`)
      }
    }
  },
  {
    name: 'API reports I follow address',
    pattern: /^the psf-memo-db API reports that I follow the address (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.memoDb.setFollowState(myAddr, addr, true)
    }
  },
  {
    name: 'open profile page for address',
    pattern: /^I open the profile page for the address (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.profilePage = new ProfilePage({
        memoDb: world.memoDb,
        addr,
        myAddr,
        memoFollow: world.memoFollow,
        memoMute: world.memoMute
      })
      await world.profilePage.load()
      world.currentPath = `${ProfilePage.PROFILE_PATH_PREFIX}/${encodeURIComponent(addr)}`
    }
  },
  {
    name: 'open profile page for own address',
    pattern: /^I open the profile page for my own address$/,
    async run (m, example, world) {
      const myAddr = world.wallet.walletInfo.cashAddress
      world.profilePage = new ProfilePage({
        memoDb: world.memoDb,
        addr: myAddr,
        myAddr,
        memoFollow: world.memoFollow,
        memoMute: world.memoMute
      })
      await world.profilePage.load()
      world.currentPath = `${ProfilePage.PROFILE_PATH_PREFIX}/${encodeURIComponent(myAddr)}`
    }
  },
  {
    name: 'profile page shows Follow button',
    pattern: /^the profile page shows a Follow button$/,
    run (m, example, world) {
      if (!world.profilePage) {
        throw new Error('No profile page is loaded.')
      }
      if (!world.profilePage.canFollow()) {
        throw new Error('Profile page cannot show a Follow button for this address.')
      }
      if (world.profilePage.isFollowing()) {
        throw new Error('Profile page shows Unfollow, but Follow was expected.')
      }
    }
  },
  {
    name: 'profile page shows Unfollow button',
    pattern: /^the profile page shows an Unfollow button$/,
    run (m, example, world) {
      if (!world.profilePage) {
        throw new Error('No profile page is loaded.')
      }
      if (!world.profilePage.canFollow()) {
        throw new Error('Profile page cannot show an Unfollow button for this address.')
      }
      if (!world.profilePage.isFollowing()) {
        throw new Error('Profile page shows Follow, but Unfollow was expected.')
      }
    }
  },
  {
    name: 'profile page does not show Follow button',
    pattern: /^the profile page does not show a Follow button$/,
    run (m, example, world) {
      if (!world.profilePage) {
        throw new Error('No profile page is loaded.')
      }
      if (world.profilePage.canFollow()) {
        throw new Error('Profile page should not show a Follow button.')
      }
    }
  },
  {
    name: 'click Follow button',
    pattern: /^I click the Follow button$/,
    async run (m, example, world) {
      if (isTopicFeedActive(world)) {
        await world.topicFeedPage.follow()
      } else {
        await world.profilePage.follow()
      }
    }
  },
  {
    name: 'click Unfollow button',
    pattern: /^I click the Unfollow button$/,
    async run (m, example, world) {
      if (isTopicFeedActive(world)) {
        await world.topicFeedPage.unfollow()
      } else {
        await world.profilePage.unfollow()
      }
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo follow prefix for address',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo follow prefix for the address (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const hash160 = world.wallet.bchjs.Address.toHash160(addr)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_FOLLOW_PREFIX) {
        throw new Error(`Expected Memo follow prefix ${MEMO_FOLLOW_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg.toString('hex') !== hash160) {
        throw new Error(`Broadcast follow hash160 did not match ${addr}.`)
      }
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo unfollow prefix for address',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo unfollow prefix for the address (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const hash160 = world.wallet.bchjs.Address.toHash160(addr)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_UNFOLLOW_PREFIX) {
        throw new Error(`Expected Memo unfollow prefix ${MEMO_UNFOLLOW_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg.toString('hex') !== hash160) {
        throw new Error(`Broadcast unfollow hash160 did not match ${addr}.`)
      }
    }
  },
  {
    name: 'API reports I mute address',
    pattern: /^the psf-memo-db API reports that I mute the address (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.memoDb.setMuteState(myAddr, addr, true)
    }
  },
  {
    name: 'profile page shows Mute button',
    pattern: /^the profile page shows a Mute button$/,
    run (m, example, world) {
      if (!world.profilePage) {
        throw new Error('No profile page is loaded.')
      }
      if (!world.profilePage.canMute()) {
        throw new Error('Profile page cannot show a Mute button for this address.')
      }
      if (world.profilePage.isMuting()) {
        throw new Error('Profile page shows Unmute, but Mute was expected.')
      }
    }
  },
  {
    name: 'profile page shows Unmute button',
    pattern: /^the profile page shows an Unmute button$/,
    run (m, example, world) {
      if (!world.profilePage) {
        throw new Error('No profile page is loaded.')
      }
      if (!world.profilePage.canMute()) {
        throw new Error('Profile page cannot show an Unmute button for this address.')
      }
      if (!world.profilePage.isMuting()) {
        throw new Error('Profile page shows Mute, but Unmute was expected.')
      }
    }
  },
  {
    name: 'profile page does not show Mute button',
    pattern: /^the profile page does not show a Mute button$/,
    run (m, example, world) {
      if (!world.profilePage) {
        throw new Error('No profile page is loaded.')
      }
      if (world.profilePage.canMute()) {
        throw new Error('Profile page should not show a Mute button.')
      }
    }
  },
  {
    name: 'click Mute button',
    pattern: /^I click the Mute button$/,
    async run (m, example, world) {
      await world.profilePage.mute()
    }
  },
  {
    name: 'click Unmute button',
    pattern: /^I click the Unmute button$/,
    async run (m, example, world) {
      await world.profilePage.unmute()
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo mute prefix for address',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo mute prefix for the address (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const hash160 = world.wallet.bchjs.Address.toHash160(addr)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_MUTE_PREFIX) {
        throw new Error(`Expected Memo mute prefix ${MEMO_MUTE_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg.toString('hex') !== hash160) {
        throw new Error(`Broadcast mute hash160 did not match ${addr}.`)
      }
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo unmute prefix for address',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo unmute prefix for the address (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const hash160 = world.wallet.bchjs.Address.toHash160(addr)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_UNMUTE_PREFIX) {
        throw new Error(`Expected Memo unmute prefix ${MEMO_UNMUTE_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg.toString('hex') !== hash160) {
        throw new Error(`Broadcast unmute hash160 did not match ${addr}.`)
      }
    }
  },
  {
    name: 'API serves topic with post count',
    pattern: /^the psf-memo-db API serves a topic named "([^"]+)" with (\d+) posts?$/,
    run (m, example, world) {
      const room = m[1]
      const count = parseInt(m[2], 10)
      world.memoDb.addTopic(room, count)
    }
  },
  {
    name: 'API serves post in topic with address and text',
    pattern: /^the psf-memo-db API serves a post with txid (.+) in the topic "([^"]+)" authored by the address (.+) with text "(.+)"$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const room = m[2]
      const addr = resolveParam(m[3], example)
      const text = m[4]
      world.memoDb.addTopicPost(room, { txid, addr, text, blockHeight: 100 })
    }
  },
  {
    name: 'API serves post in topic with second address and text',
    pattern: /^the psf-memo-db API serves a post with txid (.+) in the topic "([^"]+)" authored by a second address with text "(.+)"$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const room = m[2]
      const text = m[3]
      world.memoDb.addTopicPost(room, { txid, addr: SECOND_ADDRESS, text, blockHeight: 101 })
    }
  },
  {
    name: 'API serves no posts for topic',
    pattern: /^the psf-memo-db API serves no posts for the topic "([^"]+)"$/,
    run (m, example, world) {
      const room = m[1]
      world.memoDb.topicCounts.set(room, 0)
      world.memoDb.topicPosts[room] = []
    }
  },
  {
    name: 'open topics page',
    pattern: /^I open the topics page$/,
    async run (m, example, world) {
      await world.topicDiscoveryPage.load()
      world.currentPath = TopicDiscoveryPage.TOPICS_PATH
    }
  },
  {
    name: 'topics page shows topic count',
    pattern: /^the topics page shows the topic (<topic>) with (<count>) posts$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const topic = world.topicDiscoveryPage.getTopic(room)
      if (!topic) {
        throw new Error(`Topic ${room} is not shown on the topics page.`)
      }
      if (topic.postCount !== expected) {
        throw new Error(`Expected ${room} to have ${expected} posts, got ${topic.postCount}.`)
      }
    }
  },
  {
    name: 'click topic',
    pattern: /^I click the topic (<topic>)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      world.topicDiscoveryPage.openTopic(room)
    }
  },
  {
    name: 'navigate to topic feed',
    pattern: /^the app navigates to the topic feed for (<topic>)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      const expected = TopicFeedPage.topicFeedPath(room)
      if (world.currentPath !== expected) {
        throw new Error(`Expected to navigate to ${expected}, but current path is ${world.currentPath}.`)
      }
    }
  },
  {
    name: 'open topic feed',
    pattern: /^I open the topic feed for (?:the topic )?"?(<topic>|[^"]+)"?$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.topicFeedPage = new TopicFeedPage({
        memoDb: world.memoDb,
        room,
        myAddr,
        memoTopicFollow: world.memoTopicFollow
      })
      await world.topicFeedPage.load()
      world.currentPath = TopicFeedPage.topicFeedPath(room)

      // Set up the topic post composer for this room so topic messages can be
      // composed and broadcast, reflecting new posts onto the shared feed.
      const memoTopicPost = new MemoTopicPost({ wallet: world.wallet, room, feed: world.feed })
      world.topicPostPage = new TopicPostPage({ memoTopicPost })
    }
  },
  {
    name: 'topic feed shows post text',
    pattern: /^the feed shows the post with txid (<txid>) with text (<text>)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const expected = resolveParam(m[2], example)
      const post = world.topicFeedPage.getPost(txid)
      if (!post) {
        throw new Error(`Post ${txid} is not shown in the topic feed.`)
      }
      if (post.text !== expected) {
        throw new Error(`Expected post ${txid} text "${expected}", got "${post.text}".`)
      }
    }
  },
  {
    name: 'topic feed shows empty message',
    pattern: /^the feed shows a message that there are no posts$/,
    run (m, example, world) {
      const posts = world.topicFeedPage.posts
      if (!Array.isArray(posts) || posts.length !== 0) {
        throw new Error(`Expected topic feed to be empty, but found ${Array.isArray(posts) ? posts.length : 'non-array'} posts.`)
      }
    }
  },
  {
    name: 'API reports I do not follow topic',
    pattern: /^the psf-memo-db API reports that I do not follow the topic (<topic>)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.memoDb.setTopicFollowState(myAddr, room, false)
    }
  },
  {
    name: 'API reports I follow topic',
    pattern: /^the psf-memo-db API reports that I follow the topic (<topic>)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.memoDb.setTopicFollowState(myAddr, room, true)
    }
  },
  {
    name: 'topic feed page shows Follow button',
    pattern: /^the topic feed page shows a Follow button$/,
    run (m, example, world) {
      if (!world.topicFeedPage) throw new Error('No topic feed page is loaded.')
      if (!world.topicFeedPage.canFollow()) throw new Error('Topic feed cannot show a Follow button.')
      if (world.topicFeedPage.isFollowing()) throw new Error('Topic feed shows Unfollow, but Follow was expected.')
    }
  },
  {
    name: 'topic feed page shows Unfollow button',
    pattern: /^the topic feed page shows an Unfollow button$/,
    run (m, example, world) {
      if (!world.topicFeedPage) throw new Error('No topic feed page is loaded.')
      if (!world.topicFeedPage.canFollow()) throw new Error('Topic feed cannot show an Unfollow button.')
      if (!world.topicFeedPage.isFollowing()) throw new Error('Topic feed shows Follow, but Unfollow was expected.')
    }
  },
  {
    name: 'broadcasts topic-follow prefix',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo topic-follow prefix for the topic (<topic>)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) throw new Error('No OP_RETURN transaction was broadcast.')
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_TOPIC_FOLLOW_PREFIX) {
        throw new Error(`Expected Memo topic-follow prefix ${MEMO_TOPIC_FOLLOW_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg !== room) {
        throw new Error(`Broadcast topic-follow payload did not match topic ${room}.`)
      }
    }
  },
  {
    name: 'broadcasts topic-unfollow prefix',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo topic-unfollow prefix for the topic (<topic>)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) throw new Error('No OP_RETURN transaction was broadcast.')
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_TOPIC_UNFOLLOW_PREFIX) {
        throw new Error(`Expected Memo topic-unfollow prefix ${MEMO_TOPIC_UNFOLLOW_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg !== room) {
        throw new Error(`Broadcast topic-unfollow payload did not match topic ${room}.`)
      }
    }
  },
  {
    name: 'compose topic message',
    pattern: /^I compose a topic message with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) throw new Error(`Missing example value for "${param}"`)
      world.topicPostPage.setInput(example[param])
    }
  },
  {
    name: 'submit topic message',
    pattern: /^I submit the topic message$/,
    async run (m, example, world) {
      await world.topicPostPage.submit()
    }
  },
  {
    name: 'broadcasts topic-message prefix',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo topic-message prefix for the topic (<topic>)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) throw new Error('No OP_RETURN transaction was broadcast.')
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_TOPIC_MESSAGE_PREFIX) {
        throw new Error(`Expected Memo topic-message prefix ${MEMO_TOPIC_MESSAGE_PREFIX}, got "${last.prefix}".`)
      }
      const expectedPayload = room + world.topicPostPage.input
      if (last.msg !== expectedPayload) {
        throw new Error(`Broadcast topic-message payload did not match ${room} + input.`)
      }
    }
  },
  {
    name: 'topic feed shows new post from my address',
    pattern: /^the topic feed shows a new post from my address with the text "(.+)"$/,
    run (m, example, world) {
      const expectedText = resolveParam(m[1], example)
      const myAddress = world.wallet.walletInfo.cashAddress
      const found = world.feed.posts.find((p) => p.text === expectedText && p.address === myAddress)
      if (!found) throw new Error(`Topic feed does not show the new post with text "${expectedText}".`)
    }
  },
  {
    name: 'topic post composer shows validation error',
    pattern: /^the topic post composer shows a validation error$/,
    run (m, example, world) {
      if (world.topicPostPage.submitError !== 'topic_post_validation') {
        throw new Error(`Expected topic_post_validation, got ${world.topicPostPage.submitError}.`)
      }
    }
  },
  {
    name: 'topic post composer shows length error',
    pattern: /^the topic post composer shows a length error$/,
    run (m, example, world) {
      if (world.topicPostPage.submitError !== 'topic_post_length') {
        throw new Error(`Expected topic_post_length, got ${world.topicPostPage.submitError}.`)
      }
    }
  },
  {
    name: 'topic post composer remaining byte count',
    pattern: /^the topic post composer shows a remaining byte count of (<count>)$/,
    run (m, example, world) {
      const expected = parseInt(resolveParam(m[1], example), 10)
      if (Number.isNaN(expected)) throw new Error(`Invalid expected count for "${m[1]}".`)
      const actual = world.topicPostPage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining bytes, got ${actual}.`)
      }
    }
  },
  {
    name: 'poll with txid exists',
    pattern: /^a poll with the txid (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      world.polls.addPoll({ txid, question: 'existing poll', optionCount: 2 })
      world.currentPollTxid = txid
    }
  },
  {
    name: 'compose poll',
    pattern: /^I compose a poll with the question "<([A-Za-z0-9_]+)>" and (.+) options$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) throw new Error(`Missing example value for "${param}".`)
      world.pollCreatePage.setInput(example[param])
      world.pollCreatePage.setOptionCount(resolveParam(m[2], example))
    }
  },
  {
    name: 'submit poll',
    pattern: /^I submit the poll$/,
    async run (m, example, world) {
      await world.pollCreatePage.submit()
    }
  },
  {
    name: 'broadcasts create-poll prefix for question',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo create-poll prefix for the question "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) throw new Error(`Missing example value for "${param}".`)
      const expected = example[param]
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) throw new Error('No OP_RETURN transaction was broadcast.')
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_CREATE_POLL_PREFIX) {
        throw new Error(`Expected Memo create-poll prefix ${MEMO_CREATE_POLL_PREFIX}, got "${last.prefix}".`)
      }
      const { question } = decodeCreatePollPayload(last.msg)
      if (question !== expected) {
        throw new Error(`Broadcast question "${question}" did not match "${expected}".`)
      }
    }
  },
  {
    name: 'broadcasts create-poll prefix carrying option count',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo create-poll prefix carrying (.+) options$/,
    run (m, example, world) {
      const expected = parseInt(resolveParam(m[1], example), 10)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) throw new Error('No OP_RETURN transaction was broadcast.')
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_CREATE_POLL_PREFIX) {
        throw new Error(`Expected Memo create-poll prefix ${MEMO_CREATE_POLL_PREFIX}, got "${last.prefix}".`)
      }
      const { optionCount } = decodeCreatePollPayload(last.msg)
      if (optionCount !== expected) {
        throw new Error(`Expected option count ${expected}, got ${optionCount}.`)
      }
    }
  },
  {
    name: 'poll composer shows validation/length error',
    pattern: /^the poll composer shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'poll_create_validation' : 'poll_create_length'
      if (world.pollCreatePage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.pollCreatePage.submitError}.`)
      }
    }
  },
  {
    name: 'poll composer remaining byte count',
    pattern: /^the poll composer shows a remaining byte count of <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const param = m[1]
      const expected = parseInt(example[param], 10)
      if (Number.isNaN(expected)) throw new Error(`Invalid expected count for "${param}".`)
      const actual = world.pollCreatePage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining bytes, got ${actual}.`)
      }
    }
  },
  {
    name: 'open poll',
    pattern: /^I open the poll with txid (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      world.currentPollTxid = txid
      const memoPollOption = new MemoPollOption({ wallet: world.wallet, pollTxid: txid, polls: world.polls })
      world.pollOptionPage = new PollOptionPage({ memoPollOption })
      const memoPollVote = new MemoPollVote({ wallet: world.wallet, pollTxid: txid, polls: world.polls })
      world.pollVotePage = new PollVotePage({ memoPollVote })
    }
  },
  {
    name: 'compose option',
    pattern: /^I compose an option with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) throw new Error(`Missing example value for "${param}".`)
      world.pollOptionPage.setInput(example[param])
    }
  },
  {
    name: 'submit option',
    pattern: /^I submit the option$/,
    async run (m, example, world) {
      await world.pollOptionPage.submit()
    }
  },
  {
    name: 'broadcasts add-poll-option prefix',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo add-poll-option prefix for the poll (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) throw new Error('No OP_RETURN transaction was broadcast.')
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_ADD_POLL_OPTION_PREFIX) {
        throw new Error(`Expected Memo add-poll-option prefix ${MEMO_ADD_POLL_OPTION_PREFIX}, got "${last.prefix}".`)
      }
      const { pollTxid } = decodePollTxidPayload(last.msg)
      if (pollTxid !== txid) {
        throw new Error(`Broadcast poll txid ${pollTxid} did not match ${txid}.`)
      }
    }
  },
  {
    name: 'poll shows new option',
    pattern: /^the poll shows the new option with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) throw new Error(`Missing example value for "${param}".`)
      const expected = example[param]
      const txid = world.currentPollTxid
      const found = world.polls.getOptions(txid).find((o) => o.option === expected && o.address === world.wallet.walletInfo.cashAddress)
      if (!found) {
        throw new Error(`Poll does not show the new option "${expected}".`)
      }
    }
  },
  {
    name: 'add-option composer shows validation/length error',
    pattern: /^the add-option composer shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'poll_option_validation' : 'poll_option_length'
      if (world.pollOptionPage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.pollOptionPage.submitError}.`)
      }
    }
  },
  {
    name: 'add-option composer remaining byte count',
    pattern: /^the add-option composer shows a remaining byte count of <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const param = m[1]
      const expected = parseInt(example[param], 10)
      if (Number.isNaN(expected)) throw new Error(`Invalid expected count for "${param}".`)
      const actual = world.pollOptionPage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining bytes, got ${actual}.`)
      }
    }
  },
  {
    name: 'vote with comment',
    pattern: /^I vote with the comment "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) throw new Error(`Missing example value for "${param}".`)
      world.pollVotePage.setInput(example[param])
    }
  },
  {
    name: 'submit vote',
    pattern: /^I submit the vote$/,
    async run (m, example, world) {
      await world.pollVotePage.submit()
    }
  },
  {
    name: 'broadcasts poll-vote prefix',
    pattern: /^the app broadcasts an OP_RETURN transaction with the Memo poll-vote prefix for the poll (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) throw new Error('No OP_RETURN transaction was broadcast.')
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_POLL_VOTE_PREFIX) {
        throw new Error(`Expected Memo poll-vote prefix ${MEMO_POLL_VOTE_PREFIX}, got "${last.prefix}".`)
      }
      const { pollTxid } = decodePollTxidPayload(last.msg)
      if (pollTxid !== txid) {
        throw new Error(`Broadcast poll txid ${pollTxid} did not match ${txid}.`)
      }
    }
  },
  {
    name: 'poll shows my vote',
    pattern: /^the poll shows my vote with the comment "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) throw new Error(`Missing example value for "${param}".`)
      const expected = example[param]
      const txid = world.currentPollTxid
      const found = world.polls.getVotes(txid).find((v) => v.comment === expected && v.address === world.wallet.walletInfo.cashAddress)
      if (!found) {
        throw new Error(`Poll does not show my vote with comment "${expected}".`)
      }
    }
  },
  {
    name: 'vote composer shows validation/length error',
    pattern: /^the vote composer shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'poll_vote_validation' : 'poll_vote_length'
      if (world.pollVotePage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.pollVotePage.submitError}.`)
      }
    }
  },
  {
    name: 'API has search post',
    pattern: /^the psf-memo-db API has a post with the text "(.+)"$/,
    run (m, example, world) {
      const text = resolveParam(m[1], example)
      const txid = require('crypto').createHash('sha256').update(text).digest('hex')
      world.memoDb.addSearchPost({
        txid,
        addr: `addr-${txid.slice(0, 8)}`,
        text,
        blockHeight: 100
      })
    }
  },
  {
    name: 'API has search profile',
    pattern: /^the psf-memo-db API has a profile named "(.+)" with the bio "(.+)"$/,
    run (m, example, world) {
      const name = resolveParam(m[1], example)
      const text = resolveParam(m[2], example)
      const addr = `addr-${require('crypto').createHash('sha256').update(name).digest('hex').slice(0, 8)}`
      world.memoDb.addSearchProfile({ addr, name, text, blockHeight: 100 })
    }
  },
  {
    name: 'open search page',
    pattern: /^I open the Search page$/,
    async run (m, example, world) {
      world.currentPath = SearchPage.SEARCH_PATH
    }
  },
  {
    name: 'submit search',
    pattern: /^I submit a search for (.+)$/,
    async run (m, example, world) {
      const query = resolveParam(m[1], example)
      world.searchPage.setQuery(query)
      await world.searchPage.submit()
    }
  },
  {
    name: 'search results include post text',
    pattern: /^the search results include a post with the text (.+)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      const found = world.searchPage.posts.find((p) => p.text === expected)
      if (!found) {
        throw new Error(`Search results do not include a post with text "${expected}".`)
      }
    }
  },
  {
    name: 'search results include profile name',
    pattern: /^the search results include a profile named (.+)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      const found = world.searchPage.profiles.find((p) => p.name === expected)
      if (!found) {
        throw new Error(`Search results do not include a profile named "${expected}".`)
      }
    }
  },
  {
    name: 'search results include no posts',
    pattern: /^the search results include no posts$/,
    run (m, example, world) {
      if (world.searchPage.posts.length !== 0) {
        throw new Error(`Expected no posts in search results, got ${world.searchPage.posts.length}.`)
      }
    }
  },
  {
    name: 'search results include no profiles',
    pattern: /^the search results include no profiles$/,
    run (m, example, world) {
      if (world.searchPage.profiles.length !== 0) {
        throw new Error(`Expected no profiles in search results, got ${world.searchPage.profiles.length}.`)
      }
    }
  },
  {
    name: 'wallet follows address',
    pattern: /^my wallet follows the address (.+)$/,
    run (m, example, world) {
      const followee = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.memoDb.setFollowState(myAddr, followee, true)
    }
  },
  {
    name: 'API serves post with txid address text and block height',
    pattern: /^the psf-memo-db API serves a post with txid (.+) authored by the address (.+) with text (.+) at block height (\d+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const addr = resolveParam(m[2], example)
      const text = resolveText(m[3], example)
      const blockHeight = parseInt(m[4], 10)
      world.memoDb.addPost({ txid, addr, text, blockHeight })
    }
  },
  {
    name: 'API serves post with txid address and text',
    pattern: /^the psf-memo-db API serves a post with txid (.+) authored by the address (.+) with text (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const addr = resolveParam(m[2], example)
      const text = resolveText(m[3], example)
      world.memoDb.addPost({ txid, addr, text, blockHeight: 100 })
    }
  },
  {
    name: 'API serves post with txid my address and text',
    pattern: /^the psf-memo-db API serves a post with txid (.+) authored by my wallet address with text (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      const text = resolveText(m[2], example)
      world.memoDb.addPost({ txid, addr: myAddr, text, blockHeight: 100 })
    }
  },
  {
    name: 'API serves reply with txid parent and text',
    pattern: /^the psf-memo-db API serves a reply with txid ([0-9a-fA-F]{64}) to the post with txid ([0-9a-fA-F]{64}) with text (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const parentTxid = resolveParam(m[2], example)
      const text = resolveText(m[3], example)
      world.memoDb.addReply({ txid, parentTxid, text, addr: 'bitcoincash:reply-author', blockHeight: 100 })
    }
  },
  {
    name: 'follow no one',
    pattern: /^I follow no one$/,
    run (m, example, world) {
      const myAddr = world.wallet.walletInfo.cashAddress
      for (const key of Object.keys(world.memoDb.followState)) {
        if (key.startsWith(`${myAddr}|`)) {
          world.memoDb.followState[key] = false
        }
      }
    }
  },
  {
    name: 'open following feed',
    pattern: /^I open the Following feed$/,
    async run (m, example, world) {
      await world.followingFeedPage.load()
      world.currentPath = FollowingFeedPage.FOLLOWING_FEED_PATH
    }
  },
  {
    name: 'open following feed with page size',
    pattern: /^I open the Following feed with page size (\d+)$/,
    async run (m, example, world) {
      const limit = parseInt(m[1], 10)
      await world.followingFeedPage.load({ limit })
      world.currentPath = FollowingFeedPage.FOLLOWING_FEED_PATH
    }
  },
  {
    name: 'feed shows post with text',
    pattern: /^the feed shows the post with text (.+)$/,
    run (m, example, world) {
      const expected = resolveText(m[1], example)
      const found = world.followingFeedPage.posts.find((p) => p.text === expected)
      if (!found) {
        throw new Error(`Following feed does not show a post with text "${expected}".`)
      }
    }
  },
  {
    name: 'feed does not show post with text',
    pattern: /^the feed does not show the post with text (.+)$/,
    run (m, example, world) {
      const expected = resolveText(m[1], example)
      const found = world.followingFeedPage.posts.find((p) => p.text === expected)
      if (found) {
        throw new Error(`Following feed unexpectedly shows a post with text "${expected}".`)
      }
    }
  },
  {
    name: 'feed shows post txid before txid',
    pattern: /^the feed shows the post with txid (.+) before the post with txid (.+)$/,
    run (m, example, world) {
      const firstTxid = resolveParam(m[1], example)
      const secondTxid = resolveParam(m[2], example)
      const posts = world.followingFeedPage.posts
      const firstIndex = posts.findIndex((p) => p.txid === firstTxid)
      const secondIndex = posts.findIndex((p) => p.txid === secondTxid)
      if (firstIndex === -1) {
        throw new Error(`Following feed does not show post ${firstTxid}.`)
      }
      if (secondIndex === -1) {
        throw new Error(`Following feed does not show post ${secondTxid}.`)
      }
      if (firstIndex >= secondIndex) {
        throw new Error(`Expected post ${firstTxid} before ${secondTxid}, but found at indices ${firstIndex}, ${secondIndex}.`)
      }
    }
  },
  {
    name: 'feed shows N posts',
    pattern: /^the feed shows (\d+) posts$/,
    run (m, example, world) {
      const expected = parseInt(m[1], 10)
      const actual = world.followingFeedPage.posts.length
      if (actual !== expected) {
        throw new Error(`Expected ${expected} posts in following feed, got ${actual}.`)
      }
    }
  },
  {
    name: 'feed can load more posts',
    pattern: /^the feed can load more posts$/,
    run (m, example, world) {
      if (!world.followingFeedPage.canLoadMore()) {
        throw new Error('Expected following feed to have more posts, but pagination says there are none.')
      }
    }
  },
  {
    name: 'feed shows no posts',
    pattern: /^the feed shows no posts$/,
    run (m, example, world) {
      if (world.followingFeedPage.posts.length !== 0) {
        throw new Error(`Expected no posts in following feed, got ${world.followingFeedPage.posts.length}.`)
      }
    }
  },
  {
    name: 'feed shows not following anyone message',
    pattern: /^the feed shows a message that I am not following anyone$/,
    run (m, example, world) {
      if (!world.followingFeedPage.emptyBecauseNoFollows) {
        throw new Error('Expected following feed to show the not-following-anyone message.')
      }
    }
  },
  {
    name: 'API serves reply to my post by address with text',
    pattern: /^the psf-memo-db API serves a reply with txid (.+) to the post with txid (.+) by the address (.+) with text (.+?)(?: at block height (\d+))?$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const parentTxid = resolveParam(m[2], example)
      const addr = resolveParam(m[3], example)
      const text = resolveText(m[4], example)
      const blockHeight = m[5] ? parseInt(m[5], 10) : 100
      world.memoDb.addReply({ txid, parentTxid, text, addr, blockHeight })
    }
  },
  {
    name: 'API serves reply to my post by me with text',
    pattern: /^the psf-memo-db API serves a reply with txid (.+) to the post with txid (.+) by my wallet address with text (.+?)(?: at block height (\d+))?$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const parentTxid = resolveParam(m[2], example)
      const text = resolveText(m[3], example)
      const blockHeight = m[4] ? parseInt(m[4], 10) : 100
      const myAddr = world.wallet.walletInfo.cashAddress
      world.memoDb.addReply({ txid, parentTxid, text, addr: myAddr, blockHeight })
    }
  },
  {
    name: 'API serves like on my post by address',
    pattern: /^the psf-memo-db API serves a like with txid (.+) on the post with txid (.+) by the address (.+?)(?: at block height (\d+))?$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const postTxid = resolveParam(m[2], example)
      const addr = resolveParam(m[3], example)
      const blockHeight = m[4] ? parseInt(m[4], 10) : 100
      world.memoDb.addLike({ txid, postTxid, addr, blockHeight })
    }
  },
  {
    name: 'API records address follows me',
    pattern: /^the psf-memo-db API records that the address (.+) follows my wallet address$/,
    run (m, example, world) {
      const followerAddr = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.memoDb.addFollower(followerAddr, myAddr)
    }
  },
  {
    name: 'open notifications page',
    pattern: /^I open the Notifications page$/,
    async run (m, example, world) {
      await world.notificationsPage.load()
      world.currentPath = NotificationsPage.NOTIFICATIONS_PATH
    }
  },
  {
    name: 'open notifications page with page size',
    pattern: /^I open the Notifications page with page size (\d+)$/,
    async run (m, example, world) {
      const limit = parseInt(m[1], 10)
      await world.notificationsPage.load({ limit })
      world.currentPath = NotificationsPage.NOTIFICATIONS_PATH
    }
  },
  {
    name: 'notifications include reply notification',
    pattern: /^the notifications include a reply notification from the address (.+) with text (.+)$/,
    run (m, example, world) {
      const expectedAddr = resolveParam(m[1], example)
      const expectedText = resolveText(m[2], example)
      const found = world.notificationsPage.notifications.find((n) =>
        n.type === 'reply' && n.addr === expectedAddr && n.text === expectedText
      )
      if (!found) {
        throw new Error(`Notifications do not include a reply from ${expectedAddr} with text "${expectedText}".`)
      }
    }
  },
  {
    name: 'notifications include like notification',
    pattern: /^the notifications include a like notification from the address (.+)$/,
    run (m, example, world) {
      const expectedAddr = resolveParam(m[1], example)
      const found = world.notificationsPage.notifications.find((n) =>
        n.type === 'like' && n.addr === expectedAddr
      )
      if (!found) {
        throw new Error(`Notifications do not include a like from ${expectedAddr}.`)
      }
    }
  },
  {
    name: 'notifications include follow notification',
    pattern: /^the notifications include a follow notification from the address (.+)$/,
    run (m, example, world) {
      const expectedAddr = resolveParam(m[1], example)
      const found = world.notificationsPage.notifications.find((n) =>
        n.type === 'follow' && n.addr === expectedAddr
      )
      if (!found) {
        throw new Error(`Notifications do not include a follow from ${expectedAddr}.`)
      }
    }
  },
  {
    name: 'notifications show like before reply',
    pattern: /^the notifications show the like notification before the reply notification$/,
    run (m, example, world) {
      const notifications = world.notificationsPage.notifications
      const likeIndex = notifications.findIndex((n) => n.type === 'like')
      const replyIndex = notifications.findIndex((n) => n.type === 'reply')
      if (likeIndex === -1) throw new Error('Notifications do not include a like notification.')
      if (replyIndex === -1) throw new Error('Notifications do not include a reply notification.')
      if (likeIndex >= replyIndex) {
        throw new Error('Expected like notification to appear before reply notification.')
      }
    }
  },
  {
    name: 'notifications show N notifications',
    pattern: /^the notifications show (\d+) notification$/,
    run (m, example, world) {
      const expected = parseInt(m[1], 10)
      const actual = world.notificationsPage.notifications.length
      if (actual !== expected) {
        throw new Error(`Expected ${expected} notifications, got ${actual}.`)
      }
    }
  },
  {
    name: 'notifications can load more',
    pattern: /^the notifications can load more$/,
    run (m, example, world) {
      if (!world.notificationsPage.canLoadMore()) {
        throw new Error('Expected notifications to have more pages, but pagination says there are none.')
      }
    }
  },
  {
    name: 'notifications include no notifications',
    pattern: /^the notifications include no notifications$/,
    run (m, example, world) {
      if (world.notificationsPage.notifications.length !== 0) {
        throw new Error(`Expected no notifications, got ${world.notificationsPage.notifications.length}.`)
      }
    }
  },
  {
    name: 'notifications show no notifications message',
    pattern: /^the notifications show a message that I have no notifications$/,
    run (m, example, world) {
      if (!world.notificationsPage.empty) {
        throw new Error('Expected notifications page to show the no-notifications message.')
      }
    }
  },
  {
    name: 'API serves N recent posts',
    pattern: /^the psf-memo-db API serves (<[A-Za-z0-9_]+>) recent posts$/,
    run (m, example, world) {
      const count = parseInt(resolveParam(m[1], example), 10)
      for (let i = 0; i < count; i++) {
        world.memoDb.addPost({
          txid: `recent-post-${i + 1}`.padEnd(64, '0'),
          addr: `addr-${i + 1}`,
          text: `Recent post ${i + 1}`,
          blockHeight: 100 + i
        })
      }
    }
  },
  {
    name: 'API serves N posts by address',
    pattern: /^the psf-memo-db API serves (<[A-Za-z0-9_]+>) posts authored by the address (.+)$/,
    run (m, example, world) {
      const count = parseInt(resolveParam(m[1], example), 10)
      const addr = resolveParam(m[2], example)
      for (let i = 0; i < count; i++) {
        world.memoDb.addPost({
          txid: `${addr}-post-${i + 1}`.padEnd(64, '0'),
          addr,
          text: `Post ${i + 1}`,
          blockHeight: 100 + i
        })
      }
    }
  },
  {
    name: 'API serves N posts in topic',
    pattern: /^the psf-memo-db API serves (<[A-Za-z0-9_]+>) posts in the topic (.+)$/,
    run (m, example, world) {
      const count = parseInt(resolveParam(m[1], example), 10)
      const room = resolveParam(m[2], example)
      for (let i = 0; i < count; i++) {
        world.memoDb.addTopicPost(room, {
          txid: `${room}-post-${i + 1}`.padEnd(64, '0'),
          addr: `addr-${i + 1}`,
          text: `Topic post ${i + 1}`,
          blockHeight: 100 + i
        })
      }
    }
  },
  {
    name: 'API serves N replies to post',
    pattern: /^the psf-memo-db API serves (<[A-Za-z0-9_]+>) replies to the post with txid (.+)$/,
    run (m, example, world) {
      const count = parseInt(resolveParam(m[1], example), 10)
      const parentTxid = resolveParam(m[2], example)
      for (let i = 0; i < count; i++) {
        world.memoDb.addReply({
          txid: `reply-${i + 1}`.padEnd(64, '0'),
          parentTxid,
          text: `Reply ${i + 1}`,
          addr: 'bitcoincash:reply-author',
          blockHeight: 100 + i
        })
      }
    }
  },
  {
    name: 'API serves N search posts',
    pattern: /^the psf-memo-db API serves (<[A-Za-z0-9_]+>) search posts matching (.+)$/,
    run (m, example, world) {
      const count = parseInt(resolveParam(m[1], example), 10)
      const query = resolveParam(m[2], example)
      for (let i = 0; i < count; i++) {
        world.memoDb.addSearchPost({
          txid: `search-post-${i + 1}`.padEnd(64, '0'),
          addr: `addr-${i + 1}`,
          text: `${query} search result ${i + 1}`,
          blockHeight: 100 + i
        })
      }
    }
  },
  {
    name: 'API serves N profiles',
    pattern: /^the psf-memo-db API serves (<[A-Za-z0-9_]+>) profiles$/,
    run (m, example, world) {
      const count = parseInt(resolveParam(m[1], example), 10)
      for (let i = 0; i < count; i++) {
        world.memoDb.profiles.push({
          addr: `profile-addr-${i + 1}`,
          text: `Profile ${i + 1}`,
          txid: `profile-txid-${i + 1}`.padEnd(64, '0'),
          blockHeight: 100 + i,
          seen: Date.now()
        })
      }
    }
  },
  {
    name: 'recent feed shows 50 posts',
    pattern: /^the recent feed shows 50 posts$/,
    run (m, example, world) {
      const actual = world.recentFeedPage.posts.length
      if (actual !== 50) {
        throw new Error(`Expected 50 posts in recent feed, got ${actual}.`)
      }
    }
  },
  {
    name: 'recent feed can load more posts',
    pattern: /^the recent feed can load more posts$/,
    run (m, example, world) {
      if (!world.recentFeedPage.canLoadMore || !world.recentFeedPage.canLoadMore()) {
        throw new Error('Expected recent feed to have more posts, but pagination says there are none.')
      }
    }
  },
  {
    name: 'following feed shows 50 posts',
    pattern: /^the following feed shows 50 posts$/,
    run (m, example, world) {
      const actual = world.followingFeedPage.posts.length
      if (actual !== 50) {
        throw new Error(`Expected 50 posts in following feed, got ${actual}.`)
      }
    }
  },
  {
    name: 'following feed can load more posts',
    pattern: /^the following feed can load more posts$/,
    run (m, example, world) {
      if (!world.followingFeedPage.canLoadMore()) {
        throw new Error('Expected following feed to have more posts, but pagination says there are none.')
      }
    }
  },
  {
    name: 'topic feed shows 50 posts',
    pattern: /^the topic feed shows 50 posts$/,
    run (m, example, world) {
      const actual = world.topicFeedPage.posts.length
      if (actual !== 50) {
        throw new Error(`Expected 50 posts in topic feed, got ${actual}.`)
      }
    }
  },
  {
    name: 'topic feed can load more posts',
    pattern: /^the topic feed can load more posts$/,
    run (m, example, world) {
      if (!world.topicFeedPage.canLoadMore()) {
        throw new Error('Expected topic feed to have more posts, but pagination says there are none.')
      }
    }
  },
  {
    name: 'notifications show 50 notifications',
    pattern: /^the notifications show 50 notifications$/,
    run (m, example, world) {
      const actual = world.notificationsPage.notifications.length
      if (actual !== 50) {
        throw new Error(`Expected 50 notifications, got ${actual}.`)
      }
    }
  },
  {
    name: 'search results show 50 posts',
    pattern: /^the search results show 50 posts$/,
    run (m, example, world) {
      const actual = world.searchPage.posts.length
      if (actual !== 50) {
        throw new Error(`Expected 50 posts in search results, got ${actual}.`)
      }
    }
  },
  {
    name: 'search results can load more posts',
    pattern: /^the search results can load more posts$/,
    run (m, example, world) {
      if (!world.searchPage.canLoadMore || !world.searchPage.canLoadMore()) {
        throw new Error('Expected search results to have more pages, but pagination says there are none.')
      }
    }
  },
  {
    name: 'profile page shows 50 posts',
    pattern: /^the profile page shows 50 posts$/,
    run (m, example, world) {
      const actual = world.profilePage.posts.length
      if (actual !== 50) {
        throw new Error(`Expected 50 posts on profile page, got ${actual}.`)
      }
    }
  },
  {
    name: 'profile page can load more posts',
    pattern: /^the profile page can load more posts$/,
    run (m, example, world) {
      if (!world.profilePage.canLoadMore || !world.profilePage.canLoadMore()) {
        throw new Error('Expected profile page to have more posts, but pagination says there are none.')
      }
    }
  },
  {
    name: 'recent profiles page shows 50 profiles',
    pattern: /^the recent profiles page shows 50 profiles$/,
    run (m, example, world) {
      const actual = world.recentProfilesPage.profiles.length
      if (actual !== 50) {
        throw new Error(`Expected 50 profiles on recent profiles page, got ${actual}.`)
      }
    }
  },
  {
    name: 'recent profiles page can load more profiles',
    pattern: /^the recent profiles page can load more profiles$/,
    run (m, example, world) {
      if (!world.recentProfilesPage.canLoadMore()) {
        throw new Error('Expected recent profiles page to have more profiles, but pagination says there are none.')
      }
    }
  },
  {
    name: 'open recent profiles page',
    pattern: /^I open the recent profiles page$/,
    async run (m, example, world) {
      await world.recentProfilesPage.load()
      world.currentPath = RecentProfilesPage.RECENT_PROFILES_PATH
    }
  },
  {
    name: 'open profile page for address',
    pattern: /^I open the profile page for the address (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.profilePage = new ProfilePage({
        memoDb: world.memoDb,
        addr,
        myAddr,
        memoFollow: world.memoFollow,
        memoMute: world.memoMute
      })
      await world.profilePage.load()
      world.currentPath = `${ProfilePage.PROFILE_PATH_PREFIX}/${encodeURIComponent(addr)}`
    }
  },
  {
    name: 'open topic feed for topic',
    pattern: /^I open the topic feed for (.+)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const myAddr = world.wallet.walletInfo.cashAddress
      world.topicFeedPage = new TopicFeedPage({
        memoDb: world.memoDb,
        room,
        myAddr,
        memoTopicFollow: world.memoTopicFollow
      })
      await world.topicFeedPage.load()
      world.currentPath = TopicFeedPage.topicFeedPath(room)
    }
  },
  {
    name: 'feed shows embedded YouTube player',
    pattern: /^the feed shows an embedded YouTube player for the video (.+)$/,
    run (m, example, world) {
      const videoId = resolveParam(m[1], example)
      const rendered = getRenderedFeed(world)
      const needle = `${YOUTUBE_EMBED_BASE_URL}/${videoId}`
      const found = rendered.some((html) => html.includes(needle))
      if (!found) {
        throw new Error(`Feed does not show an embedded YouTube player for ${videoId}.`)
      }
    }
  },
  {
    name: 'feed does not show raw URL',
    pattern: /^the feed does not show the raw URL (.+)$/,
    run (m, example, world) {
      const url = resolveText(m[1], example)
      const rendered = getRenderedFeed(world)
      const found = rendered.some((html) => html.includes(url))
      if (found) {
        throw new Error(`Feed unexpectedly shows the raw URL ${url}.`)
      }
    }
  },
  {
    name: 'feed shows text',
    pattern: /^the feed shows the text (.+)$/,
    run (m, example, world) {
      const expected = resolveText(m[1], example)
      const rendered = getRenderedFeed(world)
      const found = rendered.some((html) => html.replace(/<[^\u003e]+>/g, '').includes(expected))
      if (!found) {
        throw new Error(`Feed does not show the text "${expected}".`)
      }
    }
  },
  {
    name: 'feed does not show embedded video player',
    pattern: /^the feed does not show an embedded video player$/,
    run (m, example, world) {
      const rendered = getRenderedFeed(world)
      const found = rendered.some((html) => html.includes('<iframe'))
      if (found) {
        throw new Error('Feed unexpectedly shows an embedded video player.')
      }
    }
  }
]

// Return the cached rendered feed HTML, computing it on first use.
function getRenderedFeed (world) {
  if (!world.renderedFeed) {
    world.renderedFeed = world.recentFeedPage.posts.map((post) => renderPostText(post.text))
  }
  return world.renderedFeed
}

// Decode a raw create-poll payload into poll_type, option_count, and question.
function decodeCreatePollPayload (raw) {
  const buf = Buffer.from(raw)
  const pollType = buf[0]
  const optionCount = buf[1]
  const question = buf.slice(2).toString('utf8')
  return { pollType, optionCount, question }
}

// Decode a raw add-poll-option or poll-vote payload into poll txid (hex).
function decodePollTxidPayload (raw) {
  const buf = Buffer.from(raw)
  const pollTxid = Buffer.from(buf.slice(0, 32)).reverse().toString('hex')
  return { pollTxid }
}

// Route a single step to its handler. Throws on unsupported step text. Throws on unsupported step text.
async function handleStep (step, example, world) {
  for (const handler of handlers) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

module.exports = { createWorld, handleStep }

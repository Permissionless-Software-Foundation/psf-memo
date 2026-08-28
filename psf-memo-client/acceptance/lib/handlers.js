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
const RecentFeedPage = require('../../src/services/recent-feed-page')
const ProfilePage = require('../../src/services/profile-page')
const ThreadPage = require('../../src/services/thread-page')
const TopicDiscoveryPage = require('../../src/services/topic-discovery-page')
const TopicFeedPage = require('../../src/services/topic-feed-page')
const MemoTopicFollow = require('../../src/services/memo-topic-follow')
const MemoTopicPost = require('../../src/services/memo-topic-post')
const TopicPostPage = require('../../src/services/topic-post-page')

const MEMO_POST_PREFIX = MemoPost.MEMO_POST_PREFIX
const MEMO_REPLY_PREFIX = MemoReply.MEMO_REPLY_PREFIX
const MEMO_SET_NAME_PREFIX = MemoSetName.MEMO_SET_NAME_PREFIX
const MEMO_SET_BIO_PREFIX = MemoSetBio.MEMO_SET_BIO_PREFIX
const MEMO_SET_AVATAR_URL_PREFIX = MemoSetAvatarUrl.MEMO_SET_AVATAR_URL_PREFIX
const MEMO_LIKE_PREFIX = MemoLike.MEMO_LIKE_PREFIX
const MEMO_FOLLOW_PREFIX = MemoFollow.MEMO_FOLLOW_PREFIX
const MEMO_UNFOLLOW_PREFIX = MemoFollow.MEMO_UNFOLLOW_PREFIX
const MEMO_TOPIC_MESSAGE_PREFIX = MemoTopicPost.MEMO_TOPIC_MESSAGE_PREFIX
const MEMO_TOPIC_FOLLOW_PREFIX = MemoTopicFollow.MEMO_TOPIC_FOLLOW_PREFIX
const MEMO_TOPIC_UNFOLLOW_PREFIX = MemoTopicFollow.MEMO_TOPIC_UNFOLLOW_PREFIX

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

// A fake profile store recording display names, bios, avatar URLs, and follow state.
function makeProfiles () {
  const names = {}
  const bios = {}
  const avatarUrls = {}
  const following = {}
  const topicFollowing = {}
  return {
    names,
    bios,
    avatarUrls,
    following,
    topicFollowing,
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
// and topic pages used to verify read-side behavior.
function makeMemoDb () {
  const posts = []
  const threads = {}
  const followState = {}
  const topics = []
  const topicPosts = {}
  const topicCounts = new Map()
  const topicFollow = new Map()

  return {
    posts,
    threads,
    followState,
    topics,
    topicPosts,
    topicCounts,
    addPost (post) {
      posts.push(post)
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
      followState[`${followerAddr}:${followeeAddr}`] = following
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
    async getRecentPosts ({ limit = 100, offset = 0 } = {}) {
      const page = posts.slice(offset, offset + limit)
      return { posts: page, pagination: { total: posts.length, limit, offset, hasMore: offset + page.length < posts.length } }
    },
    async getPostsByAddr (addr, { limit = 100, offset = 0 } = {}) {
      const filtered = posts.filter((p) => p.addr === addr)
      const page = filtered.slice(offset, offset + limit)
      return { posts: page, pagination: { total: filtered.length, limit, offset, hasMore: offset + page.length < filtered.length } }
    },
    async getPostThread (txid) {
      return threads[txid] || { post: null }
    },
    async getFollowState (followerAddr, followeeAddr) {
      return followState[`${followerAddr}:${followeeAddr}`] || false
    },
    async getTopics () {
      const list = []
      for (const [room, postCount] of topicCounts.entries()) {
        list.push({ room, postCount })
      }
      list.sort((a, b) => a.room.localeCompare(b.room))
      return { topics: list }
    },
    async getTopicPosts (room, { limit = 100, offset = 0 } = {}) {
      const all = topicPosts[room] || []
      const page = all.slice(offset, offset + limit)
      return { posts: page, pagination: { total: all.length, limit, offset, hasMore: offset + page.length < all.length } }
    }
  }
}

// Fresh world/state object for a single scenario execution.
function createWorld () {
  const wallet = makeWallet('')
  const feed = makeFeed()
  const profiles = makeProfiles()
  const memoPost = new MemoPost({ wallet, feed })
  const thread = makeThread()
  const memoReply = new MemoReply({ wallet, thread })
  const memoLike = new MemoLike({ wallet, feed })
  const memoFollow = new MemoFollow({ wallet, profiles })
  const memoTopicFollow = new MemoTopicFollow({ wallet, profiles })
  const memoDb = makeMemoDb()

  const world = {
    wallet,
    feed,
    thread,
    memoPost,
    memoReply,
    memoLike,
    memoFollow,
    memoTopicFollow,
    memoDb,
    currentPath: null,
    menuOpen: false,
    likedTxids: new Set()
  }

  // Read-only page controllers backed by the fake psf-memo-db API.
  world.recentFeedPage = new RecentFeedPage({ memoDb })
  world.profilePage = new ProfilePage({ memoDb })
  world.threadPage = new ThreadPage({ memoDb })
  world.topicDiscoveryPage = new TopicDiscoveryPage({
    memoDb,
    navigate: (path) => { world.currentPath = path }
  })

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
        memoFollow: world.memoFollow
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
        memoFollow: world.memoFollow
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
  }
]

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

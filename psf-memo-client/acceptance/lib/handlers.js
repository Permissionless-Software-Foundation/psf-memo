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
const AccountPage = require('../../src/services/account-page')
const MemoLike = require('../../src/services/memo-like')
const LikeTipPage = require('../../src/services/like-tip-page')

const MEMO_POST_PREFIX = MemoPost.MEMO_POST_PREFIX
const MEMO_REPLY_PREFIX = MemoReply.MEMO_REPLY_PREFIX
const MEMO_SET_NAME_PREFIX = MemoSetName.MEMO_SET_NAME_PREFIX
const MEMO_LIKE_PREFIX = MemoLike.MEMO_LIKE_PREFIX

// Default author address used by Gherkin steps that refer to "the author address".
const AUTHOR_ADDRESS = 'bitcoincash:qz7v6ztvzu2f2xd2ww8pnx9vwk0g4ncvfvavktg0jc'

// A fake wallet exposing the minimal-slp-wallet adapter surface the app uses.
function makeWallet (address) {
  const wallet = {
    walletInfo: { cashAddress: address },
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

// A fake profile store recording display names set for addresses.
function makeProfiles () {
  const names = {}
  return {
    names,
    setName: (addr, name) => { names[addr] = name },
    getName: (addr) => names[addr] || null
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

// Fresh world/state object for a single scenario execution.
function createWorld () {
  const wallet = makeWallet('')
  const feed = makeFeed()
  const memoPost = new MemoPost({ wallet, feed })
  const thread = makeThread()
  const memoReply = new MemoReply({ wallet, thread })
  const memoLike = new MemoLike({ wallet, feed })

  const world = {
    wallet,
    feed,
    thread,
    memoPost,
    memoReply,
    memoLike,
    currentPath: null,
    menuOpen: false,
    likedTxids: new Set()
  }

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
  const profiles = makeProfiles()
  const memoSetName = new MemoSetName({ wallet, profiles })
  world.setNamePage = new SetNamePage({
    memoSetName,
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
    run (m, example, world) {
      const txid = m[1].trim()
      world.thread.rootTxid = txid
      world.replyPage.setParent(txid)
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
    name: 'account page shows Set Name button',
    pattern: /^the account page shows a Set Name button$/,
    run (m, example, world) {
      if (!world.accountPage.hasSetNameButton()) {
        throw new Error('Account page does not show a Set Name button.')
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
  }
]

// Route a single step to its handler. Throws on unsupported step text.
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

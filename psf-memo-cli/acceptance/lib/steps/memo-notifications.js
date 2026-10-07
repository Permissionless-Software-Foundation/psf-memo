/*
  Gherkin step handlers for the Memo Notifications feature.

  The scenario world resolves a fake viewer wallet and serves a five-notification
  fixture through the same fake fetch used by the Memo DB client handlers. Each
  scenario runs the real memo-notifications command in JSON mode so the
  reported notifications and pagination can be asserted from the captured stdout.
*/

// Local libraries
import MemoNotifications from '../../../src/commands/memo-notifications.js'
import { runReadCommand, installWalletFactory, assertUsageError, assertReadCommandError } from '../read-command.js'
import { assertReportedTxids } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Five notifications newest-first: a follow, a reply, a like, and two more.
const NOTIFICATIONS = [
  { txid: 'notif-1', type: 'follow', addr: 'followerA', blockHeight: 600005, seen: 5 },
  { txid: 'notif-2', type: 'reply', addr: 'replier', postTxid: 'post-a', text: 'nice', blockHeight: 600004, seen: 4 },
  { txid: 'notif-3', type: 'like', addr: 'liker', postTxid: 'post-b', blockHeight: 600003, seen: 3 },
  { txid: 'notif-4', type: 'follow', addr: 'followerB', blockHeight: 600002, seen: 2 },
  { txid: 'notif-5', type: 'like', addr: 'likerTwo', postTxid: 'post-c', blockHeight: 600001, seen: 1 }
]

async function runNotifications (world, flags) {
  await runReadCommand(
    world,
    MemoNotifications,
    'notifications',
    { ...world.notifSource, ...flags },
    { walletUtil: world.walletUtil }
  )
}

const memoNotificationsHandlers = [
  {
    name: 'a Memo notifications command',
    pattern: /^a Memo notifications command$/,
    run (m, example, world) {
      installWalletFactory(world, 'notif')
    }
  },
  {
    name: 'service serves the notifications feed',
    pattern: /^the Memo DB service serves the notifications feed$/,
    run (m, example, world) {
      world.notifications = NOTIFICATIONS.map((notification) => ({ ...notification }))
    }
  },
  {
    name: 'notifications feed is empty',
    pattern: /^the notifications feed is empty$/,
    run (m, example, world) {
      world.notifications = []
    }
  },
  {
    name: 'notifications request fails',
    pattern: /^the notifications request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'viewer wallet has an address',
    pattern: /^the viewer wallet has the address "(.+)"$/,
    run (m, example, world) {
      world.notifWallets['viewer-wallet'] = {
        walletInfo: { cashAddress: resolveParam(m[1], example) }
      }
      world.notifSource = { name: 'viewer-wallet' }
    }
  },
  {
    name: 'memo-notifications command runs',
    pattern: /^the memo-notifications command runs$/,
    async run (m, example, world) {
      await runNotifications(world, {})
    }
  },
  {
    name: 'memo-notifications command runs with a page',
    pattern: /^the memo-notifications command runs with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runNotifications(world, {
        limit: resolveParam(m[1], example),
        offset: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'command reported the notification txids',
    pattern: /^the command reported the notification txids "(.+)"$/,
    run (m, example, world) {
      assertReportedTxids(world.notificationsJson?.notifications, resolveParam(m[1], example), 'notification txids')
    }
  },
  {
    name: 'command reported a notification type and actor',
    pattern: /^the command reported notification "(.+)" of type "(.+)" from "(.+)"$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const notification = (world.notificationsJson?.notifications || []).find((n) => n.txid === txid)
      if (!notification) {
        throw new Error(`Expected a reported notification with txid ${txid}`)
      }
      assertEqual(notification.type, resolveParam(m[2], example), 'notification type', { quote: true })
      assertEqual(notification.addr, resolveParam(m[3], example), 'notification actor', { quote: true })
    }
  },
  {
    name: 'command reported no notifications',
    pattern: /^the command reported 0 notifications$/,
    run (m, example, world) {
      assertEqual((world.notificationsJson?.notifications || []).length, 0, 'notification count')
    }
  },
  {
    name: 'memo-notifications command reported the usage error',
    pattern: /^the memo-notifications command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'notifications', 'memo-notifications', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-notifications command reported an error',
    pattern: /^the memo-notifications command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'notifications', 'memo-notifications')
    }
  }
]

export { memoNotificationsHandlers }

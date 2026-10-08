/*
  This is the primary entry point for the psf-memo-cli CLI app.
  This app uses commander.js.
*/

// Global npm libraries
import { Command } from 'commander'

// Local libraries
import WalletCreate from './src/commands/wallet-create.js'
import WalletList from './src/commands/wallet-list.js'
import WalletAddrs from './src/commands/wallet-addrs.js'
import WalletBalance from './src/commands/wallet-balance.js'
import SendBch from './src/commands/send-bch.js'
import SendTokens from './src/commands/send-tokens.js'
import WalletSweep from './src/commands/wallet-sweep.js'
import MsgSign from './src/commands/msg-sign.js'
import MsgVerify from './src/commands/msg-verify.js'
import MemoFeed from './src/commands/memo-feed.js'
import MemoThread from './src/commands/memo-thread.js'
import MemoGetPost from './src/commands/memo-get-post.js'
import MemoStatus from './src/commands/memo-status.js'
import MemoIdentity from './src/commands/memo-identity.js'
import MemoPost from './src/commands/memo-post.js'
import MemoReply from './src/commands/memo-reply.js'
import MemoLike from './src/commands/memo-like.js'
import MemoWait from './src/commands/memo-wait.js'
import MemoNotifications from './src/commands/memo-notifications.js'
import MemoProfile from './src/commands/memo-profile.js'
import MemoPosts from './src/commands/memo-posts.js'
import MemoTopics from './src/commands/memo-topics.js'
import MemoTopic from './src/commands/memo-topic.js'
import MemoSearch from './src/commands/memo-search.js'
import MemoProfiles from './src/commands/memo-profiles.js'
import MemoFollowing from './src/commands/memo-following.js'
import MemoFollowers from './src/commands/memo-followers.js'
import MemoMuted from './src/commands/memo-muted.js'
import MemoPoll from './src/commands/memo-poll.js'
import MemoName from './src/commands/memo-name.js'
import MemoBio from './src/commands/memo-bio.js'

// Instantiate the subcommands
const walletCreate = new WalletCreate()
const walletList = new WalletList()
const walletAddrs = new WalletAddrs()
const walletBalance = new WalletBalance()
const sendBch = new SendBch()
const sendTokens = new SendTokens()
const walletSweep = new WalletSweep()
const msgSign = new MsgSign()
const msgVerify = new MsgVerify()
const memoFeed = new MemoFeed()
const memoThread = new MemoThread()
const memoGetPost = new MemoGetPost()
const memoStatus = new MemoStatus()
const memoIdentity = new MemoIdentity()
const memoPost = new MemoPost()
const memoReply = new MemoReply()
const memoLike = new MemoLike()
const memoWait = new MemoWait()
const memoNotifications = new MemoNotifications()
const memoProfile = new MemoProfile()
const memoPosts = new MemoPosts()
const memoTopics = new MemoTopics()
const memoTopic = new MemoTopic()
const memoSearch = new MemoSearch()
const memoProfiles = new MemoProfiles()
const memoFollowing = new MemoFollowing()
const memoFollowers = new MemoFollowers()
const memoMuted = new MemoMuted()
const memoPoll = new MemoPoll()
const memoName = new MemoName()
const memoBio = new MemoBio()

const program = new Command()

program
  // Define the psf-memo-cli app options
  .name('psf-memo-cli')
  .description('A command-line BCH and SLP token wallet.')

// Define the wallet-create command
program.command('wallet-create')
  .description('Create a new wallet with name (-n <name>) and description (-d)')
  .option('-n, --name <string>', 'wallet name')
  .option('-d --description <string>', 'what the wallet is being used for')
  .action(walletCreate.run)

// Define the wallet-list command
program.command('wallet-list')
  .description('List existing wallets')
  .action(walletList.run)

program.command('wallet-addrs')
  .description('List the different addresses for a wallet.')
  .option('-n, --name <string>', 'wallet name')
  .action(walletAddrs.run)

program.command('wallet-balance')
  .description('Get balances in BCH and SLP tokens held by the wallet.')
  .option('-n, --name <string>', 'wallet name')
  .action(walletBalance.run)

program.command('wallet-sweep')
  .description('Sweep funds from a WIF private key')
  .option('-n, --name <string>', 'wallet name receiving BCH')
  .option('-w, --wif <string>', 'WIF private key to sweep')
  .action(walletSweep.run)

program.command('send-bch')
  .description('Send BCH to an address')
  .option('-n, --name <string>', 'wallet name sending BCH')
  .option('-a, --addr <string>', 'address to send BCH to')
  .option('-q, --qty <string>', 'The quantity of BCH to send')
  .action(sendBch.run)

program.command('send-tokens')
  .description('Send SLP tokens to an address')
  .option('-n, --name <string>', 'wallet name sending BCH')
  .option('-a, --addr <string>', 'address to send BCH to')
  .option('-q, --qty <string>', 'The quantity of BCH to send')
  .option('-t, --tokenId <string>', 'The token ID of the token to send')
  .action(sendTokens.run)

program.command('msg-sign')
  .description('Sign a message using the wallets private key')
  .option('-n, --name <string>', 'wallet to sign the message')
  .option('-m, --msg <string>', 'Message to sign')
  .action(msgSign.run)

program.command('msg-verify')
  .description('Verify a signature')
  .option('-s, --sig <string>', 'Signature')
  .option('-m, --msg <string>', 'Cleartext message that was signed')
  .option('-a, --addr <string>', 'BCH address generated from private key that signed the message')
  .action(msgVerify.run)

program.command('memo-feed')
  .description('Read one page of the recent top-level Memo feed')
  .option('-l, --limit <number>', 'maximum posts to return (default 50)')
  .option('-o, --offset <number>', 'posts to skip (default 0)')
  .option('--viewer <string>', 'viewer address for mute filtering')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoFeed.run)

program.command('memo-thread')
  .description('Read a Memo post and its nested reply tree')
  .option('-t, --txid <string>', 'post transaction id')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoThread.run)

program.command('memo-get-post')
  .description('Read a single stored Memo post')
  .option('-t, --txid <string>', 'post transaction id')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoGetPost.run)

program.command('memo-status')
  .description("Report the psf-memo-db indexer's sync state")
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoStatus.run)

program.command('memo-identity')
  .description("Report the wallet's own Memo identity")
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoIdentity.run)

program.command('memo-post')
  .description('Broadcast a 0x6d02 Memo post')
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('-m, --memo <string>', 'memo text to post')
  .option('--json', 'print the result as one JSON object')
  .action(memoPost.run)

program.command('memo-reply')
  .description('Broadcast a 0x6d03 Memo reply')
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('-t, --txid <string>', 'parent post transaction id')
  .option('-m, --memo <string>', 'reply text')
  .option('--json', 'print the result as one JSON object')
  .action(memoReply.run)

program.command('memo-like')
  .description('Broadcast a 0x6d04 Memo like, with an optional tip')
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('-t, --txid <string>', 'liked post transaction id')
  .option('--tip <number>', 'tip amount in satoshis')
  .option('--author <string>', 'tip recipient (post author) address')
  .option('--json', 'print the result as one JSON object')
  .action(memoLike.run)

program.command('memo-wait')
  .description('Wait for a broadcast Memo post to be indexed')
  .option('-t, --txid <string>', 'post transaction id')
  .option('--timeout <number>', 'total wait budget in milliseconds (default 60000)')
  .option('--interval <number>', 'poll interval in milliseconds (default 5000)')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoWait.run)

program.command('memo-notifications')
  .description("Read the wallet address's Memo notifications")
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('-l, --limit <number>', 'maximum notifications to return (default 50)')
  .option('-o, --offset <number>', 'notifications to skip (default 0)')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoNotifications.run)

program.command('memo-profile')
  .description('Read a composed Memo profile for an address')
  .option('-a, --addr <string>', 'profile address')
  .option('--viewer <string>', 'viewer address for the follow state')
  .option('-l, --limit <number>', 'maximum posts to return (default 50)')
  .option('-o, --offset <number>', 'posts to skip (default 0)')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoProfile.run)

program.command('memo-posts')
  .description('Read the top-level posts authored by an address')
  .option('-a, --addr <string>', 'author address')
  .option('-l, --limit <number>', 'maximum posts to return (default 50)')
  .option('-o, --offset <number>', 'posts to skip (default 0)')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoPosts.run)

program.command('memo-topics')
  .description('Read the Memo topic list')
  .option('-l, --limit <number>', 'maximum topics to return (default 50)')
  .option('-o, --offset <number>', 'topics to skip (default 0)')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoTopics.run)

program.command('memo-topic')
  .description("Read a topic's posts")
  .option('-r, --room <string>', 'topic room name')
  .option('--viewer <string>', 'viewer address for mute filtering')
  .option('-l, --limit <number>', 'maximum posts to return (default 50)')
  .option('-o, --offset <number>', 'posts to skip (default 0)')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoTopic.run)

program.command('memo-search')
  .description('Search top-level Memo posts and profiles')
  .option('-q, --query <string>', 'search query')
  .option('--viewer <string>', 'viewer address for mute filtering')
  .option('-l, --limit <number>', 'maximum results to return (default 50)')
  .option('-o, --offset <number>', 'results to skip (default 0)')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoSearch.run)

program.command('memo-profiles')
  .description('Read the recently active Memo profiles')
  .option('-l, --limit <number>', 'maximum profiles to return (default 50)')
  .option('-o, --offset <number>', 'profiles to skip (default 0)')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoProfiles.run)

program.command('memo-following')
  .description('Read the addresses a wallet follows')
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoFollowing.run)

program.command('memo-followers')
  .description('Read the addresses that follow an address')
  .option('-a, --addr <string>', 'followee address')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoFollowers.run)

program.command('memo-muted')
  .description('Read the addresses a wallet has muted')
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoMuted.run)

program.command('memo-poll')
  .description('Read a Memo poll with its options and votes')
  .option('-t, --txid <string>', 'poll transaction id')
  .option('--db-url <string>', 'psf-memo-db endpoint override')
  .option('--json', 'print the result as one JSON object')
  .action(memoPoll.run)

program.command('memo-name')
  .description('Broadcast a 0x6d01 Memo set-name action')
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('-m, --memo <string>', 'name to set')
  .option('--json', 'print the result as one JSON object')
  .action(memoName.run)

program.command('memo-bio')
  .description('Broadcast a 0x6d05 Memo set-profile-text action')
  .option('-n, --name <string>', 'wallet name')
  .option('--wif <string>', 'WIF private key')
  .option('-m, --memo <string>', 'profile text to set')
  .option('--json', 'print the result as one JSON object')
  .action(memoBio.run)

program.parseAsync(process.argv)

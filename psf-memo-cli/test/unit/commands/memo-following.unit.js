/*
  Unit tests for the memo-following read command.

  These drive the real command against an injected MemoDb class and a fake
  wallet resolver so the resolved follower address, the reported following
  list, the missing-source usage error, the failed request, and the endpoint
  override are pinned without a network or a real wallet. The shared read
  contract lives in test/support/follow-command-tests.js.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoFollowing from '../../../src/commands/memo-following.js'
import {
  fakeAddressMemoDb,
  makeCommand,
  defineFollowCommandTests
} from '../../support/follow-command-tests.js'

const RESULT = { followerAddr: 'addrA', following: ['addrB', 'addrC'] }

// A wallet resolver that yields a fixed cash address for any source.
function fakeWalletUtil (address = 'addrA') {
  return {
    async instanceWallet () {
      return { walletInfo: { cashAddress: address } }
    },
    async instanceWalletFromWif () {
      return { walletInfo: { cashAddress: address } }
    }
  }
}

describe('#memo-following command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  defineFollowCommandTests({
    label: 'following',
    CommandClass: MemoFollowing,
    method: 'getFollowing',
    validFlags: { name: 'wallet' },
    resultKey: 'following',
    result: RESULT,
    walletUtil: fakeWalletUtil()
  })

  it('resolves the wallet from a WIF', async () => {
    const fake = fakeAddressMemoDb('getFollowing', { result: RESULT })
    const { command } = makeCommand(MemoFollowing, fake, { walletUtil: fakeWalletUtil() })

    await command.run({ json: true, wif: 'wif-key' })

    assert.equal(fake.calls.addr, 'addrA')
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    const fake = fakeAddressMemoDb('getFollowing', { result: RESULT })
    const { command, err } = makeCommand(MemoFollowing, fake, { walletUtil: fakeWalletUtil() })

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
    })
    assert.equal(fake.calls.addr, null)
  })

  it('resolves the wallet flags without reading', () => {
    const command = new MemoFollowing({
      MemoDbClass: fakeAddressMemoDb('getFollowing').FakeMemoDb,
      walletUtil: fakeWalletUtil()
    })

    assert.deepEqual(command.validateFlags({ name: 'wallet' }), { name: 'wallet', wif: null })
  })

  it('defaults to the real wallet utility when none is injected', () => {
    const command = new MemoFollowing({ MemoDbClass: fakeAddressMemoDb('getFollowing').FakeMemoDb })

    assert.isFunction(command.walletUtil.instanceWallet)
  })
})

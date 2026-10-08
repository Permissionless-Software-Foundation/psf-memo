/*
  Unit tests for the memo-followers read command.

  These drive the real command against an injected MemoDb class so the requested
  followee address, the reported followers list, the missing-address usage
  error, the failed request, and the endpoint override are pinned without a
  network. The shared read contract lives in test/support/follow-command-tests.js.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoFollowers from '../../../src/commands/memo-followers.js'
import {
  fakeAddressMemoDb,
  makeCommand,
  defineFollowCommandTests
} from '../../support/follow-command-tests.js'

const RESULT = { followeeAddr: 'addrA', followers: ['addrD', 'addrE'] }

describe('#memo-followers command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  defineFollowCommandTests({
    label: 'followers',
    CommandClass: MemoFollowers,
    method: 'getFollowers',
    validFlags: { addr: 'addrA' },
    resultKey: 'followers',
    result: RESULT
  })

  it('reports a missing address as the documented usage error (exit 2)', async () => {
    const fake = fakeAddressMemoDb('getFollowers', { result: RESULT })
    const { command, err } = makeCommand(MemoFollowers, fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a followee address with the -a flag.'
    })
    assert.equal(fake.calls.addr, null)
  })

  it('resolves the address flag without reading', () => {
    const command = new MemoFollowers({ MemoDbClass: fakeAddressMemoDb('getFollowers').FakeMemoDb })

    assert.deepEqual(command.validateFlags({ addr: 'addrA' }), { address: 'addrA' })
  })
})

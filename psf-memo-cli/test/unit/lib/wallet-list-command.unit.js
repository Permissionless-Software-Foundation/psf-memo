/*
  Unit tests for the shared wallet-scoped address-list command factory.

  `defineWalletListCommand` resolves the signing wallet, reads an unpaginated
  address list, and reports it. These pin the missing-list-field fallback: a
  service result without the declared list field reports an empty list and the
  empty-list summary, rather than throwing or leaking an undefined list.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { defineWalletListCommand } from '../../../src/lib/wallet-list-command.js'
import { captureStream } from '../../support/capture.js'

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

// A command whose service returns a result missing the declared list field.
const CommandMissingList = defineWalletListCommand({
  readMethod: 'readList',
  clientMethod: 'getList',
  listField: 'items',
  label: 'item'
})

class FakeMemoDb {
  async getList () {
    return {}
  }
}

describe('#wallet-list-command factory', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reports an empty list when the service omits the list field', async () => {
    const out = captureStream()
    const err = captureStream()
    const command = new CommandMissingList({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: fakeWalletUtil(),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, name: 'wallet' })

    assert.equal(code, 0)
    assert.deepEqual(JSON.parse(out.text()), {
      message: 'Read 0 item addresses',
      items: []
    })
    assert.equal(err.text(), '')
  })
})

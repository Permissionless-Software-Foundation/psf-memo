/*
  Unit tests for the wallet-list command.

  The command adopts the shared output contract: human mode prints the table,
  --json prints `{ wallets: [{ name, description }] }`, and a failure exits 1.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
import { promises as fs } from 'fs'

// Local libraries
import WalletCreate from '../../../src/commands/wallet-create.js'
import WalletList from '../../../src/commands/wallet-list.js'
import { captureStream } from '../../support/capture.js'

const __dirname = import.meta.dirname
const filename = `${__dirname.toString()}/../../../.wallets/test123.json`

// Build a wallet-list command with the supplied capture streams and an
// injectable wallet store.
function makeCommand ({ wallets, stdout, stderr } = {}) {
  const command = new WalletList({ stdout: stdout?.stream, stderr: stderr?.stream })
  if (wallets !== undefined) command.parseWallets = async () => wallets
  return command
}

describe('#wallet-list', () => {
  let sandbox
  let uut

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    uut = new WalletList()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#parseWallets', () => {
    it('should correctly parse wallet data', async () => {
      // Create a mainnet wallet.
      const createWallet = new WalletCreate()
      await createWallet.createWallet(filename)

      const data = await uut.parseWallets()

      // Find the wallet that was just created.
      const testWallet = data.find(wallet => wallet[0].indexOf('test123') > -1)

      assert.equal(testWallet[0], 'test123')

      // Clean up
      await fs.rm(filename)
    })

    it('should return an empty array when no wallets are found', async () => {
      // Force shelljs.ls to return an empty array.
      sandbox.stub(uut.shelljs, 'ls').returns([])

      const data = await uut.parseWallets()

      assert.deepEqual(data, [])
    })

    it('parses every wallet file the store returns, in order', async () => {
      // Pin a controlled store so the parse loop is not dependent on which
      // wallet files happen to be in .wallets/ on the test machine.
      sandbox.stub(uut.shelljs, 'ls').returns([
        '/root/.wallets/alpha.json',
        '/root/.wallets/beta.json'
      ])
      sandbox.stub(uut, 'readFile').callsFake(async (file) =>
        JSON.stringify({ wallet: { description: file.includes('alpha') ? 'desc-A' : 'desc-B' } })
      )

      const data = await uut.parseWallets()

      assert.deepEqual(data, [
        ['alpha', 'desc-A'],
        ['beta', 'desc-B']
      ])
    })
  })

  describe('#run', () => {
    it('prints one JSON object listing the wallets', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = makeCommand({
        wallets: [['savings', 'long term'], ['spending', 'daily']],
        stdout: out,
        stderr: err
      })

      const code = await command.run({ json: true })

      assert.equal(code, 0)
      assert.equal(err.text(), '')
      assert.deepEqual(JSON.parse(out.text()).wallets, [
        { name: 'savings', description: 'long term' },
        { name: 'spending', description: 'daily' }
      ])
    })

    it('prints the wallets table in human mode', async () => {
      const out = captureStream()
      const command = makeCommand({ wallets: [['savings', 'long term']], stdout: out })

      const code = await command.run()

      assert.equal(code, 0)
      assert.include(out.text(), 'savings')
      assert.include(out.text(), 'long term')
    })

    it('prints a no-wallets message in human mode when the store is empty', async () => {
      const out = captureStream()
      const command = makeCommand({ wallets: [], stdout: out })

      const code = await command.run()

      assert.equal(code, 0)
      assert.equal(out.text(), 'No wallets found.\n')
    })

    it('does not print a wallet mnemonic when listing wallets', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = makeCommand({
        wallets: [['savings', 'long term']],
        stdout: out,
        stderr: err
      })

      await command.run({ json: true })

      assert.notInclude(out.text(), 'mnemonic')
    })

    it('reports a failed wallet listing as a runtime error (exit 1)', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = makeCommand({ stdout: out, stderr: err })
      command.parseWallets = async () => { throw new Error('cannot read wallets') }

      const code = await command.run({ json: true })

      assert.equal(code, 1)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), { error: 'cannot read wallets' })
    })
  })

  describe('#displayTable', () => {
    it('should display the data in a console table', () => {
      const walletData = [
        ['msg1', 'Used for sending and receiving messages'],
        ['msg2', 'Used for sending and receiving message']
      ]

      const tableStr = uut.displayTable(walletData)

      assert.isString(tableStr)
      assert.include(tableStr, 'msg1')
      assert.include(tableStr, 'msg2')
    })
  })
})

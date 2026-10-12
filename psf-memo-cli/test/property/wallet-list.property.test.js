/*
  Property tests for the wallet-list store parse.

  The unit tests pin fixed store shapes. These properties exercise broad
  synthetic stores to confirm the listing invariants:

    - only `.json` files are listed, with the extension stripped, in stable
      sorted order, each carrying the description read from its file.
    - non-wallet files are never read.
    - a missing store directory (ENOENT) lists no wallets, while any other read
      failure propagates.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { seededRandom, randomText } from './harness.js'
import WalletList from '../../src/commands/wallet-list.js'

const rng = seededRandom(20261012)
const NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_'
const DESC_CHARS = 'abcXYZ019 é中'

test('parseWallets lists only sorted wallet files with their descriptions', async () => {
  for (let i = 0; i < 200; i++) {
    const count = Math.floor(rng() * 12)
    const names = new Set()
    while (names.size < count) {
      const base = randomText(rng, NAME_CHARS, 8)
      names.add(`${base}${rng() < 0.6 ? '.json' : '.txt'}`)
    }
    const listing = [...names]

    const descriptions = new Map()
    for (const name of listing) {
      if (name.endsWith('.json')) descriptions.set(name, randomText(rng, DESC_CHARS, 12))
    }

    const reads = []
    const command = new WalletList({
      readdir: async () => listing,
      readFile: async (filePath) => {
        const name = path.basename(filePath)
        reads.push(name)
        if (!name.endsWith('.json')) throw new Error(`unexpected read of ${name}`)
        return JSON.stringify({ wallet: { description: descriptions.get(name) } })
      }
    })

    const result = await command.parseWallets()
    const expected = listing
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => [name.slice(0, -'.json'.length), descriptions.get(name)])

    assert.deepEqual(result, expected)
    assert.deepEqual(reads.slice().sort(), expected.map(([name]) => `${name}.json`).sort())
  }
})

test('parseWallets treats a missing store as empty and propagates other failures', async () => {
  for (let i = 0; i < 100; i++) {
    const missing = new WalletList({
      readdir: async () => {
        throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
      }
    })
    assert.deepEqual(await missing.parseWallets(), [])
  }

  for (let i = 0; i < 100; i++) {
    const code = rng() < 0.5 ? 'EACCES' : `EFAIL${i}`
    const failing = new WalletList({
      readdir: async () => {
        throw Object.assign(new Error('store read failed'), { code })
      }
    })
    await assert.rejects(() => failing.parseWallets(), /store read failed/)
  }
})

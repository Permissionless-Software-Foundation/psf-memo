/*
  Property tests for the shared command dependency wiring.

  Unit tests pin the fixed wiring through the commands. These properties
  confirm for broad inputs that initCommand assigns the reporter streams and
  injected collaborators, keeps the command identity, and binds every named
  method; and that initWalletCommand always supplies a resolver, honoring an
  injected one.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { initCommand, initWalletCommand } from '../../src/lib/init-command.js'
import WalletUtil from '../../src/lib/wallet-util.js'

const rng = seededRandom(20261016)

test('initCommand assigns the streams and deps and binds the named methods', () => {
  for (let i = 0; i < 300; i++) {
    const deps = { alpha: `a${i}`, beta: Math.floor(rng() * 1e6) }
    const stdout = { write () {} }
    const stderr = { write () {} }
    const command = {
      run () { return this },
      validateFlags () { return this },
      extra () { return this }
    }

    const result = initCommand(command, { stdout, stderr }, ['extra'], deps)

    assert.equal(result, command)
    assert.equal(command.stdout, stdout)
    assert.equal(command.stderr, stderr)
    assert.equal(command.alpha, deps.alpha)
    assert.equal(command.beta, deps.beta)

    for (const name of ['run', 'validateFlags', 'extra']) {
      const detached = command[name]
      assert.equal(detached(), command)
    }
  }
})

test('initWalletCommand defaults the wallet resolver and honors an injected one', () => {
  for (let i = 0; i < 300; i++) {
    const injected = rng() < 0.5 ? { instanceWallet: async () => {} } : undefined
    const command = { run () {}, validateFlags () {} }

    initWalletCommand(command, { walletUtil: injected, stdout: {}, stderr: {} }, [], { extra: i })

    assert.ok(command.walletUtil)
    if (injected) {
      assert.equal(command.walletUtil, injected)
    } else {
      assert.ok(command.walletUtil instanceof WalletUtil)
    }
    assert.equal(command.extra, i)
  }
})

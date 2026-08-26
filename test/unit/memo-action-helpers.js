'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { fakeWallet } = require('../helpers/fake-wallet')

// Register the MemoAction tests shared by the Memo post and Set Name slices.
// Both slices broadcast a value through a wallet and reflect the result on an
// injected store, so the maximum-length and over-length behaviors are
// identical; only the slice-specific pieces differ. `cfg` supplies:
//   Action     - the action class (MemoPost or MemoSetName)
//   method     - the broadcast method name ('post' or 'setName')
//   MAX        - the length limit
//   lengthCode - the length error code
//   validationCode - the validation error code
//   label      - a short label for test names
//   storeKey   - the action's store dependency key ('feed' or 'profiles')
//   storeFactory - () => a fresh store
//   assertStoreEmpty - (store, wallet) => asserts the store was not updated
//   assertBroadcastMsg - (broadcast, value) => asserts the broadcast message
//   byteBased  - true when the slice counts bytes (registers multi-byte tests)
//   extraArgs  - extra arguments passed to the broadcast method after the value
function registerMemoActionTests (cfg) {
  const { Action, method, MAX, lengthCode, validationCode, label, storeKey, storeFactory, assertStoreEmpty, assertBroadcastMsg, byteBased = false, extraArgs = [] } = cfg
  const checkBroadcastMsg = assertBroadcastMsg || ((broadcast, value) => assert.equal(broadcast.msg, value))

  test(`${label} at the maximum length (${MAX}) is accepted`, async () => {
    const wallet = fakeWallet()
    const action = new Action({ wallet })

    const value = 'x'.repeat(MAX)
    const txid = await action[method](value, ...extraArgs)
    assert.equal(txid, 'fake-txid')
    checkBroadcastMsg(wallet.broadcasts[0], value)
  })

  test(`${label} over the limit (${MAX + 1}) throws a length error and broadcasts nothing`, async () => {
    const wallet = fakeWallet()
    const store = storeFactory()
    const action = new Action({ wallet, [storeKey]: store })

    await assert.rejects(
      action[method]('y'.repeat(MAX + 1), ...extraArgs),
      (err) => err.code === lengthCode
    )
    assert.equal(wallet.broadcasts.length, 0)
    assertStoreEmpty(store, wallet)
  })

  test(`${label} that is whitespace-only or non-string throws a validation error and broadcasts nothing`, async () => {
    for (const invalid of ['   ', 42]) {
      const wallet = fakeWallet()
      const action = new Action({ wallet })

      await assert.rejects(
        action[method](invalid, ...extraArgs),
        (err) => err.code === validationCode
      )
      assert.equal(wallet.broadcasts.length, 0)
    }
  })

  test(`${label} that is empty throws a validation error and broadcasts nothing`, async () => {
    const wallet = fakeWallet()
    const store = storeFactory()
    const action = new Action({ wallet, [storeKey]: store })

    await assert.rejects(
      action[method]('', ...extraArgs),
      (err) => err.code === validationCode
    )
    assert.equal(wallet.broadcasts.length, 0)
    assertStoreEmpty(store, wallet)
  })

  if (byteBased) {
    test(`${label} with multi-byte characters at the byte limit is accepted`, async () => {
      const wallet = fakeWallet()
      const action = new Action({ wallet })

      // 'é' encodes to 2 UTF-8 bytes, so floor(MAX/2) characters reach the limit.
      const count = Math.floor(MAX / 2)
      const value = 'é'.repeat(count)
      assert.equal(Buffer.byteLength(value, 'utf8'), count * 2)
      const txid = await action[method](value, ...extraArgs)
      assert.equal(txid, 'fake-txid')
    })

    test(`${label} with multi-byte characters that exceed the byte limit throws a length error`, async () => {
      const wallet = fakeWallet()
      const action = new Action({ wallet })

      const count = Math.floor(MAX / 2) + 1
      const value = 'é'.repeat(count)
      assert.ok(Buffer.byteLength(value, 'utf8') > MAX)

      await assert.rejects(
        action[method](value, ...extraArgs),
        (err) => err.code === lengthCode
      )
      assert.equal(wallet.broadcasts.length, 0)
    })
  }
}

module.exports = { registerMemoActionTests }

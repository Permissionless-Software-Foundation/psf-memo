'use strict'

// A fake wallet that records every broadcast attempt and can be made to fail.
// It satisfies the small adapter surface the Memo action modules need:
// walletInfo, getUtxos(), sendOpReturn(). Set `wallet.failWith` to make
// sendOpReturn throw.
function fakeWallet ({
  cashAddress = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d',
  utxos = [{ txid: 'utxo1', value: 100000 }],
  txid = 'fake-txid'
} = {}) {
  const broadcasts = []
  const sends = []
  const wallet = {
    walletInfo: { cashAddress },
    utxos,
    getUtxos: async () => utxos,
    sendOpReturn: async function (msg, prefix, bchOutput = []) {
      broadcasts.push({ msg, prefix, bchOutput })
      if (this.failWith) throw new Error(this.failWith)
      return txid
    },
    send: async function (receivers) {
      sends.push(receivers)
      if (this.failWith) throw new Error(this.failWith)
      return txid
    }
  }
  wallet.broadcasts = broadcasts
  wallet.sends = sends
  return wallet
}

module.exports = { fakeWallet }

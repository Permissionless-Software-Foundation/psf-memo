/*
  Send BCH from a resolved wallet to a payment address.

  A small adapter boundary around minimal-slp-wallet so the file-host command
  can be tested without a real wallet. minimal-slp-wallet's send() always adds
  a 2,000-sat PSF donation output, so the payer is debited amountSats plus that
  donation plus the miner fee.
*/

export async function sendPayment ({ wallet, toAddress, amountSats } = {}) {
  await wallet.initialize()
  const txid = await wallet.send([{ address: toAddress, amountSat: amountSats }])

  if (typeof txid !== 'string' || !txid) {
    throw new Error(`Unexpected transaction id from wallet backend: ${txid}`)
  }

  return txid
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:22:13.355Z","module_hash":"654a859ad5d9fa280779f73af9c2baa7277a5b998fe972bc90c70018db284c1d","functions":[{"id":"func/sendPayment","name":"sendPayment","line":10,"end_line":19,"hash":"68f74b60ce504860300284cbe12c077c3851f8d474ba396f4d0bceddd2fc08e8"}]}
// mutate4javascript-manifest-end

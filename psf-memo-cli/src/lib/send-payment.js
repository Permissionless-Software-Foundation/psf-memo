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

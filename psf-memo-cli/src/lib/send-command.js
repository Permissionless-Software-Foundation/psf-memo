/*
  Shared scaffolding for commands that broadcast a transaction and then print a
  block-explorer link.

  Each command supplies its own flag validation, wallet initialization, send
  implementation, and explorer URL. The success and error output is identical to
  the code this replaced, including the error label used by each command.
*/

// Validate, initialize the wallet, run the send implementation, and report the
// resulting TXID. Returns true on success, or 0 when any step throws.
export async function runSendCommand ({ command, flags, send, explorerUrl, errorLabel }) {
  try {
    command.validateFlags(flags)

    // Initialize the wallet.
    command.bchWallet = await command.walletUtil.instanceWallet(flags.name)

    const txid = await send(flags)

    console.log(`TXID: ${txid}`)
    console.log('\nView this transaction on a block explorer:')
    console.log(`${explorerUrl}${txid}`)

    return true
  } catch (err) {
    console.error(`Error in ${errorLabel}: `, err)
    return 0
  }
}

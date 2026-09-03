/*
  Wallet address selection for the profile page.

  The React app stores the authenticated wallet address in two places:
  `appData.bchWalletState.cashAddress` (reactive state updated as the wallet
  initializes) and `appData.wallet.walletInfo.cashAddress` (the wallet object
  itself). Prefer the reactive state so the profile page re-loads when the
  address becomes available.
*/

'use strict'

function getViewerAddress (appData) {
  return appData?.bchWalletState?.cashAddress ||
    appData?.wallet?.walletInfo?.cashAddress ||
    null
}

module.exports = { getViewerAddress }

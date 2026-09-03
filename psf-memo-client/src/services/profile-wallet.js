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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-03T23:17:03.194Z","module_hash":"4ae57c493ddf87d2eed0fc3d1241829fb5a563a0dacdced4523170d7eb069640","functions":[{"id":"func/getViewerAddress","name":"getViewerAddress","line":13,"end_line":17,"hash":"5e0666eb50f9c9ad8ebd829551410179ba91b82c7f5fb862fa6e0c0613e6de47"}]}
// mutate4javascript-manifest-end

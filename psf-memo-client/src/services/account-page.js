/*
  Account Page behavior: show the authenticated user's display name and offer
  a way to navigate to the Set Name page.

  This is the testable controller behind the React "Account" page. It reads
  the current name from an injected profile store and exposes a Set Name
  button that navigates to the set-name path.

  The wallet, profile store, and navigate concerns are injected so this module
  stays free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const SET_NAME_PATH = '/memo/set-name'
const ACCOUNT_PATH = '/account'

class AccountPage {
  constructor (deps = {}) {
    this.wallet = deps.wallet || null
    this.profiles = deps.profiles || null
    this.navigate = deps.navigate || (() => {})
  }

  // The address of the authenticated wallet, or null when no wallet is present.
  getAddress () {
    return this.wallet?.walletInfo?.cashAddress || null
  }

  // The current display name for the authenticated address. Falls back to null
  // when no wallet, profile store, or stored name exists.
  getName () {
    const address = this.getAddress()
    if (!address || !this.profiles || typeof this.profiles.getName !== 'function') {
      return null
    }
    return this.profiles.getName(address)
  }

  // Whether the account page exposes a Set Name button.
  hasSetNameButton () {
    return true
  }

  // Click the Set Name button: navigate to the set-name page.
  clickSetName () {
    this.navigate(SET_NAME_PATH)
  }
}

AccountPage.SET_NAME_PATH = SET_NAME_PATH
AccountPage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = AccountPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:58.560Z","module_hash":"956a690653185cdbda205b7ee5124f905241d47660357f40e32ee2a9f2340ea9","functions":[{"id":"func/AccountPage.constructor","name":"AccountPage.constructor","line":18,"end_line":22,"hash":"89f261283d2ceab1023088c80e89e48e21d1b62dbc2241a6e9fb00b5653d0607"},{"id":"func/AccountPage.getAddress","name":"AccountPage.getAddress","line":25,"end_line":27,"hash":"dd06e8414856559223a8fd5bd68193d8e04ea6264e3ac7c08e80c8dea69e2a36"},{"id":"func/AccountPage.getName","name":"AccountPage.getName","line":31,"end_line":37,"hash":"63f3f003cea554075f50c92062da81de964fc5cedefbf871843d9dd871aaed17"},{"id":"func/AccountPage.hasSetNameButton","name":"AccountPage.hasSetNameButton","line":40,"end_line":42,"hash":"49dc20060d4c55606057a926132f0cc5c8154548a445b299927ef68b9da86ca3"},{"id":"func/AccountPage.clickSetName","name":"AccountPage.clickSetName","line":45,"end_line":47,"hash":"82ff3b1da4068cbb8b78d55a9dfbd366c78927b67c7d4aa96c4cda12e3144f38"}]}
// mutate4javascript-manifest-end

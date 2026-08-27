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
const SET_BIO_PATH = '/memo/set-bio'
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

  // Read a profile field for the authenticated address. Falls back to null
  // when no wallet, profile store, or stored field exists.
  _getProfileField (method) {
    const address = this.getAddress()
    if (!address || !this.profiles || typeof this.profiles[method] !== 'function') {
      return null
    }
    return this.profiles[method](address)
  }

  // The current display name for the authenticated address.
  getName () {
    return this._getProfileField('getName')
  }

  // The current bio for the authenticated address.
  getBio () {
    return this._getProfileField('getBio')
  }

  // Whether the account page exposes a Set Name button.
  hasSetNameButton () {
    return true
  }

  // Whether the account page exposes a Set Bio button.
  hasSetBioButton () {
    return true
  }

  // Click the Set Name button: navigate to the set-name page.
  clickSetName () {
    this.navigate(SET_NAME_PATH)
  }

  // Click the Set Bio button: navigate to the set-bio page.
  clickSetBio () {
    this.navigate(SET_BIO_PATH)
  }
}

AccountPage.SET_NAME_PATH = SET_NAME_PATH
AccountPage.SET_BIO_PATH = SET_BIO_PATH
AccountPage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = AccountPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T15:05:46.167Z","module_hash":"5368f9a79434a29fa2879eb387a41426fbb869348e9bcb620878622f4fd3178f","functions":[{"id":"func/AccountPage.constructor","name":"AccountPage.constructor","line":19,"end_line":23,"hash":"89f261283d2ceab1023088c80e89e48e21d1b62dbc2241a6e9fb00b5653d0607"},{"id":"func/AccountPage.getAddress","name":"AccountPage.getAddress","line":26,"end_line":28,"hash":"dd06e8414856559223a8fd5bd68193d8e04ea6264e3ac7c08e80c8dea69e2a36"},{"id":"func/AccountPage._getProfileField","name":"AccountPage._getProfileField","line":32,"end_line":38,"hash":"f9cfeda61b974259daa7204c803aa186efa79f97cb56f5af4d2b502567da7674"},{"id":"func/AccountPage.getName","name":"AccountPage.getName","line":41,"end_line":43,"hash":"fd06a52ab7c03ab8e78702d3b05851294957ae30842f5649d3dbe7014d1d423f"},{"id":"func/AccountPage.getBio","name":"AccountPage.getBio","line":46,"end_line":48,"hash":"0e52e9086ca7c1a78dfb1025977356c453bfb4ad036a418afd92ccf700b6c394"},{"id":"func/AccountPage.hasSetNameButton","name":"AccountPage.hasSetNameButton","line":51,"end_line":53,"hash":"49dc20060d4c55606057a926132f0cc5c8154548a445b299927ef68b9da86ca3"},{"id":"func/AccountPage.hasSetBioButton","name":"AccountPage.hasSetBioButton","line":56,"end_line":58,"hash":"9bfca400cd4dc62fb73911c270e5628746eaf1efbb50aa51e3bc98df4a1b05ec"},{"id":"func/AccountPage.clickSetName","name":"AccountPage.clickSetName","line":61,"end_line":63,"hash":"82ff3b1da4068cbb8b78d55a9dfbd366c78927b67c7d4aa96c4cda12e3144f38"},{"id":"func/AccountPage.clickSetBio","name":"AccountPage.clickSetBio","line":66,"end_line":68,"hash":"97464fb4db204c66fd95beacc8d1e892ae92e30ae0da1dea9dd0f0efc85077d9"}]}
// mutate4javascript-manifest-end

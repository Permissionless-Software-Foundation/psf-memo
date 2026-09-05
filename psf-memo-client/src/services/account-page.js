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
const SET_AVATAR_URL_PATH = '/memo/set-avatar-url'
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

  // The current avatar URL for the authenticated address.
  getAvatarUrl () {
    return this._getProfileField('getAvatarUrl')
  }

  // The avatar URL to display, preferring the injected profile store and
  // falling back to an optional externally loaded URL (e.g. from memo-db).
  getDisplayAvatarUrl (fallbackUrl = null) {
    return this.getAvatarUrl() || fallbackUrl || null
  }

  // Whether the account page should display an avatar image.
  hasAvatarImage (fallbackUrl = null) {
    return this.getDisplayAvatarUrl(fallbackUrl) !== null
  }

  // The URL for the account page avatar image, or null when none is set.
  getAvatarImageUrl (fallbackUrl = null) {
    return this.getDisplayAvatarUrl(fallbackUrl)
  }

  // Whether the account page exposes a Set Name button.
  hasSetNameButton () {
    return true
  }

  // Whether the account page exposes a Set Bio button.
  hasSetBioButton () {
    return true
  }

  // Whether the account page exposes a Set Avatar URL button.
  hasSetAvatarUrlButton () {
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

  // Click the Set Avatar URL button: navigate to the set-avatar-url page.
  clickSetAvatarUrl () {
    this.navigate(SET_AVATAR_URL_PATH)
  }
}

AccountPage.SET_NAME_PATH = SET_NAME_PATH
AccountPage.SET_BIO_PATH = SET_BIO_PATH
AccountPage.SET_AVATAR_URL_PATH = SET_AVATAR_URL_PATH
AccountPage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = AccountPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-05T20:13:30.792Z","module_hash":"e35d2e97af43f437efeb08523df3b6f0d636b940fe9c484eb0b41becd026a331","functions":[{"id":"func/AccountPage.constructor","name":"AccountPage.constructor","line":20,"end_line":24,"hash":"89f261283d2ceab1023088c80e89e48e21d1b62dbc2241a6e9fb00b5653d0607"},{"id":"func/AccountPage.getAddress","name":"AccountPage.getAddress","line":27,"end_line":29,"hash":"dd06e8414856559223a8fd5bd68193d8e04ea6264e3ac7c08e80c8dea69e2a36"},{"id":"func/AccountPage._getProfileField","name":"AccountPage._getProfileField","line":33,"end_line":39,"hash":"f9cfeda61b974259daa7204c803aa186efa79f97cb56f5af4d2b502567da7674"},{"id":"func/AccountPage.getName","name":"AccountPage.getName","line":42,"end_line":44,"hash":"fd06a52ab7c03ab8e78702d3b05851294957ae30842f5649d3dbe7014d1d423f"},{"id":"func/AccountPage.getBio","name":"AccountPage.getBio","line":47,"end_line":49,"hash":"0e52e9086ca7c1a78dfb1025977356c453bfb4ad036a418afd92ccf700b6c394"},{"id":"func/AccountPage.getAvatarUrl","name":"AccountPage.getAvatarUrl","line":52,"end_line":54,"hash":"aac8da7f8bbb222a9c48e48af6e667f57b1e15f9b01ee6d9781d6739af53a168"},{"id":"func/AccountPage.getDisplayAvatarUrl","name":"AccountPage.getDisplayAvatarUrl","line":58,"end_line":60,"hash":"19f807d397818eddc8323f1698a4f859a6aaa2dc00531e834a9db0949316b1a1"},{"id":"func/AccountPage.hasAvatarImage","name":"AccountPage.hasAvatarImage","line":63,"end_line":65,"hash":"d0a80731894de29b831f26935390810fde8b4dc0d2796b092692745f4ee53774"},{"id":"func/AccountPage.getAvatarImageUrl","name":"AccountPage.getAvatarImageUrl","line":68,"end_line":70,"hash":"fa449dd4836aee10077b357a25e0fa628580e9c5d925337906c0493a3fdb9e44"},{"id":"func/AccountPage.hasSetNameButton","name":"AccountPage.hasSetNameButton","line":73,"end_line":75,"hash":"49dc20060d4c55606057a926132f0cc5c8154548a445b299927ef68b9da86ca3"},{"id":"func/AccountPage.hasSetBioButton","name":"AccountPage.hasSetBioButton","line":78,"end_line":80,"hash":"9bfca400cd4dc62fb73911c270e5628746eaf1efbb50aa51e3bc98df4a1b05ec"},{"id":"func/AccountPage.hasSetAvatarUrlButton","name":"AccountPage.hasSetAvatarUrlButton","line":83,"end_line":85,"hash":"bcbba0b321844c4a3e70ee12708a59b08429ddac6e15d8be6261c44d8495cb8c"},{"id":"func/AccountPage.clickSetName","name":"AccountPage.clickSetName","line":88,"end_line":90,"hash":"82ff3b1da4068cbb8b78d55a9dfbd366c78927b67c7d4aa96c4cda12e3144f38"},{"id":"func/AccountPage.clickSetBio","name":"AccountPage.clickSetBio","line":93,"end_line":95,"hash":"97464fb4db204c66fd95beacc8d1e892ae92e30ae0da1dea9dd0f0efc85077d9"},{"id":"func/AccountPage.clickSetAvatarUrl","name":"AccountPage.clickSetAvatarUrl","line":98,"end_line":100,"hash":"eed3c7b975daad8eb4048b35161539f1efeb9731b710d1c90f8c30e52b40e6fe"}]}
// mutate4javascript-manifest-end

/*
  Unit tests for the account page behavior.

  The account page exposes the authenticated wallet's display name and bio,
  along with buttons that navigate to the set-name and set-bio pages.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const AccountPage = require('../../src/services/account-page')

function makeProfiles () {
  const names = {}
  const bios = {}
  const avatarUrls = {}
  return {
    setName: (addr, name) => { names[addr] = name },
    getName: (addr) => names[addr] || null,
    setBio: (addr, bio) => { bios[addr] = bio },
    getBio: (addr) => bios[addr] || null,
    setAvatarUrl: (addr, url) => { avatarUrls[addr] = url },
    getAvatarUrl: (addr) => avatarUrls[addr] || null
  }
}

function makeWallet (address = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  return { walletInfo: { cashAddress: address } }
}

// A page with an authenticated wallet and an in-memory profile store, plus the
// store and wallet so a test can seed a profile field.
function makePage (address) {
  const profiles = makeProfiles()
  const wallet = makeWallet(address)
  const page = new AccountPage({ wallet, profiles })
  return { profiles, wallet, page }
}

// A page whose only dependency is a recorder of navigation targets.
function makeNavigatingPage () {
  const navigated = []
  const page = new AccountPage({ navigate: (path) => navigated.push(path) })
  return { navigated, page }
}

// A page whose profile store has one field set for the authenticated address.
function makePageWithField (setter, value, address) {
  const { profiles, wallet, page } = makePage(address)
  profiles[setter](wallet.walletInfo.cashAddress, value)
  return { profiles, wallet, page }
}

test('getName returns the stored display name', () => {
  const { page } = makePageWithField('setName', 'trout')

  assert.equal(page.getName(), 'trout')
})

test('getName returns null without a wallet', () => {
  const profiles = makeProfiles()
  const page = new AccountPage({ profiles })

  assert.equal(page.getName(), null)
})

test('getName returns null without a profile store', () => {
  const wallet = makeWallet()
  const page = new AccountPage({ wallet })

  assert.equal(page.getName(), null)
})

test('getBio returns the stored bio', () => {
  const { page } = makePageWithField('setBio', 'Building on BCH')

  assert.equal(page.getBio(), 'Building on BCH')
})

test('getBio returns null without a wallet', () => {
  const profiles = makeProfiles()
  const page = new AccountPage({ profiles })

  assert.equal(page.getBio(), null)
})

test('getBio returns null without a profile store', () => {
  const wallet = makeWallet()
  const page = new AccountPage({ wallet })

  assert.equal(page.getBio(), null)
})

test('hasSetNameButton is true', () => {
  const page = new AccountPage({})

  assert.equal(page.hasSetNameButton(), true)
})

test('hasSetBioButton is true', () => {
  const page = new AccountPage({})

  assert.equal(page.hasSetBioButton(), true)
})

test('clickSetName navigates to the set-name page', () => {
  const { navigated, page } = makeNavigatingPage()

  page.clickSetName()

  assert.deepEqual(navigated, [AccountPage.SET_NAME_PATH])
})

test('clickSetBio navigates to the set-bio page', () => {
  const { navigated, page } = makeNavigatingPage()

  page.clickSetBio()

  assert.deepEqual(navigated, [AccountPage.SET_BIO_PATH])
})

test('getAvatarUrl returns the stored avatar URL', () => {
  const { page } = makePageWithField('setAvatarUrl', 'https://example.com/avatar.png')

  assert.equal(page.getAvatarUrl(), 'https://example.com/avatar.png')
})

test('getAvatarUrl returns null without a wallet', () => {
  const profiles = makeProfiles()
  const page = new AccountPage({ profiles })

  assert.equal(page.getAvatarUrl(), null)
})

test('getAvatarUrl returns null without a profile store', () => {
  const wallet = makeWallet()
  const page = new AccountPage({ wallet })

  assert.equal(page.getAvatarUrl(), null)
})

test('hasSetAvatarUrlButton is true', () => {
  const page = new AccountPage({})

  assert.equal(page.hasSetAvatarUrlButton(), true)
})

test('clickSetAvatarUrl navigates to the set-avatar-url page', () => {
  const { navigated, page } = makeNavigatingPage()

  page.clickSetAvatarUrl()

  assert.deepEqual(navigated, [AccountPage.SET_AVATAR_URL_PATH])
})

test('hasAvatarImage returns true when an avatar URL is set', () => {
  const { page } = makePageWithField('setAvatarUrl', 'https://example.com/avatar.png')

  assert.equal(page.hasAvatarImage(), true)
})

test('hasAvatarImage returns true when only a fallback URL is provided', () => {
  const { page } = makePage()

  assert.equal(page.hasAvatarImage('https://fallback.com/avatar.png'), true)
})

test('hasAvatarImage returns false when no avatar URL is set', () => {
  const { page } = makePage()

  assert.equal(page.hasAvatarImage(), false)
})

test('hasAvatarImage returns false without a wallet', () => {
  const profiles = makeProfiles()
  const page = new AccountPage({ profiles })

  assert.equal(page.hasAvatarImage(), false)
})

test('getAvatarImageUrl returns the stored avatar URL', () => {
  const { page } = makePageWithField('setAvatarUrl', 'https://example.com/avatar.png')

  assert.equal(page.getAvatarImageUrl(), 'https://example.com/avatar.png')
})

test('getAvatarImageUrl returns the fallback URL when no profile URL is set', () => {
  const { page } = makePage()

  assert.equal(page.getAvatarImageUrl('https://fallback.com/avatar.png'), 'https://fallback.com/avatar.png')
})

test('getAvatarImageUrl returns null when no avatar URL is set', () => {
  const { page } = makePage()

  assert.equal(page.getAvatarImageUrl(), null)
})

test('getDisplayAvatarUrl prefers the profile store over the fallback', () => {
  const { page } = makePageWithField('setAvatarUrl', 'https://profile.com/avatar.png')

  assert.equal(page.getDisplayAvatarUrl('https://fallback.com/avatar.png'), 'https://profile.com/avatar.png')
})

test('showsJdenticon is true when no avatar URL is set', () => {
  const { page } = makePage()

  assert.equal(page.showsJdenticon(), true)
})

test('showsJdenticon is false when an avatar URL is set', () => {
  const { page } = makePageWithField('setAvatarUrl', 'https://example.com/avatar.png')

  assert.equal(page.showsJdenticon(), false)
})

test('getTruncatedAddress shortens a long address to the compact form', () => {
  const wallet = makeWallet('bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy')
  const page = new AccountPage({ wallet })

  assert.equal(page.getTruncatedAddress(), 'bitcoincas...4y0qverfuy')
})

test('getDisplayName falls back to the truncated address when no name is set', () => {
  const wallet = makeWallet('bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy')
  const page = new AccountPage({ wallet, profiles: makeProfiles() })

  assert.equal(page.getDisplayName(), 'bitcoincas...4y0qverfuy')
})

test('getDisplayName prefers the stored name over the truncated address', () => {
  const { page } = makePageWithField('setName', 'trout')

  assert.equal(page.getDisplayName(), 'trout')
})

test('getControlDescription returns the description for each control', () => {
  const page = new AccountPage({})

  assert.equal(
    page.getControlDescription('Set Name'),
    'Set the name shown next to your posts and on your profile.'
  )
  assert.equal(
    page.getControlDescription('Set Bio'),
    'Write the profile text shown on your profile page.'
  )
  assert.equal(
    page.getControlDescription('Set Avatar URL'),
    'Set the URL of the image used as your profile picture.'
  )
})

test('getControlDescription returns null for an unknown control', () => {
  const page = new AccountPage({})

  assert.equal(page.getControlDescription('Set Nothing'), null)
})

test('getControls lists the controls with their descriptions', () => {
  const page = new AccountPage({})

  const controls = page.getControls()

  assert.deepEqual(controls.map((control) => control.label), ['Set Name', 'Set Bio', 'Set Avatar URL'])
  assert.equal(controls[0].description, page.getControlDescription('Set Name'))
  assert.equal(controls[1].description, page.getControlDescription('Set Bio'))
  assert.equal(controls[2].description, page.getControlDescription('Set Avatar URL'))
})

test('getSidebarSections lists the sidebar sections in order', () => {
  const page = new AccountPage({})

  assert.deepEqual(page.getSidebarSections(), ['avatar', 'bio', 'address', 'tokens'])
})

test('loadTokenIcons lists the account tokens and shows them with the token ID tooltip', async () => {
  const listed = []
  const tokenSource = {
    async listTokens (addr) {
      listed.push(addr)
      return [{ tokenId: '1'.repeat(64), ticker: 'ALPHA', name: 'Alpha Token' }]
    }
  }
  const wallet = makeWallet()
  const page = new AccountPage({ wallet, profiles: makeProfiles(), tokenSource })

  await page.loadTokenIcons()

  assert.deepEqual(listed, [wallet.walletInfo.cashAddress])
  assert.equal(page.getTokenIcons().length, 1)
  assert.equal(page.getTokenIcons()[0].tooltip, '1'.repeat(64))
  assert.equal(page.getTokenIcons()[0].isJdenticon, true)
})

test('loadTokenData resolves the mutable-data image and the genesis name', async () => {
  const tokenSource = {
    async listTokens () {
      return [{ tokenId: '1'.repeat(64), ticker: 'ALPHA' }]
    },
    async getTokenData () {
      return { genesisData: { name: 'Alpha Token' }, mutableData: 'ipfs://bafyAlpha' }
    },
    async cid2json () {
      return { json: { tokenIcon: 'https://example.com/a.png' } }
    }
  }
  const page = new AccountPage({ wallet: makeWallet(), profiles: makeProfiles(), tokenSource })

  await page.loadTokenIcons()
  await page.loadTokenData()

  const icon = page.getTokenIcons()[0]
  assert.equal(icon.imageUrl, 'https://example.com/a.png')
  assert.equal(icon.tooltip, 'Alpha Token')
})

test('loadTokenIcons shows no icons and does not throw when the lookup fails', async () => {
  const tokenSource = {
    async listTokens () {
      throw new Error('token lookup failed')
    }
  }
  const page = new AccountPage({ wallet: makeWallet(), profiles: makeProfiles(), tokenSource })

  await assert.doesNotReject(() => page.loadTokenIcons())
  assert.deepEqual(page.getTokenIcons(), [])
})

test('loadTokenIcons shows no icons without a token source', async () => {
  const page = new AccountPage({ wallet: makeWallet(), profiles: makeProfiles() })

  await page.loadTokenIcons()

  assert.deepEqual(page.getTokenIcons(), [])
})

test('load loads the account token icons', async () => {
  const tokenSource = {
    async listTokens () {
      return [{ tokenId: '1'.repeat(64), ticker: 'ALPHA' }]
    }
  }
  const page = new AccountPage({ wallet: makeWallet(), profiles: makeProfiles(), tokenSource })

  const result = await page.load()

  assert.equal(result.tokenIcons.length, 1)
  assert.equal(page.getTokenIcons()[0].tokenId, '1'.repeat(64))
})

test('copyAddress copies the address and shows the confirmation', async () => {
  const copied = []
  const wallet = makeWallet()
  const page = new AccountPage({
    wallet,
    profiles: makeProfiles(),
    copyToClipboard: async (text) => copied.push(text),
    setTimer: () => 1,
    clearTimer: () => {}
  })

  assert.equal(page.isShowingAddressCopyConfirmation(), false)
  await page.copyAddress()
  assert.deepEqual(copied, [wallet.walletInfo.cashAddress])
  assert.equal(page.isShowingAddressCopyConfirmation(), true)
})

test('addressCopyTimeoutElapsed clears the copy confirmation', async () => {
  const wallet = makeWallet()
  const page = new AccountPage({
    wallet,
    profiles: makeProfiles(),
    copyToClipboard: async () => {},
    setTimer: () => 1,
    clearTimer: () => {}
  })

  await page.copyAddress()
  page.addressCopyTimeoutElapsed()

  assert.equal(page.isShowingAddressCopyConfirmation(), false)
})

test('the copy confirmation timer clears the confirmation', async () => {
  let timerCallback = null
  const wallet = makeWallet()
  const page = new AccountPage({
    wallet,
    profiles: makeProfiles(),
    copyToClipboard: async () => {},
    setTimer: (fn) => { timerCallback = fn; return 1 },
    clearTimer: () => {}
  })

  await page.copyAddress()
  assert.equal(page.isShowingAddressCopyConfirmation(), true)

  timerCallback()

  assert.equal(page.isShowingAddressCopyConfirmation(), false)
})

test('copyAddress notifies the address copy change callback', async () => {
  const changes = []
  const page = new AccountPage({
    wallet: makeWallet(),
    profiles: makeProfiles(),
    copyToClipboard: async () => {},
    onAddressCopyChange: (copied) => changes.push(copied),
    setTimer: () => 1,
    clearTimer: () => {}
  })

  await page.copyAddress()
  page.addressCopyTimeoutElapsed()

  assert.deepEqual(changes, [true, false])
})

test('copyAddress throws when the account has no address', async () => {
  const page = new AccountPage({ copyToClipboard: async () => {} })

  await assert.rejects(
    () => page.copyAddress(),
    /requires an address/
  )
})

test('copyAddress throws when no clipboard adapter is provided', async () => {
  const page = new AccountPage({ wallet: makeWallet() })

  await assert.rejects(
    () => page.copyAddress(),
    /requires a clipboard adapter/
  )
})

test('destroy clears the pending copy confirmation timer', async () => {
  const cleared = []
  const page = new AccountPage({
    wallet: makeWallet(),
    copyToClipboard: async () => {},
    setTimer: () => 7,
    clearTimer: (id) => cleared.push(id)
  })

  await page.copyAddress()
  const returned = page.destroy()

  assert.equal(returned, page)
  assert.deepEqual(cleared, [7])
  assert.equal(page.isShowingAddressCopyConfirmation(), true)
})

test('destroy is safe when no copy confirmation timer is pending', () => {
  const cleared = []
  const page = new AccountPage({
    wallet: makeWallet(),
    clearTimer: (id) => cleared.push(id)
  })

  assert.doesNotThrow(() => page.destroy())
  assert.deepEqual(cleared, [])
})

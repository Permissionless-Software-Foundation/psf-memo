'use strict'

const { fakeWallet } = require('../helpers/fake-wallet')

// Build a page controller wired to a working action and a navigation recorder.
// Both the New Post and Set Name pages extend PageController and take a single
// action dependency plus a navigate callback, so the wiring is identical; only
// the page-specific pieces differ. `cfg` supplies:
//   Page       - the page controller class (NewPostPage or SetNamePage)
//   Action     - the action class (MemoPost or MemoSetName)
//   actionKey  - the page's action dependency key ('memoPost' or 'memoSetName')
//   storeKey   - the action's store dependency key ('feed' or 'profiles')
//   storeFactory - () => a fresh store
//   pageDeps   - extra dependencies passed to the page constructor
function buildPage ({ Page, Action, actionKey, storeKey, storeFactory, pageDeps = {} }) {
  const wallet = fakeWallet()
  const store = storeFactory()
  const action = new Action({ wallet, [storeKey]: store })
  const navigations = []
  const page = new Page({
    [actionKey]: action,
    navigate: (path) => navigations.push(path),
    ...pageDeps
  })
  return { wallet, store, action, page, navigations }
}

module.exports = { buildPage }

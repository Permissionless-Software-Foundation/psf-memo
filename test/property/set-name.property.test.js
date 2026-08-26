/*
  Property tests for the Set Name behavior slice.

  These assert useful invariants that unit tests cover only at a few fixed
  points. The validation, counter-conservation, setInput round-trip, and
  broadcast-failure invariants are shared with the Memo post slice and live in
  behavior-helpers.js; this file supplies the Set Name specifics.
*/

'use strict'

const { seededRandom } = require('./harness')
const { registerBehaviorProperties } = require('./behavior-helpers')
const { fakeProfiles } = require('../helpers/fake-profiles')

const MemoSetName = require('../../src/services/memo-set-name')
const SetNamePage = require('../../src/services/set-name-page')

const MAX = MemoSetName.MAX_NAME_BYTES // 77

const rng = seededRandom(20260827)

function buildPage () {
  return new SetNamePage({
    memoSetName: new MemoSetName({}),
    navigate: () => {}
  })
}

function buildBroadcastPage ({ wallet, navigations }) {
  return new SetNamePage({
    memoSetName: new MemoSetName({ wallet, profiles: fakeProfiles() }),
    navigate: (p) => navigations.push(p)
  })
}

registerBehaviorProperties({
  Module: MemoSetName,
  MAX,
  label: 'set-name',
  rng,
  measure: (input) => Buffer.byteLength(input, 'utf8'),
  buildPage,
  buildBroadcastPage
})

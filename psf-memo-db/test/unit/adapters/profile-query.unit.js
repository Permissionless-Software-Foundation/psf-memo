import { assert } from 'chai'
import sinon from 'sinon'
import ProfileQuery from '../../../src/adapters/profile-query.js'

describe('#ProfileQuery', () => {
  let uut
  let sandbox
  let profilesDb

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    profilesDb = {
      iterator: sandbox.stub()
    }
    uut = new ProfileQuery({ profilesDb })
  })

  afterEach(() => sandbox.restore())

  it('should scan profiles and read block height from stored document', async () => {
    async function * mockIterator () {
      yield ['addr1', { text: 'hi', txid: 'tx1', seen: 1000, blockHeight: 600100 }]
      yield ['addr2', { text: 'bye', txid: 'tx2', seen: 2000, blockHeight: 600200 }]
    }
    profilesDb.iterator.returns(mockIterator())

    const result = await uut.scanProfilesWithBlockHeight()

    assert.equal(result.length, 2)
    assert.equal(result[0].blockHeight, 600100)
    assert.equal(result[1].blockHeight, 600200)
  })

  it('should use block height 0 when field is missing', async () => {
    async function * mockIterator () {
      yield ['addr1', { text: 'hi', txid: 'tx1', seen: 1000 }]
    }
    profilesDb.iterator.returns(mockIterator())

    const result = await uut.scanProfilesWithBlockHeight()

    assert.equal(result[0].blockHeight, 0)
  })
})

import { assert } from 'chai'
import sinon from 'sinon'
import PollsRESTControllerLib from '../../../src/controllers/rest-api/polls/controller.js'

describe('#PollsRESTController', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new PollsRESTControllerLib({
      adapters: {},
      useCases: {
        getPoll: {
          execute: sandbox.stub().resolves({
            txid: 'poll-1',
            question: 'which?',
            options: [],
            votes: []
          })
        },
        getPollOptions: {
          execute: sandbox.stub().resolves({
            txid: 'poll-1',
            options: [{ option: 'yes' }, { option: 'no' }]
          })
        },
        getPollVotes: {
          execute: sandbox.stub().resolves({
            txid: 'poll-1',
            votes: [{ comment: 'hello' }]
          })
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should require adapters on instantiation', () => {
    assert.throws(
      () => new PollsRESTControllerLib({ useCases: {} }),
      /Adapters required/
    )
  })

  it('should require use cases on instantiation', () => {
    assert.throws(
      () => new PollsRESTControllerLib({ adapters: {} }),
      /Use Cases required/
    )
  })

  it('should return a poll from the use case', async () => {
    const ctx = { params: { txid: 'poll-1' }, body: null, throw: sandbox.stub() }
    await uut.getPoll(ctx)

    assert.equal(uut.useCases.getPoll.execute.callCount, 1)
    assert.deepEqual(uut.useCases.getPoll.execute.firstCall.args[0], { txid: 'poll-1' })
    assert.equal(ctx.body.question, 'which?')
  })

  it('should return poll options from the use case', async () => {
    const ctx = { params: { txid: 'poll-1' }, body: null, throw: sandbox.stub() }
    await uut.getPollOptions(ctx)

    assert.equal(uut.useCases.getPollOptions.execute.callCount, 1)
    assert.equal(ctx.body.options.length, 2)
    assert.equal(ctx.body.options[0].option, 'yes')
  })

  it('should return poll votes from the use case', async () => {
    const ctx = { params: { txid: 'poll-1' }, body: null, throw: sandbox.stub() }
    await uut.getPollVotes(ctx)

    assert.equal(uut.useCases.getPollVotes.execute.callCount, 1)
    assert.equal(ctx.body.votes.length, 1)
    assert.equal(ctx.body.votes[0].comment, 'hello')
  })

  it('should preserve the status and message of a statused error', async () => {
    const err = new Error('poll not found')
    err.status = 404
    uut.useCases.getPoll.execute = sandbox.stub().rejects(err)
    const ctx = { params: { txid: 'poll-1' }, body: null, throw: sandbox.stub() }

    await uut.getPoll(ctx)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 404)
    assert.equal(ctx.throw.firstCall.args[1], 'poll not found')
  })

  it('should throw a 500 when the use case fails without a status', async () => {
    uut.useCases.getPollOptions.execute = sandbox.stub().rejects(new Error('boom'))
    const ctx = { params: { txid: 'poll-1' }, body: null, throw: sandbox.stub() }

    await uut.getPollOptions(ctx)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 500)
    assert.equal(ctx.throw.firstCall.args[1], 'boom')
  })
})

/*
  Unit tests for the GetPollVotes use case.
*/

import { assert } from 'chai'
import GetPollVotes from '../../../src/use-cases/get-poll-votes.js'

describe('GetPollVotes', () => {
  it('should throw 400 when txid is missing', async () => {
    const useCase = new GetPollVotes({
      adapters: {
        pollQuery: {
          async getPollVotes () { return [] }
        }
      }
    })

    try {
      await useCase.execute({})
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.status, 400)
    }
  })

  it('should return the votes for the poll', async () => {
    const useCase = new GetPollVotes({
      adapters: {
        pollQuery: {
          async getPollVotes (txid) {
            return [{ txid: 'vote-1', pollTxid: txid, comment: 'yes' }]
          }
        }
      }
    })

    const result = await useCase.execute({ txid: 'poll-1' })
    assert.equal(result.votes.length, 1)
    assert.equal(result.votes[0].comment, 'yes')
  })
})

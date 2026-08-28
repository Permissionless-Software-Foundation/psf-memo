/*
  Unit tests for the GetPoll use case.
*/

import { assert } from 'chai'
import GetPoll from '../../../src/use-cases/get-poll.js'

describe('GetPoll', () => {
  it('should throw 400 when txid is missing', async () => {
    const useCase = new GetPoll({
      adapters: {
        pollQuery: {
          async getPoll () { return null }
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

  it('should throw 404 when poll does not exist', async () => {
    const useCase = new GetPoll({
      adapters: {
        pollQuery: {
          async getPoll () { return null }
        }
      }
    })

    try {
      await useCase.execute({ txid: 'missing' })
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.status, 404)
    }
  })

  it('should return the poll from the query adapter', async () => {
    const useCase = new GetPoll({
      adapters: {
        pollQuery: {
          async getPoll (txid) {
            return { txid, question: 'which?', options: [], votes: [] }
          }
        }
      }
    })

    const result = await useCase.execute({ txid: 'poll-1' })
    assert.equal(result.question, 'which?')
  })
})

/*
  Unit tests for the GetPollOptions use case.
*/

import { assert } from 'chai'
import GetPollOptions from '../../../src/use-cases/get-poll-options.js'

describe('GetPollOptions', () => {
  it('should throw 400 when txid is missing', async () => {
    const useCase = new GetPollOptions({
      adapters: {
        pollQuery: {
          async getPollOptions () { return [] }
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

  it('should return the options for the poll', async () => {
    const useCase = new GetPollOptions({
      adapters: {
        pollQuery: {
          async getPollOptions (txid) {
            return [{ txid: 'opt-1', pollTxid: txid, option: 'yes' }]
          }
        }
      }
    })

    const result = await useCase.execute({ txid: 'poll-1' })
    assert.equal(result.options.length, 1)
    assert.equal(result.options[0].option, 'yes')
  })
})

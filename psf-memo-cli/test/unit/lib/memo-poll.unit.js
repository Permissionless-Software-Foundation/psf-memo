/*
  Unit tests for the pure memo-poll helper.

  The command reads a single poll with its options and votes. This pins the
  human-readable summary of the question, the option authors, and the vote
  comments.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { formatPollMessage } from '../../../src/lib/memo-poll.js'

describe('#memo-poll helper', () => {
  it('renders the question, options, and votes', () => {
    const message = formatPollMessage({
      question: 'which is better?',
      options: [
        { option: 'yes', addr: 'bitcoincash:qyes' },
        { option: 'no', addr: 'bitcoincash:qno' }
      ],
      votes: [
        { comment: 'yes', addr: 'bitcoincash:qvoter1' },
        { comment: 'no', addr: 'bitcoincash:qvoter2' }
      ]
    })

    assert.include(message, 'question: which is better?')
    assert.include(message, 'option yes from bitcoincash:qyes')
    assert.include(message, 'option no from bitcoincash:qno')
    assert.include(message, 'vote from bitcoincash:qvoter1: yes')
    assert.include(message, 'vote from bitcoincash:qvoter2: no')
  })

  it('renders a poll with no options or votes', () => {
    const message = formatPollMessage({ question: 'tea or coffee?' })
    assert.equal(message, 'question: tea or coffee?')
  })
})

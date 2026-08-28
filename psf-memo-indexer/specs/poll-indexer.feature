# Scenarios: Poll Indexer - 1, Poll Indexer - 2, Poll Indexer - 3, Poll Indexer - 4, Poll Indexer - 5, Poll Indexer - 6
#
# The indexer parses Memo poll actions and stores structured records:
#   - 0x6d10 create poll: poll_type byte + option_count byte + question
#   - 0x6d13 add poll option: poll txid (32 bytes) + option text
#   - 0x6d14 poll vote: poll txid (32 bytes) + comment text
# The poll txid is a 32-byte binary hash reversed to hex, like other Memo
# txid payloads.
Feature: Poll Indexer

  Background:
    Given a psf-memo-db instance that records poll records
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: Poll Indexer - 1 a create-poll transaction stores the poll
    When the indexer processes a create-poll transaction with the question "<question>" and <option_count> options
    Then the psf-memo-db stores a poll with the question "<question>" and <option_count> options

    Examples:
      | question | option_count |
      | which is better? | 2 |
      | what should we build next? | 3 |

  Scenario Outline: Poll Indexer - 2 an add-option transaction stores the option for the poll
    When the indexer processes an add-option transaction for the poll <txid> with the option "<option>"
    Then the psf-memo-db stores the option "<option>" for the poll <txid>

    Examples:
      | txid | option |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | yes |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | definitely |

  Scenario Outline: Poll Indexer - 3 a vote transaction stores the vote for the poll
    When the indexer processes a vote transaction for the poll <txid> with the comment "<comment>"
    Then the psf-memo-db stores the vote "<comment>" for the poll <txid>

    Examples:
      | txid | comment |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | yes |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | I choose this one |

  Scenario Outline: Poll Indexer - 4 a create-poll transaction with a missing question is rejected
    When the indexer processes a create-poll transaction with the question "<question>" and 2 options
    Then the indexer records a process error and stores no poll

    Examples:
      | question |
      |  |

  Scenario Outline: Poll Indexer - 5 an add-option transaction with a missing option is rejected
    When the indexer processes an add-option transaction for the poll aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa with the option "<option>"
    Then the indexer records a process error and stores no option

    Examples:
      | option |
      |  |

  Scenario Outline: Poll Indexer - 6 a vote transaction with a missing comment is rejected
    When the indexer processes a vote transaction for the poll aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa with the comment "<comment>"
    Then the indexer records a process error and stores no vote

    Examples:
      | comment |
      |  |

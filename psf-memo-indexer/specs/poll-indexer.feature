# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-29T00:41:48.609388971Z","feature_name":"Poll Indexer","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/poll-indexer.feature","background_hash":"5a9e350be3961c678832c72e88a0f70aad794d227c57c5cd13c81f9fb63803d8","implementation_hash":"unknown","scenarios":[{"index":3,"name":"Poll Indexer - 4 a create-poll transaction with a missing question is rejected","scenario_hash":"f8dd901cc91034ed13b1eb7158e019af3db0db009fbdd58406f0b3f3b63912c3","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-29T00:41:48.609388971Z"},{"index":4,"name":"Poll Indexer - 5 an add-option transaction with a missing option is rejected","scenario_hash":"fad1157744eadd9eda2e172235e4d599aa3223e19fe9a1b45d8cae35d632e930","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-29T00:41:48.609388971Z"},{"index":5,"name":"Poll Indexer - 6 a vote transaction with a missing comment is rejected","scenario_hash":"dcfe3185e083709f448792d371441a2e4f3dbb442bbda276c6a781d14172af81","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-29T00:41:48.609388971Z"}]}
# acceptance-mutation-manifest-end

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

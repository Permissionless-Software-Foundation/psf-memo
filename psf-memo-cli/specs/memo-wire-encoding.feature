# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T00:11:08.664635708Z","feature_name":"Memo Wire Encoding","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-wire-encoding.feature","background_hash":"a66b7a2e7e764329f66a5401d2fbe13924a637dc3bfb3d575913535866ec7306","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Memo Wire Encoding - 1 a display txid converts to little-endian wire bytes","scenario_hash":"8de1487580f39631e097d8014b36951fcd0d4ce386c86df068dbeff0aa3dc21c","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-07T00:11:08.664635708Z"},{"index":2,"name":"Memo Wire Encoding - 3 a cash address converts to its 20-byte hash160","scenario_hash":"8e4a63a00dd11e597f2040b3ceb9ab98f5da4513078830d59f0374f508c11fb9","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-10-07T00:11:08.664635708Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Memo Wire Encoding - 1, Memo Wire Encoding - 2, Memo Wire Encoding - 3, Memo Wire Encoding - 4
#
# F4: the shared encoding helpers every memo-* broadcast command uses to build
# OP_RETURN payloads. A display txid (64 hex characters, big-endian) is written
# as 32 bytes in little-endian wire order; a cash address is written as its
# 20-byte hash160 in display order and is NOT byte-reversed. Malformed txids and
# addresses are rejected. The hash160 scenario is the regression guard for the
# endianness bug class (gotcha #32).
Feature: Memo Wire Encoding

  Background:
    Given a Memo encoding helper

  Scenario Outline: Memo Wire Encoding - 1 a display txid converts to little-endian wire bytes
    Given the txid "<txid>"
    When the txid is converted to wire bytes
    Then the wire bytes are "<wire>"

    Examples:
      | txid                                                             | wire                                                             |
      | 0000000000000000000000000000000000000000000000000000000000000001 | 0100000000000000000000000000000000000000000000000000000000000000 |
      | 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20 | 201f1e1d1c1b1a191817161514131211100f0e0d0c0b0a090807060504030201 |

  Scenario Outline: Memo Wire Encoding - 2 a malformed txid is rejected
    Given the txid "<txid>"
    When the txid is converted to wire bytes
    Then the conversion reports an invalid txid

    Examples:
      | txid                                                             |
      | 1234                                                             |
      | 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20ff |
      | zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz |

  Scenario Outline: Memo Wire Encoding - 3 a cash address converts to its 20-byte hash160
    Given the cash address "<addr>"
    When the address is converted to its payload
    Then the payload is "<hash160>"

    Examples:
      | addr                                                   | hash160                                  |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | 3e31055173cf58d56edb075499daf29d7b488f09 |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | cb481232299cd5743151ac4b2d63ae198e7bb0a9 |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 011f28e473c95f4013d7d53ec5fbc3b42df8ed10 |

  Scenario Outline: Memo Wire Encoding - 4 a malformed cash address is rejected
    Given the cash address "<addr>"
    When the address is converted to its payload
    Then the conversion reports an invalid address

    Examples:
      | addr                   |
      | not-an-address         |
      | bitcoincash:qznonsense |
      | 1234567890             |

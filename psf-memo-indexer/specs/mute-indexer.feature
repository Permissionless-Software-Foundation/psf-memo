# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-29T03:40:09.241155483Z","feature_name":"Mute Indexer","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/mute-indexer.feature","background_hash":"b019877abd54b08b22034bf036a8a6002e6e81638ca39a8620a5c66ec25439ae","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Mute Indexer - 1, Mute Indexer - 2, Mute Indexer - 3
#
# The indexer parses Memo mute actions and stores structured records:
#   - 0x6d16 mute: target address (20-byte hash160)
#   - 0x6d17 unmute: target address (20-byte hash160)
# The target is a 20-byte P2PKH hash160, like the follow/unfollow payload.
Feature: Mute Indexer

  Background:
    Given a psf-memo-db instance that records mute records
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: Mute Indexer - 1 a mute transaction stores the mute record
    When the indexer processes a mute transaction for the address <addr> from <muter>
    Then the psf-memo-db stores a mute record for the address <addr> by <muter>

    Examples:
      | addr | muter |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |

  Scenario Outline: Mute Indexer - 2 an unmute transaction stores the unmute record
    When the indexer processes an unmute transaction for the address <addr> from <muter>
    Then the psf-memo-db stores an unmute record for the address <addr> by <muter>

    Examples:
      | addr | muter |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |

  Scenario Outline: Mute Indexer - 3 a mute transaction with a wrong-size address is rejected
    When the indexer processes a mute transaction for the address <addr> from <muter>
    Then the indexer records a process error and stores no mute record

    Examples:
      | addr | muter |
      |  | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |

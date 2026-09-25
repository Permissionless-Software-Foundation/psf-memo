# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-25T22:44:20.454089052Z","feature_name":"Mute Persistence","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/mute-persistence.feature","background_hash":"0819ba7011f4a38292efd90e4da33aa9cfbcd5c825593dcb9ef2121cd449d219","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Mute Persistence - 1, Mute Persistence - 2, Mute Persistence - 3
#
# psf-memo-db must expose the `mute` entity write route on the same generic
# /level CRUD surface the indexer uses. psf-memo-indexer writes mutes through
# `createEntityDb('mute', 'key', 'muteData')`, which POSTs `{ key, muteData }`
# to /level/mute. Without a matching entity route the indexer's write returns
# 404, so every mute transaction the indexer processes is lost and the mute
# read API and feed filter always see an empty store.
#
# A mutes record is keyed `${muterAddr}:${muteePkHash}`, where muteePkHash is
# the mutee's 20-byte hash160, and holds
# `{ muterAddr, muteePkHash, unmute, txid, seen, blockHeight }`. `unmute` is
# false for a mute (0x6d16) and true for an unmute (0x6d17). The route upserts,
# so the latest write for a pair wins and GET /mute/state and GET /mute/muted
# report the pair's current state.
#
# The acceptance write step must exercise the real `mute` entity route (the
# controller handler reached through the entity route registry), so a missing
# route fails the scenario rather than writing the mutes store directly.
Feature: Mute Persistence

  Background:
    Given a psf-memo-db instance with a mutes store

  Scenario Outline: Mute Persistence - 1 a mute written through the entity API is readable
    When the psf-memo-db entity API stores a mute record for mutee <mutee> from muter <muter> at block height <muteHeight>
    And the client requests the mute state for muter <muter> and mutee <mutee>
    Then the mute state reports muted true
    And the client requests the muted list for <muter>
    And the muted list contains the addresses <mutee>

    Examples:
      | muter | mutee | muteHeight |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 600100 |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 600200 |

  Scenario Outline: Mute Persistence - 2 an unmute written after a mute clears the pair
    Given the psf-memo-db entity API stores a mute record for mutee <mutee> from muter <muter> at block height <muteHeight>
    When the psf-memo-db entity API stores an unmute record for mutee <mutee> from muter <muter> at block height <unmuteHeight>
    And the client requests the mute state for muter <muter> and mutee <mutee>
    Then the mute state reports muted false
    And the client requests the muted list for <muter>
    And the muted list does not contain the addresses <mutee>

    Examples:
      | muter | mutee | muteHeight | unmuteHeight |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 600100 | 600200 |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 600300 | 600400 |

  Scenario Outline: Mute Persistence - 3 entity-route mutes are keyed by muter and mutee
    Given the psf-memo-db entity API stores a mute record for mutee <mutee> from muter <muter> at block height <muteHeight>
    And the psf-memo-db entity API stores a mute record for mutee <otherMutee> from muter <otherMuter> at block height <muteHeight>
    When the client requests the muted list for <muter>
    Then the muted list contains the addresses <mutee>

    Examples:
      | muter | mutee | otherMuter | otherMutee | muteHeight |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 600100 |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 600200 |

# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-29T03:43:35.749097546Z","feature_name":"Mute Read","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/mute-read.feature","background_hash":"a5f096996120c0f8eb55576184704c74a5e3487999edec263abee0d8fdd53348","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Mute Read - 2 GET /mute/muted lists the addresses a muter mutes","scenario_hash":"ad2bc8a39c2450f1391aa39d246f30989536f3d94b461302bd9528c029641362","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-08-29T03:43:35.749097546Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Mute Read - 1, Mute Read - 2
#
# The mutes store keys mutees by 20-byte hash160. Use bch-js
# Address.toHash160() / Address.hash160ToCash() to convert between cash
# addresses and hash160 for the mute state and muted-user lists.
# Prefer bch-js over adding a separate cashaddr dependency.
Feature: Mute Read

  Background:
    Given a psf-memo-db instance with a mutes store
    Given the fixture "mutes" is loaded into the mutes store

  Scenario Outline: Mute Read - 1 GET /mute/state reports whether a muter mutes a mutee
    When the client requests the mute state for muter <muter> and mutee <mutee>
    Then the mute state reports muted <muted>

    Examples:
      | muter | mutee | muted |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | true |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | false |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | true |

  Scenario Outline: Mute Read - 2 GET /mute/muted lists the addresses a muter mutes
    When the client requests the muted list for <muter>
    Then the muted list contains the addresses <expected>

    Examples:
      | muter | expected |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

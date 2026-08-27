# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-27T18:19:23.459992768Z","feature_name":"Follow Read","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/follow-read.feature","background_hash":"d8fb430d3eb584b455ccd5d1b5cfbd99a494bc5c382c14df2af63f56369e1f2a","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Follow Read - 2 GET /follow/following lists the addresses a follower follows","scenario_hash":"9a8847dcd27c43aa71377d4d887e8b5b74a7ad428d74e63e8decd6c96ea6a3c1","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-08-27T18:19:23.459992768Z"},{"index":2,"name":"Follow Read - 3 GET /follow/followers lists the addresses that follow a followee","scenario_hash":"7ac6ac4d7fa00d0c9ac1307631a1a11103ad241251dc325914e9cc3adba9b01a","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-08-27T18:19:23.459992768Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Follow Read - 1, Follow Read - 2, Follow Read - 3
#
# The follows store keys followees by 20-byte hash160. Use bch-js
# Address.toHash160() / Address.hash160ToCash() to convert between cash
# addresses and hash160 for the follow state and following/followers lists.
# Prefer bch-js over adding a separate cashaddr dependency.
Feature: Follow Read

  Background:
    Given a psf-memo-db instance with a follows store
    Given the fixture "follows" is loaded into the follows store

  Scenario Outline: Follow Read - 1 GET /follow/state reports whether a follower follows a followee
    When the client requests the follow state for follower <follower> and followee <followee>
    Then the follow state reports following <following>

    Examples:
      | follower | followee | following |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | true |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | false |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | true |

  Scenario Outline: Follow Read - 2 GET /follow/following lists the addresses a follower follows
    When the client requests the following list for <follower>
    Then the following list contains the addresses <expected>

    Examples:
      | follower | expected |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Follow Read - 3 GET /follow/followers lists the addresses that follow a followee
    When the client requests the followers list for <followee>
    Then the followers list contains the addresses <expected>

    Examples:
      | followee | expected |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d,bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |  |

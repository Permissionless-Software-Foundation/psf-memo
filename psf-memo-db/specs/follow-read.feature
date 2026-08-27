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

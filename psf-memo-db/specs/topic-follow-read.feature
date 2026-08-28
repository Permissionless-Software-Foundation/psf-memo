# Scenarios: Topic Follow Read - 1, Topic Follow Read - 2
#
# The indexer stores topic follows in the rooms store keyed `${room}:${addr}`
# with type 'follow' and an `unfollow` boolean. The read side exposes whether
# an address follows a topic and the list of addresses that follow a topic.
#
# Fixture "topic-follows":
#   rooms store:
#     bitcoin:addr-a  { room: bitcoin, addr: addr-a, type: follow, unfollow: false }
#     bitcoin:addr-b  { room: bitcoin, addr: addr-b, type: follow, unfollow: false }
#     bitcoin:addr-c  { room: bitcoin, addr: addr-c, type: follow, unfollow: true }
#     cash:addr-a     { room: cash, addr: addr-a, type: follow, unfollow: false }
Feature: Topic Follow Read

  Background:
    Given a psf-memo-db instance with a rooms store
    Given the fixture "topic-follows" is loaded into the rooms store

  Scenario Outline: Topic Follow Read - 1 GET /topics/:room/follow/state reports whether an address follows a topic
    When the client requests the topic follow state for room <room> and address <addr>
    Then the topic follow state reports following <following>

    Examples:
      | room | addr | following |
      | bitcoin | addr-a | true |
      | bitcoin | addr-c | false |
      | bitcoin | addr-x | false |
      | cash | addr-a | true |

  Scenario Outline: Topic Follow Read - 2 GET /topics/:room/followers lists the addresses that follow a topic
    When the client requests the topic followers list for room <room>
    Then the topic followers list contains the addresses <expected>

    Examples:
      | room | expected |
      | bitcoin | addr-a,addr-b |
      | cash | addr-a |
      | lone |  |

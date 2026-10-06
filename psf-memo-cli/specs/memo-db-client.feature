# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-06T23:30:13.891261034Z","feature_name":"Memo DB Client","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-db-client.feature","background_hash":"9969b0d69a372fbee0d61dc2c0c54c015cb0eec90f4702ab1f063e1be4b3e4ee","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Memo DB Client - 2 the MEMO_DB_URL environment variable selects the endpoint","scenario_hash":"989987f5590863c8dd7b3ce1b8a8e4bb3cf096b4a510bfc4eac0b311a8a1b704","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-06T23:28:54.166030306Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Memo DB Client - 1, Memo DB Client - 2, Memo DB Client - 3, Memo DB Client - 4, Memo DB Client - 5, Memo DB Client - 6, Memo DB Client - 7
#
# F1: the shared read-only client for the psf-memo-db REST API, and the endpoint
# configuration that selects it. The client is not user-visible on its own;
# every memo-* read command uses it. Endpoint precedence is the --db-url flag,
# then the MEMO_DB_URL environment variable, then the production memo-db. A
# missing /level/* resource resolves to no data, while a transport or server
# failure is reported as an error.
Feature: Memo DB Client

  Background:
    Given a Memo DB client

  Scenario: Memo DB Client - 1 the default endpoint is the production memo-db
    Given no Memo DB endpoint override is configured
    When the Memo DB client resolves its endpoint
    Then the resolved endpoint is https://memo-api.fullstackcash.net

  Scenario Outline: Memo DB Client - 2 the MEMO_DB_URL environment variable selects the endpoint
    Given the MEMO_DB_URL environment variable is <env_url>
    When the Memo DB client resolves its endpoint
    Then the resolved endpoint is <endpoint>

    Examples:
      | env_url                 | endpoint                |
      | https://memo-db.example | https://memo-db.example |
      | http://localhost:5021   | http://localhost:5021   |

  Scenario Outline: Memo DB Client - 3 the --db-url flag overrides the environment variable
    Given the MEMO_DB_URL environment variable is <env_url>
    And the --db-url flag is <flag_url>
    When the Memo DB client resolves its endpoint
    Then the resolved endpoint is <endpoint>

    Examples:
      | env_url               | flag_url              | endpoint              |
      | https://env.example   | https://flag.example  | https://flag.example  |
      | http://localhost:5021 | https://other.example | https://other.example |

  Scenario Outline: Memo DB Client - 4 a recent-posts request fetches the requested page
    Given the Memo DB service serves <count> recent posts
    When the Memo DB client requests recent posts with limit <limit> and offset <offset>
    Then the Memo DB client returns <shown> posts
    And the service received a request for /posts/recent with limit <limit> and offset <offset>

    Examples:
      | count | limit | offset | shown |
      | 3     | 50    | 0      | 3     |
      | 3     | 1     | 0      | 1     |
      | 3     | 50    | 2      | 1     |

  Scenario Outline: Memo DB Client - 5 a viewer address is sent to the service
    Given the Memo DB service serves <count> recent posts
    When the Memo DB client requests recent posts for the viewer <viewer>
    Then the service received the viewer query parameter <viewer>

    Examples:
      | count | viewer                                                 |
      | 1     | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | 2     | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Memo DB Client - 6 a missing level resource resolves to no data
    Given the Memo DB service has no profile for the address <addr>
    When the Memo DB client reads the profile for the address <addr>
    Then the Memo DB client reports no profile

    Examples:
      | addr                                                   |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |

  Scenario: Memo DB Client - 7 a failed request reports an error
    Given the Memo DB service is unreachable
    When the Memo DB client requests recent posts
    Then the Memo DB client reports an error

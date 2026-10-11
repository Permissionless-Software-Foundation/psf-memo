# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-11T18:52:14.249953595Z","feature_name":"CLI JSON Output","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/cli-json-output.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[{"index":9,"name":"CLI JSON Output - 10 a missing required flag is a usage error in JSON mode","scenario_hash":"a44dca7962e44ec3cacfc620cdf1efea11a99ae8a66f533ab1c9b8ad945cee40","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-11T18:52:14.249953595Z"}]}
# acceptance-mutation-manifest-end

# CLI JSON Output (AF2): extend the shared F5 output contract to the wallet,
# send, and signing commands, which until now printed only human text and
# swallowed errors (catching them and returning 0, so the process still exited
# 0). After this feature every psf-memo-cli command supports --json: it prints
# exactly one JSON object to stdout; a missing required flag is a usage error
# (exit 2); and a runtime failure is a runtime error (exit 1), each reporting
# { "error": "<message>" } on stderr in JSON mode. Human mode keeps its existing
# readable output unchanged. Diagnostics never go to stdout in JSON mode. Key
# material (mnemonic, WIF, private key) is never printed (X3 secret hygiene), so
# wallet-create's JSON exposes only public wallet metadata. This closes the last
# machine-readability gap: agents can chain wallet, send, and signing commands
# with the memo-* reads and writes.
#
# Scenarios: CLI JSON Output - 1, CLI JSON Output - 2, CLI JSON Output - 3, CLI JSON Output - 4, CLI JSON Output - 5, CLI JSON Output - 6, CLI JSON Output - 7, CLI JSON Output - 8, CLI JSON Output - 9, CLI JSON Output - 10, CLI JSON Output - 11, CLI JSON Output - 12
Feature: CLI JSON Output

  Scenario: CLI JSON Output - 1 wallet-create prints one JSON object with the new wallet's public metadata
    Given the CLI command "wallet-create"
    And a wallet named "agent" is created with description "first agent wallet"
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the wallet name "agent"
    And the JSON output has the wallet description "first agent wallet"
    And the JSON output does not have the field "mnemonic"

  Scenario Outline: CLI JSON Output - 2 wallet-list prints one JSON object listing the wallets
    Given the CLI command "wallet-list"
    And a wallet store holding the wallet "<name>" described as "<description>"
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output lists the wallet "<name>" described as "<description>"

    Examples:
      | name     | description |
      | savings  | long term   |
      | spending | daily       |

  Scenario: CLI JSON Output - 3 wallet-addrs prints one JSON object with the wallet's addresses
    Given the CLI command "wallet-addrs"
    And the wallet "agent" has cash address "bitcoincash:qagent", SLP address "simpleledger:qagent", and legacy address "1Agent"
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the cash address "bitcoincash:qagent"
    And the JSON output has the SLP address "simpleledger:qagent"
    And the JSON output has the legacy address "1Agent"

  Scenario: CLI JSON Output - 4 wallet-balance prints one JSON object with the BCH and token balances
    Given the CLI command "wallet-balance"
    And the wallet "agent" holds 100000 satoshis and the token "TKN" with quantity "42.5"
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the BCH balance 0.001
    And the JSON output has the token "TKN" with quantity 42.5

  Scenario: CLI JSON Output - 5 wallet-sweep prints one JSON object with the sweep transaction
    Given the CLI command "wallet-sweep"
    And the wallet-sweep command sweeps the WIF "Kzq8EEyjkXGzDmBbWxHWY8bxayxXawVDmrnmgq7JQmhRgMCrorfj" to the transaction "1111111111111111111111111111111111111111111111111111111111111111"
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the transaction "1111111111111111111111111111111111111111111111111111111111111111"
    And the JSON output has the explorer link "https://bch.loping.net/tx/1111111111111111111111111111111111111111111111111111111111111111"
    And the JSON output does not contain "Kzq8EEyjkXGzDmBbWxHWY8bxayxXawVDmrnmgq7JQmhRgMCrorfj"

  Scenario: CLI JSON Output - 6 send-bch prints one JSON object with the transaction
    Given the CLI command "send-bch"
    And the send-bch command broadcasts the transaction "2222222222222222222222222222222222222222222222222222222222222222"
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the transaction "2222222222222222222222222222222222222222222222222222222222222222"
    And the JSON output has the explorer link "https://bch.loping.net/tx/2222222222222222222222222222222222222222222222222222222222222222"

  Scenario: CLI JSON Output - 7 send-tokens prints one JSON object with the transaction
    Given the CLI command "send-tokens"
    And the send-tokens command broadcasts the transaction "3333333333333333333333333333333333333333333333333333333333333333"
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the transaction "3333333333333333333333333333333333333333333333333333333333333333"
    And the JSON output has the explorer link "https://token.fullstack.cash/transactions/?txid=3333333333333333333333333333333333333333333333333333333333333333"

  Scenario: CLI JSON Output - 8 msg-sign prints one JSON object with the signature
    Given the CLI command "msg-sign"
    And the msg-sign command signs the message "hello memo" with the signature "SIGNATURE"
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the cash address "bitcoincash:qagent"
    And the JSON output has the message "hello memo"
    And the JSON output has the signature "SIGNATURE"

  Scenario Outline: CLI JSON Output - 9 msg-verify prints one JSON object with the verification result
    Given the CLI command "msg-verify"
    And the msg-verify command verifies the signature as <valid>
    When the CLI command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the verification result <valid>

    Examples:
      | valid |
      | true  |
      | false |

  Scenario Outline: CLI JSON Output - 10 a missing required flag is a usage error in JSON mode
    Given the CLI command "<command>" without its required flags
    When the CLI command runs in JSON mode
    Then the exit code is 2
    And stdout is empty
    And stderr is a single JSON object
    And the JSON error has the message "<error>"

    Examples:
      | command       | error                                                                          |
      | wallet-create | You must specify a wallet name with the -n flag.                               |
      | wallet-addrs  | You must specify a wallet name with the -n flag.                               |
      | wallet-balance | You must specify a wallet name with the -n flag.                              |
      | wallet-sweep  | You must specify a wallet name with the -n flag.                              |
      | send-bch      | You must specify a wallet name with the -n flag.                              |
      | send-tokens   | You must specify a wallet name with the -n flag.                              |
      | msg-sign      | You must specify a wallet name with the -n flag.                              |
      | msg-verify    | You must specify an address with the -a flag.                                 |

  Scenario Outline: CLI JSON Output - 11 a runtime failure is a runtime error in JSON mode
    Given the CLI command "<command>" whose work fails with "<error>"
    When the CLI command runs in JSON mode
    Then the exit code is 1
    And stdout is empty
    And stderr is a single JSON object
    And the JSON error has the message "<error>"

    Examples:
      | command      | error                       |
      | wallet-balance | wallet backend unavailable |
      | wallet-sweep   | sweep failed               |
      | send-bch       | insufficient funds         |
      | send-tokens    | no matching token          |
      | msg-sign       | signing failed             |

  Scenario: CLI JSON Output - 12 human mode keeps the existing readable output
    Given the CLI command "wallet-list"
    And a wallet store holding the wallet "savings" described as "long term"
    When the CLI command runs in human mode
    Then the exit code is 0
    And stdout contains "savings"
    And stdout is not JSON

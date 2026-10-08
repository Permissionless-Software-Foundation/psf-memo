# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T03:44:07.251675344Z","feature_name":"Secret Hygiene","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/secret-hygiene.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Secret Hygiene - 1, Secret Hygiene - 2, Secret Hygiene - 3
#
# X3: no psf-memo-cli command prints a mnemonic, a WIF private key, or the raw
# wallet JSON. The wallet-sweep success output reports the swept transaction
# without echoing the key, wallet-list reports only the public name and
# description, and a wallet-relative memo command's --json result carries only
# public data. Key material stays in the wallet file and in the resolved wallet
# object; it never reaches stdout or stderr.
Feature: Secret Hygiene

  Scenario Outline: Secret Hygiene - 1 a wallet sweep does not echo the swept private key
    Given a wallet sweep of the WIF "<wif>" reports the transaction id "<txid>"
    When the wallet-sweep command runs
    Then the wallet-sweep output does not contain "<wif>"
    And the wallet-sweep output contains the transaction id "<txid>"

    Examples:
      | wif                                                  | txid                                                             |
      | Kzq8EEyjkXGzDmBbWxHWY8bxayxXawVDmrnmgq7JQmhRgMCrorfj | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef |
      | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1 | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 |

  Scenario Outline: Secret Hygiene - 2 a wallet-relative JSON result omits the wallet secret
    Given a wallet-relative memo command resolves the WIF "<wif>"
    When the wallet-relative command runs in JSON mode
    Then the JSON result does not contain "<wif>"
    And the JSON result does not contain "mnemonic"

    Examples:
      | wif                                                  |
      | Kzq8EEyjkXGzDmBbWxHWY8bxayxXawVDmrnmgq7JQmhRgMCrorfj |
      | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1 |

  Scenario Outline: Secret Hygiene - 3 listing wallets reports only public metadata
    Given a wallet store holding a wallet named "<name>" with the mnemonic "<mnemonic>"
    When the wallet-list command runs
    Then the wallet-list output does not contain "<mnemonic>"
    And the wallet-list output contains "<name>"

    Examples:
      | name     | mnemonic                                                                                    |
      | savings  | abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about |
      | spending | legal winner thank year wave sausage worth useful legal winner thank yellow                 |

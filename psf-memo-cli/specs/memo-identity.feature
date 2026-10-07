# Memo Identity (R15): the psf-memo-cli command that reports the wallet's own
# Memo identity. It resolves the signing wallet (-n <wallet> or --wif <wif>),
# derives the wallet's cash address, summarizes its BCH and SLP token balances,
# and reads the address's Memo name (0x6d01), profile text (0x6d05), and avatar
# URL (0x6d0a) from psf-memo-db. A missing profile resource reports an empty
# field rather than failing; a memo-db transport failure is reported as an
# error. Read-only: it never broadcasts. Wallet source resolution is shared
# with the write commands (F2 wallet-source).
#
# Scenarios: Memo Identity - 1, Memo Identity - 2, Memo Identity - 3, Memo Identity - 4, Memo Identity - 5, Memo Identity - 6
Feature: Memo Identity

  Background:
    Given a Memo identity command

  Scenario: Memo Identity - 1 a missing wallet source is a usage error
    Given no wallet source is given
    When the memo-identity command runs
    Then the memo-identity command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Identity - 2 the command reports the wallet's address and BCH balance
    Given a wallet with the address "<addr>" and BCH UTXOs totaling <sats> satoshis
    When the memo-identity command runs
    Then the command reported the address "<addr>"
    And the command reported the BCH balance <bch>

    Examples:
      | addr  | sats      | bch        |
      | addrA | 100000000 | 1          |
      | addrB | 123456789 | 1.23456789 |
      | addrC | 0         | 0          |

  Scenario Outline: Memo Identity - 3 the command reports the wallet's SLP token balances
    Given a wallet with the address "<addr>" and token UTXOs "<utxos>"
    When the memo-identity command runs
    Then the command reported the token balances "<balances>"

    Examples:
      | addr  | utxos                | balances      |
      | addrA | TKN:100,TKN:50       | TKN:150       |
      | addrB | AAA:10,BBB:5         | AAA:10, BBB:5 |
      | addrC | CCC:25,CCC:25,CCC:25 | CCC:75        |

  Scenario Outline: Memo Identity - 4 the command reports the address's Memo profile
    Given a wallet with the address "<addr>"
    Given the Memo DB service serves name "<name>", profile text "<bio>", and avatar "<url>" for "<addr>"
    When the memo-identity command runs
    Then the command reported the identity name "<name>", bio "<bio>", and avatar "<url>"

    Examples:
      | addr  | name  | bio        | url                   |
      | addrA | alice | hello memo | https://example/a.png |
      | addrB | bob   | second bio | https://example/b.png |

  Scenario: Memo Identity - 5 a wallet address with no profile reports empty fields
    Given a wallet with the address "addrA"
    Given the Memo DB service has no name, profile text, or avatar for "addrA"
    When the memo-identity command runs
    Then the command reported unset profile fields

  Scenario: Memo Identity - 6 a failed profile request reports the error
    Given a wallet with the address "addrA"
    Given the Memo DB service fails the identity profile request
    When the memo-identity command runs
    Then the memo-identity command reported an error

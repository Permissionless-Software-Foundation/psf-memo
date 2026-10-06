# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-06T23:54:39.353565728Z","feature_name":"CLI Output Contract","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/cli-output-contract.feature","background_hash":"c6b86bc865e53399ed6e0ffd3bbc034e4e3c4101bb8ac375267d90ccf00cac34","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: CLI Output Contract - 1, CLI Output Contract - 2, CLI Output Contract - 3, CLI Output Contract - 4, CLI Output Contract - 5
# F5: the shared output and exit-code contract that every memo-* command
# adopts through one reporter. In human mode a command prints a readable result
# to stdout; with --json it prints exactly one JSON object to stdout. A failure
# reports the real error on stderr, never on stdout, so an agent can parse
# stdout unambiguously. Exit codes are 0 for success, 1 for a runtime/execution
# failure, and 2 for a usage failure (a missing required flag). Diagnostics
# always go to stderr. Unknown-option handling is deferred to a later hardening
# item.
Feature: CLI Output Contract

  Background:
    Given a CLI command

  Scenario Outline: CLI Output Contract - 1 a successful command exits 0 and reports on stdout
    Given the command has a result with the message "<message>"
    When the command runs in human mode
    Then the exit code is 0
    Then stdout contains "<message>"
    And stdout is not JSON
    And stderr is empty

    Examples:
      | message             |
      | hello from psf memo |
      | a second result     |

  Scenario Outline: CLI Output Contract - 2 a successful command in JSON mode writes one JSON object to stdout
    Given the command has a result with the message "<message>"
    When the command runs in JSON mode
    Then the exit code is 0
    Then stdout is a single JSON object
    And the JSON output has the message "<message>"
    And stderr is empty

    Examples:
      | message             |
      | hello from psf memo |
      | a second result     |

  Scenario Outline: CLI Output Contract - 3 a command that fails exits 1 and reports on stderr
    Given the command fails with the error "<error>"
    When the command runs in human mode
    Then the exit code is 1
    Then stderr contains "<error>"
    And stdout is empty

    Examples:
      | error            |
      | broadcast failed |
      | request timed out |

  Scenario Outline: CLI Output Contract - 4 a command that fails in JSON mode writes one JSON error to stderr
    Given the command fails with the error "<error>"
    When the command runs in JSON mode
    Then the exit code is 1
    Then stderr is a single JSON object
    And the JSON error has the message "<error>"
    And stdout is empty

    Examples:
      | error            |
      | broadcast failed |
      | request timed out |

  Scenario Outline: CLI Output Contract - 5 a missing required flag exits 2 as a usage error
    Given the command rejects the flags with the error "<error>"
    When the command runs in human mode
    Then the exit code is 2
    Then stderr contains "<error>"
    And stdout is empty

    Examples:
      | error                                          |
      | You must specify a wallet name with the -n flag. |
      | You must specify a receiver address with the -a flag. |

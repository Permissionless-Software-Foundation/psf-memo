/*
  Shared dependency wiring for command classes.

  The wallet, send, and signing commands all capture the reporter streams,
  inject a small set of collaborators, and bind their methods so commander can
  dispatch them. This module owns that wiring, plus the shared wallet resolver,
  so each command constructor declares only its own collaborators.
*/

// Local libraries
import WalletUtil from './wallet-util.js'
import { bindMethods } from './bind-methods.js'

// Assign the reporter streams and the command's injected collaborators, then
// bind `run`, `validateFlags`, and the command's own methods to the command.
export function initCommand (command, { stdout, stderr } = {}, methods = [], deps = {}) {
  command.stdout = stdout
  command.stderr = stderr
  Object.assign(command, deps)

  bindMethods(command, ['run', 'validateFlags', ...methods])

  return command
}

// Wire a wallet command: like initCommand, but the shared wallet resolver is
// defaulted from the command's options.
export function initWalletCommand (command, { walletUtil, ...options } = {}, methods = [], deps = {}) {
  return initCommand(command, options, methods, {
    walletUtil: walletUtil || new WalletUtil(),
    ...deps
  })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:41:00.293Z","module_hash":"286933f9eb969de7885a46c3cea6d0640a1b20792b3cfa81e27c7aee0d49792a","functions":[{"id":"func/initCommand","name":"initCommand","line":16,"end_line":24,"hash":"0509e976131c3112a2cd654ecf1c73a3eba95efd51c0b373f842f2d51166f8a5"},{"id":"func/initWalletCommand","name":"initWalletCommand","line":28,"end_line":33,"hash":"801df140e7f6dee8cb3cb27c8162deb58367ee6b95d130b7c189cf291e281d92"}]}
// mutate4javascript-manifest-end

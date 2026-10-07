/*
  Shared runner and assertions for read-command Gherkin steps.

  Runs a read command class in JSON mode against the scenario world's fake
  service and records its exit code, streams, and parsed JSON on the world
  under the given field prefix (e.g. "feed" or "thread"). Resetting
  process.exitCode keeps the generated acceptance process from being left with
  a failing code. The error helpers read the same prefixed fields so every read
  feature asserts failures the same way.
*/

// Local libraries
import { captureStream } from '../../test/support/capture.js'
import { assertEqual } from './step-support.js'

export async function runReadCommand (world, CommandClass, prefix, flags = {}, options = {}) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new CommandClass({
    fetchImpl: world.fetch,
    envUrl: null,
    ...options,
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  world[`${prefix}ExitCode`] = await command.run({ json: true, ...flags })
  process.exitCode = 0

  world[`${prefix}Stdout`] = stdout.text()
  world[`${prefix}Stderr`] = stderr.text()
  world[`${prefix}Json`] = null
  try {
    world[`${prefix}Json`] = JSON.parse(world[`${prefix}Stdout`])
  } catch (err) {
    world[`${prefix}Json`] = null
  }
}

// Parse the JSON error a read command wrote to stderr.
export function parseStderrError (world, prefix) {
  const stderr = world[`${prefix}Stderr`]
  try {
    return JSON.parse(stderr)
  } catch (err) {
    throw new Error(`Expected a JSON error on stderr, got "${stderr}"`)
  }
}

// Assert a read command exited 1 with a "not found" error.
export function assertNotFound (world, prefix, name) {
  assertEqual(world[`${prefix}ExitCode`], 1, `${name} exit code`)
  const error = parseStderrError(world, prefix).error || ''
  if (!error.toLowerCase().includes('not found')) {
    throw new Error(`Expected a not-found error, got "${error}"`)
  }
}

// Assert a read command exited 1 with some error message.
export function assertReadCommandError (world, prefix, name) {
  assertEqual(world[`${prefix}ExitCode`], 1, `${name} exit code`)
  if (!parseStderrError(world, prefix).error) {
    throw new Error(`Expected an error message on stderr, got "${world[`${prefix}Stderr`]}"`)
  }
}

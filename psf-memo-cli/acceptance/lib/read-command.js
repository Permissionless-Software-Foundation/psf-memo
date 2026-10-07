/*
  Shared runner for read-command Gherkin steps.

  Runs a read command class in JSON mode against the scenario world's fake
  service and records its exit code, streams, and parsed JSON on the world
  under the given field prefix (e.g. "feed" or "thread"). Resetting
  process.exitCode keeps the generated acceptance process from being left with
  a failing code.
*/

// Local libraries
import { captureStream } from '../../test/support/capture.js'

export async function runReadCommand (world, CommandClass, prefix, flags = {}) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new CommandClass({
    fetchImpl: world.fetch,
    envUrl: null,
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

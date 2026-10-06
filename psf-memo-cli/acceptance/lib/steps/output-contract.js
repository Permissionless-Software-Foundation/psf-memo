/*
  Gherkin step handlers for the CLI output-contract feature.

  Each scenario builds a command outcome, runs it through the real reporter,
  and asserts on the captured exit code, stdout, and stderr, so the contract is
  exercised end to end without a real terminal.
*/

// Local libraries
import { runCommand } from '../../../src/lib/reporter.js'
import { captureStream } from '../../../test/support/capture.js'
import { resolveParam } from '../step-support.js'

// Parse one line of text as a single JSON object, or throw a clear failure.
function parseSingleJsonObject (text, label) {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed.split('\n').length !== 1) {
    throw new Error(`Expected ${label} to be a single JSON object, got "${text}"`)
  }

  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch (err) {
    throw new Error(`Expected ${label} to be JSON, got "${text}"`)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected ${label} to be a JSON object, got "${text}"`)
  }

  return parsed
}

// Build a handler that reads one JSON field from a captured stream and checks
// it against the value from the current example row.
function jsonFieldHandler ({ name, pattern, field, label, read }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      const parsed = parseSingleJsonObject(read(world), label)
      const expected = resolveParam(m[1], example)
      if (parsed[field] !== expected) {
        throw new Error(`Expected JSON ${field} "${expected}", got "${parsed[field]}"`)
      }
    }
  }
}

// Run the scenario's command through the real reporter and capture its output.
async function runReporterCommand (world) {
  const stdout = captureStream()
  const stderr = captureStream()

  world.exitCode = await runCommand(world.command, {
    json: world.json,
    stdout: stdout.stream,
    stderr: stderr.stream
  })
  world.stdoutText = stdout.text()
  world.stderrText = stderr.text()
}

const outputContractHandlers = [
  {
    name: 'a CLI command',
    pattern: /^a CLI command$/,
    run (m, example, world) {
      world.json = false
      world.outcome = null
      world.exitCode = null
      world.stdoutText = ''
      world.stderrText = ''
    }
  },
  {
    name: 'command has a result',
    pattern: /^the command has a result with the message "(.+)"$/,
    run (m, example, world) {
      world.outcome = { type: 'result', message: resolveParam(m[1], example) }
    }
  },
  {
    name: 'command fails',
    pattern: /^the command fails with the error "(.+)"$/,
    run (m, example, world) {
      world.outcome = { type: 'error', message: resolveParam(m[1], example) }
    }
  },
  {
    name: 'command rejects the flags',
    pattern: /^the command rejects the flags with the error "(.+)"$/,
    run (m, example, world) {
      world.outcome = { type: 'usage', message: resolveParam(m[1], example) }
    }
  },
  {
    name: 'runs in human mode',
    pattern: /^the command runs in human mode$/,
    async run (m, example, world) {
      world.json = false
      await runReporterCommand(world)
    }
  },
  {
    name: 'runs in JSON mode',
    pattern: /^the command runs in JSON mode$/,
    async run (m, example, world) {
      world.json = true
      await runReporterCommand(world)
    }
  },
  {
    name: 'exit code is',
    pattern: /^the exit code is (.+)$/,
    run (m, example, world) {
      const expected = Number.parseInt(resolveParam(m[1], example), 10)
      if (world.exitCode !== expected) {
        throw new Error(`Expected exit code ${expected}, got ${world.exitCode}`)
      }
    }
  },
  {
    name: 'stdout contains',
    pattern: /^stdout contains "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (!world.stdoutText.includes(expected)) {
        throw new Error(`Expected stdout to contain "${expected}", got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'stdout is not JSON',
    pattern: /^stdout is not JSON$/,
    run (m, example, world) {
      let isJson = true
      try {
        JSON.parse(world.stdoutText)
      } catch (err) {
        isJson = false
      }
      if (isJson) {
        throw new Error(`Expected stdout not to be JSON, got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'stderr is empty',
    pattern: /^stderr is empty$/,
    run (m, example, world) {
      if (world.stderrText !== '') {
        throw new Error(`Expected stderr to be empty, got "${world.stderrText}"`)
      }
    }
  },
  {
    name: 'stdout is a single JSON object',
    pattern: /^stdout is a single JSON object$/,
    run (m, example, world) {
      parseSingleJsonObject(world.stdoutText, 'stdout')
    }
  },
  jsonFieldHandler({
    name: 'JSON output has the message',
    pattern: /^the JSON output has the message "(.+)"$/,
    field: 'message',
    label: 'stdout',
    read: (world) => world.stdoutText
  }),
  {
    name: 'stdout is empty',
    pattern: /^stdout is empty$/,
    run (m, example, world) {
      if (world.stdoutText !== '') {
        throw new Error(`Expected stdout to be empty, got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'stderr contains',
    pattern: /^stderr contains "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (!world.stderrText.includes(expected)) {
        throw new Error(`Expected stderr to contain "${expected}", got "${world.stderrText}"`)
      }
    }
  },
  {
    name: 'stderr is a single JSON object',
    pattern: /^stderr is a single JSON object$/,
    run (m, example, world) {
      parseSingleJsonObject(world.stderrText, 'stderr')
    }
  },
  jsonFieldHandler({
    name: 'JSON error has the message',
    pattern: /^the JSON error has the message "(.+)"$/,
    field: 'error',
    label: 'stderr',
    read: (world) => world.stderrText
  })
]

export { outputContractHandlers }

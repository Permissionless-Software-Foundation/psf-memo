/*
  Shared output and exit-code contract for psf-memo-cli commands.

  Human mode prints a readable result to stdout. JSON mode prints exactly one
  JSON object to stdout. A failure reports the real error on stderr -- as one
  JSON object in JSON mode -- so an agent can parse stdout unambiguously.
  Diagnostics always go to stderr.

  Exit codes: 0 success, 1 runtime failure, 2 usage (flag validation) failure.
  `runCommand` returns the code; the command assigns it to process.exitCode.
*/

export const EXIT_SUCCESS = 0
export const EXIT_FAILURE = 1
export const EXIT_USAGE = 2

// A flag-validation failure, reported as a usage error (exit 2).
export class UsageError extends Error {
  constructor (message) {
    super(message)
    this.name = 'UsageError'
  }
}

export class Reporter {
  constructor ({ json = false, stdout = process.stdout, stderr = process.stderr } = {}) {
    this.json = json
    this.stdout = stdout
    this.stderr = stderr
  }

  // Report a successful result on stdout and return the success exit code.
  result (message = '', data = {}) {
    return this.write(this.stdout, message, { message, ...data }, EXIT_SUCCESS)
  }

  // Report a runtime failure on stderr and return the failure exit code.
  fail (error) {
    return this.write(this.stderr, error.message, { error: error.message }, EXIT_FAILURE)
  }

  // Report a usage failure on stderr and return the usage exit code.
  usage (error) {
    return this.write(this.stderr, error.message, { error: error.message }, EXIT_USAGE)
  }

  // Write one line -- plain text or a JSON object -- then return the code.
  write (stream, text, value, code) {
    stream.write(`${this.json ? JSON.stringify(value) : text}\n`)
    return code
  }
}

// Run an async command and report its outcome. The command returns
// { message, data } (or nothing). A UsageError exits 2; any other error exits
// 1. Callers assign the returned code to process.exitCode.
export async function runCommand (command, { json = false, stdout = process.stdout, stderr = process.stderr } = {}) {
  const reporter = new Reporter({ json, stdout, stderr })
  try {
    const outcome = await command()
    return reporter.result(outcome?.message, outcome?.data)
  } catch (err) {
    if (err instanceof UsageError) return reporter.usage(err)
    return reporter.fail(err)
  }
}

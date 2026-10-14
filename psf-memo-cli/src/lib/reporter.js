/*
  Shared output and exit-code contract for psf-memo-cli commands.

  Human mode prints a readable result to stdout. JSON mode prints exactly one
  JSON object to stdout. A failure reports the real error on stderr -- as one
  JSON object in JSON mode -- so an agent can parse stdout unambiguously.
  Diagnostics always go to stderr.

  Exit codes: 0 success, 1 runtime failure, 2 usage (flag validation) failure.
  `runCommand` returns the code; the command assigns it to process.exitCode.
*/

// Local libraries
import { withWalletBanner } from './wallet-banner.js'

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
    // The wallet library logs its initialization banner with console.log while
    // it constructs a wallet; keep that banner off stdout.
    const outcome = await withWalletBanner({ json, stderr }, command)
    return reporter.result(outcome?.message, outcome?.data)
  } catch (err) {
    if (err instanceof UsageError) return reporter.usage(err)
    return reporter.fail(err)
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-12T23:45:42.536Z","module_hash":"a43235d2de8caa203f01158ed2989768fc8512f6ed81fdbcaa7bf9081848b19b","functions":[{"id":"func/UsageError.constructor","name":"UsageError.constructor","line":22,"end_line":25,"hash":"8dd59b4e75b74d28381adb9a4a62d605f97da81a94d4ad366370e94053a74020"},{"id":"func/Reporter.constructor","name":"Reporter.constructor","line":29,"end_line":33,"hash":"def1c246b442c57c9e5ef356682a5a0956ac4c1766b258945354462e20264de9"},{"id":"func/Reporter.result","name":"Reporter.result","line":36,"end_line":38,"hash":"cb24f0734095d81ac1c1d16cbfdc1cb62057c7bb64a5c2745ceee764475d40c6"},{"id":"func/Reporter.fail","name":"Reporter.fail","line":41,"end_line":43,"hash":"46c8a9970385a4adeb77e8ad8a3059e1bc77895e9250c9f4537fb30b33e93bf3"},{"id":"func/Reporter.usage","name":"Reporter.usage","line":46,"end_line":48,"hash":"949b27226d654aa40a6565975ec4bcd38e82da3dd62940f1e43f9c807131d380"},{"id":"func/Reporter.write","name":"Reporter.write","line":51,"end_line":54,"hash":"fc026e018fae418d3e368b93de4b7275dbdfe9a0dc168cefdd14a8c67f48e82e"},{"id":"func/runCommand","name":"runCommand","line":60,"end_line":71,"hash":"414d5b56aaaadaadbeaeafa14bb0fa03667446fcbb54a9abbfd9bc4bc248a05c"}]}
// mutate4javascript-manifest-end

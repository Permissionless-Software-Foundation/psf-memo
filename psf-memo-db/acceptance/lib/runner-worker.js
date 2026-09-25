/*
  Persistent runner adapter for the APS gherkin-mutator (psf-memo-db).

  The mutator starts this process (once per worker) and sends mutation jobs
  over newline-delimited JSON on stdin. Each job carries the path to a mutated
  feature JSON IR; this worker evaluates it through the same acceptance runtime
  and step handlers used by the normal acceptance pipeline and replies with the
  runner outcome.

  Protocol (mutator-spec.md):
    request:  { "id", "feature_json", "generated_dir", "work_dir" }
    response: { "id", "outcome", "output", "error", "duration" }
      outcome: test_success | test_failure | infrastructure_error

  test_failure (acceptance failed) -> mutation killed
  test_success (acceptance passed) -> mutation survived

  stdout is reserved for JSON responses. The db libraries (config, adapters)
  log to stdout via console.log, so that logging is redirected to stderr below;
  otherwise the mutator would read non-JSON lines as worker responses.
*/

import readline from 'node:readline'
import fs from 'node:fs'
import path from 'node:path'

// stdout is the worker protocol channel. Libraries loaded by the acceptance
// runtime (config, and wlogger's winston Console transport that writes through
// console._stdout) also write to stdout, so the mutator's first readLine would
// see a log line like "info: ..." instead of JSON and report every mutation as
// an infrastructure error. Route every stdout write except the worker's own
// JSON responses to stderr: capture the real stdout writer, then replace it.
const protocolWrite = process.stdout.write.bind(process.stdout)
process.stdout.write = (...args) => process.stderr.write(...args)
console.log = (...args) => console.error('[worker]', ...args)

const { runFeature } = await import('./runtime.js')

// A gherkin mutation changes one example value in one scenario. Every scenario
// runs in its own isolated LevelDB world, so the other scenarios cannot be
// affected by the mutation. Narrow the IR to the changed scenario/example so a
// mutant does not re-run the whole feature. Falls back to the full IR when the
// base feature is missing or its shape differs.
function narrowToChanged (ir, basePath) {
  try {
    const base = JSON.parse(fs.readFileSync(basePath, 'utf8'))
    if (!base || !Array.isArray(base.scenarios) || base.scenarios.length !== ir.scenarios.length) return ir

    for (let i = 0; i < ir.scenarios.length; i++) {
      const scenario = ir.scenarios[i]
      const original = base.scenarios[i]
      if (JSON.stringify(scenario) === JSON.stringify(original)) continue

      const examples = Array.isArray(scenario.examples) ? scenario.examples : []
      const originalExamples = Array.isArray(original.examples) ? original.examples : []
      if (examples.length === originalExamples.length) {
        const changed = examples.filter((ex, j) => JSON.stringify(ex) !== JSON.stringify(originalExamples[j]))
        if (changed.length > 0) {
          return { ...ir, scenarios: [{ ...scenario, examples: changed }] }
        }
      }
      return { ...ir, scenarios: [scenario] }
    }
    return ir
  } catch (err) {
    return ir
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

rl.on('line', async (line) => {
  const started = Date.now()
  const respond = (payload) => {
    protocolWrite(`${JSON.stringify(payload)}\n`)
  }

  let job
  try {
    job = JSON.parse(line)
  } catch (err) {
    respond({ id: 'unknown', outcome: 'infrastructure_error', output: '', error: `bad job: ${err.message}`, duration: Date.now() - started })
    return
  }

  try {
    const ir = JSON.parse(fs.readFileSync(job.feature_json, 'utf8'))
    // The mutated feature lives at <work>/mutations/<id>/feature.json, so the
    // base feature is two levels up. Do not trust job.work_dir (the mutator may
    // pass the mutation-specific directory).
    const basePath = path.resolve(path.dirname(job.feature_json), '..', '..', 'base', 'feature.json')
    const narrowed = narrowToChanged(ir, basePath)
    const report = await runFeature(narrowed)
    respond({
      id: job.id,
      outcome: report.failures === 0 ? 'test_success' : 'test_failure',
      output: report.results.map((r) => `${r.status} ${r.name}`).join('\n'),
      error: '',
      duration: Date.now() - started
    })
  } catch (err) {
    respond({
      id: job.id,
      outcome: 'infrastructure_error',
      output: '',
      error: err.message,
      duration: Date.now() - started
    })
  }
})

rl.on('close', () => {
  process.exit(0)
})

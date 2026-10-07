/*
  Shared Gherkin result assertions for read commands.

  `runReadCommand` records the parsed stdout under a generic `world.readJson` in
  addition to the feature's prefixed field, so a step shape shared by several
  read features can assert against it without knowing which feature ran.
*/

// Local libraries
import { assertEqual, resolveParam } from '../step-support.js'

const readResultHandlers = [
  {
    name: 'command reported pagination',
    pattern: /^the command reported pagination total (.+) and hasMore (.+)$/,
    run (m, example, world) {
      const pagination = world.readJson?.pagination || {}
      assertEqual(pagination.total, Number.parseInt(resolveParam(m[1], example), 10), 'pagination total')
      assertEqual(pagination.hasMore, resolveParam(m[2], example) === 'true', 'pagination hasMore')
    }
  }
]

export { readResultHandlers }

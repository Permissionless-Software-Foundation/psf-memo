/*
  Shared deterministic clock for the memo-wait tests.

  `sleep` records each delay it is asked to wait and advances `now` by the same
  amount, so the poll loop can be exercised without any real time passing.
*/

export function fakeClock () {
  let current = 0
  const delays = []
  return {
    delays,
    now: () => current,
    sleep: async (ms) => {
      delays.push(ms)
      current += ms
    }
  }
}

/*
  Bind an object's methods to itself so they can be passed as callbacks (for
  example, to commander.js) without losing `this`.
*/

// Bind each named method on target to target, then return target.
export function bindMethods (target, names) {
  for (const name of names) {
    target[name] = target[name].bind(target)
  }

  return target
}

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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:50:29.839Z","module_hash":"3bfdde87ba21a5b8e4e683191fd8231739b6b39eb3a323e9ac916cf4178bd45c","functions":[{"id":"func/bindMethods","name":"bindMethods","line":7,"end_line":13,"hash":"f8a1a2121c972704e53903e3f8fe38df6fd3483938f388ee1cc101ac27c91e17"}]}
// mutate4javascript-manifest-end

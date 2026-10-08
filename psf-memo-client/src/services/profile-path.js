/*
  Canonical /profile/:addr route path.

  The account sidebar, recent profiles table, and notification entries all link
  to a profile, so the path builder (including URL-encoding the address) lives
  here once. Kept as a small pure service so the callers and the Node
  acceptance renderer share the same route format.
*/

const PROFILE_PATH_PREFIX = '/profile'

// The /profile/:addr path for an address, with the address URL-encoded.
function profilePath (addr) {
  return `${PROFILE_PATH_PREFIX}/${encodeURIComponent(addr)}`
}

module.exports = { profilePath, PROFILE_PATH_PREFIX }

/*
  Shared scenario helpers and steps for the Memo identity resources (name,
  profile text, and avatar) that memo-identity and memo-profile both serve and
  assert. The steps read the generic `world.readJson` alias so they work for
  either read command.
*/

// Local libraries
import { assertEqual, resolveParam } from '../step-support.js'

// Store the address's name, profile text, and avatar so the fake fetch serves
// them.
function storeIdentity (world, addr, { name, bio, avatar }) {
  world.nameStore[addr] = { addr, name }
  world.profileStore[addr] = { addr, text: bio }
  world.profilePicStore[addr] = { addr, url: avatar }
}

// The two features word this step differently and order the address capture
// differently, so match either form and read the named captures.
const SERVE_PROFILE =
  /^the Memo DB service serves (?:the profile "(?<pAddr>[^"]+)" with name "(?<pName>[^"]+)", bio "(?<pBio>[^"]+)", and avatar "(?<pAvatar>[^"]+)"|name "(?<iName>[^"]+)", profile text "(?<iBio>[^"]+)", and avatar "(?<iAvatar>[^"]+)" for "(?<iAddr>[^"]+)")$/

const identityHandlers = [
  {
    name: 'service serves an identity profile',
    pattern: SERVE_PROFILE,
    run (m, example, world) {
      const captures = m.groups
      storeIdentity(world, resolveParam(captures.pAddr ?? captures.iAddr, example), {
        name: resolveParam(captures.pName ?? captures.iName, example),
        bio: resolveParam(captures.pBio ?? captures.iBio, example),
        avatar: resolveParam(captures.pAvatar ?? captures.iAvatar, example)
      })
    }
  },
  {
    name: 'service has no identity profile',
    pattern: /^the Memo DB service has no (?:profile for|name, profile text, or avatar for) "([^"]+)"$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      world.nameStore[addr] = null
      world.profileStore[addr] = null
      world.profilePicStore[addr] = null
    }
  },
  {
    name: 'command reported the identity profile',
    pattern: /^the command reported the (?:profile )?identity name "(.+)", bio "(.+)", and avatar "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.readJson?.name, resolveParam(m[1], example), 'name', { quote: true })
      assertEqual(world.readJson?.bio, resolveParam(m[2], example), 'bio', { quote: true })
      assertEqual(world.readJson?.avatar, resolveParam(m[3], example), 'avatar', { quote: true })
    }
  }
]

export { identityHandlers }

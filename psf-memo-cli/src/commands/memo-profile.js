/*
  memo-profile: read a composed profile for a target address.

  For a target address (-a <addr>) it reports the address's Memo name (0x6d01),
  profile text (0x6d05), and avatar URL (0x6d0a) from the /level resources, plus
  one page of the address's top-level posts and the service pagination
  unchanged. When an optional --viewer <addr> is supplied it also reports
  whether that viewer follows the address; without a viewer the follow state is
  not-followed. A missing -a is a usage error (exit 2); a failed request is an
  error (exit 1). Read-only: no wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseProfileFlags, formatProfileMessage } from '../lib/memo-profile.js'

// Read the viewer's follow state for the address. Without a viewer the profile
// is simply not followed.
async function resolveFollowing (client, viewer, address) {
  if (!viewer) return false

  const state = await client.getFollowState(viewer, address)
  return state?.following === true
}

// An identity document field, or an empty string when the document is missing.
function identityField (doc, field) {
  return doc?.[field] || ''
}

class MemoProfile {
  constructor (options = {}) {
    initReadCommand(this, options, 'readComposedProfile')
  }

  // Read and report the composed profile. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { address, viewer, limit, offset } = this.validateFlags(flags)

        const profile = await this.readComposedProfile({
          client: this.createClient(flags.dbUrl),
          address,
          viewer,
          limit,
          offset
        })

        return {
          message: formatProfileMessage(profile),
          data: profile
        }
      }
    })
  }

  // Validate and resolve the required address, optional viewer, and page flags
  // before any request. Throws a UsageError (exit 2) when they are invalid.
  validateFlags (flags) {
    return parseProfileFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Read the identity, post page, and optional viewer follow state in one pass.
  // Missing identity resources report empty fields; the follow state defaults to
  // false without a viewer.
  async readComposedProfile ({ client, address, viewer, limit, offset }) {
    const [nameDoc, profileDoc, avatarDoc, page] = await Promise.all([
      client.getName(address),
      client.getProfile(address),
      client.getProfilePic(address),
      client.getPostsByAddr(address, { limit, offset })
    ])

    const following = await resolveFollowing(client, viewer, address)

    return {
      address,
      name: identityField(nameDoc, 'name'),
      bio: identityField(profileDoc, 'text'),
      avatar: identityField(avatarDoc, 'url'),
      posts: page.posts || [],
      pagination: page.pagination || {},
      following
    }
  }
}

export default MemoProfile

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end

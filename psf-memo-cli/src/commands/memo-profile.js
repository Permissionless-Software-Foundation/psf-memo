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
// {"version":1,"tested_at":"2026-10-08T14:10:14.361Z","module_hash":"c0f8bb2fd3566f0c97a76e63f1df2b740702a41c6be0ba8ffe829b2f923f4f99","functions":[{"id":"func/resolveFollowing","name":"resolveFollowing","line":19,"end_line":24,"hash":"2aa1a4d585b7699d9caebfe583b6e5b469474bd6e6e3b5cd9383493e5165e196"},{"id":"func/identityField","name":"identityField","line":27,"end_line":29,"hash":"17291aa6d003b0350964e12019a8324d20674b68a44ae4a2c8b185615afc7ada"},{"id":"func/MemoProfile.constructor","name":"MemoProfile.constructor","line":32,"end_line":34,"hash":"a382b156ce811520a0b50db2f7be0ee9567c6edce05cbbeff006973b42779ab3"},{"id":"func/MemoProfile.run","name":"MemoProfile.run","line":38,"end_line":59,"hash":"a498c4f972e99cd8bf78f8e979bee341222735c4d1bc6752c854fbdb14994c04"},{"id":"func/MemoProfile.validateFlags","name":"MemoProfile.validateFlags","line":63,"end_line":65,"hash":"2d151d334822c0f7ce16b5e4035a540c6972cd9455859f3fc16fa442f0f7eacc"},{"id":"func/MemoProfile.createClient","name":"MemoProfile.createClient","line":68,"end_line":70,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoProfile.readComposedProfile","name":"MemoProfile.readComposedProfile","line":75,"end_line":94,"hash":"d2db9b524b6bf5f2602cd5e5efc647a0664c5e4fe9dd6024df623011e57a8db9"}]}
// mutate4javascript-manifest-end

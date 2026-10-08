/*
  memo-followers: read the addresses that follow a target address.

  A read-only command for the psf-memo-db GET /follow/followers/:addr route. The
  followee address comes from the required -a flag; it reports the returned
  follower cash addresses. The list is unpaginated. A missing -a is a usage
  error (exit 2); a failed request is an error (exit 1). No wallet and no
  broadcast.
*/

// Local libraries
import { ListReadCommand } from '../lib/list-command.js'
import { parseFollowersFlags, formatFollowListMessage } from '../lib/follow-list.js'

class MemoFollowers extends ListReadCommand {
  constructor (options = {}) {
    super(options, 'readFollowers')
  }

  // Validate and resolve the required followee address before any request.
  // Throws a UsageError (exit 2) when it is missing.
  parseFlags (flags) {
    return parseFollowersFlags(flags)
  }

  // Render the reported follower addresses.
  format ({ followers = [] }) {
    return {
      message: formatFollowListMessage(followers, 'follower'),
      data: { followers }
    }
  }

  // Fetch the addresses that follow the followee.
  readFollowers ({ address, dbUrl }) {
    return this.createClient(dbUrl).getFollowers(address)
  }
}

export default MemoFollowers

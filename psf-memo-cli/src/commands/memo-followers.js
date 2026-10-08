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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:45:32.388Z","module_hash":"e7990db7e43c2553c9b497632daf70d6e1ebc938bcd9842221bf0b987fd2fd78","functions":[{"id":"func/MemoFollowers.constructor","name":"MemoFollowers.constructor","line":16,"end_line":18,"hash":"a773e9e52624e96052c6a96967cacb25279a3b8072333cf79c489ae66c801123"},{"id":"func/MemoFollowers.parseFlags","name":"MemoFollowers.parseFlags","line":22,"end_line":24,"hash":"455261eb56ab055f7198819106409665fc90c1db7cab1d06321cf00f400a7a51"},{"id":"func/MemoFollowers.format","name":"MemoFollowers.format","line":27,"end_line":32,"hash":"37f71d97530c184e3f6d5682d6c51d1b30a45dfe4302a1fa44b9ca2c6bd877a0"},{"id":"func/MemoFollowers.readFollowers","name":"MemoFollowers.readFollowers","line":35,"end_line":37,"hash":"9147d145b611e6e776077f30b7ca2693d4e68647a2fab119a3785d9510ae238c"}]}
// mutate4javascript-manifest-end

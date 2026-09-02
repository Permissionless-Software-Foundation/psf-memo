/*
  HTTP client for the psf-memo-db REST API.
*/

import axios from 'axios'
import config from '../config'

class MemoDb {
  constructor () {
    this.axios = axios
  }

  async getRecentProfiles ({ limit = 100, offset = 0 } = {}) {
    return this.getRecent('/profile/recent', 'getRecentProfiles', { limit, offset })
  }

  async getRecentPosts ({ limit = 100, offset = 0 } = {}) {
    return this.getRecent('/posts/recent', 'getRecentPosts', { limit, offset })
  }

  async getProfile (addr) {
    return this.getLevelResource('profile', addr, 'getProfile')
  }

  async getProfilePic (addr) {
    return this.getLevelResource('profilepic', addr, 'getProfilePic')
  }

  async getName (addr) {
    return this.getLevelResource('name', addr, 'getName')
  }

  async getFollowState (followerAddr, followeeAddr) {
    return this._getState('/follow/state', 'getFollowState', { follower: followerAddr, followee: followeeAddr }, 'following')
  }

  async getMuteState (muterAddr, muteeAddr) {
    return this._getState('/mute/state', 'getMuteState', { muter: muterAddr, mutee: muteeAddr }, 'muted')
  }

  async getMuted (muterAddr) {
    return this._getList(`/mute/muted/${encodeURIComponent(muterAddr)}`, 'getMuted', 'muted')
  }

  async getTopics () {
    return this.getRecent('/topics', 'getTopics', {})
  }

  async getTopicPosts (room, opts = {}) {
    return this.getPage(`/topics/${encodeURIComponent(room)}/posts`, 'getTopicPosts', opts)
  }

  async getTopicFollowState (room, addr) {
    return this._getState(`/topics/${encodeURIComponent(room)}/follow/state`, 'getTopicFollowState', { addr }, 'following')
  }

  async getTopicFollowers (room) {
    return this._getList(`/topics/${encodeURIComponent(room)}/followers`, 'getTopicFollowers', 'followers')
  }

  async search (q, { limit = 100, offset = 0 } = {}) {
    try {
      const result = await this.axios.get(`${config.backend}/search`, {
        params: { q, limit, offset }
      })

      return result.data
    } catch (err) {
      console.error('Error in search()')
      throw err
    }
  }

  // GET a boolean state endpoint and coerce the named field to a boolean.
  async _getState (path, name, params, field) {
    try {
      const result = await this.axios.get(`${config.backend}${path}`, { params })
      return result.data[field] === true
    } catch (err) {
      console.error(`Error in ${name}()`)
      throw err
    }
  }

  // GET a list endpoint and return the named array field, defaulting to [].
  async _getList (path, name, field) {
    try {
      const result = await this.axios.get(`${config.backend}${path}`)
      return result.data[field] || []
    } catch (err) {
      console.error(`Error in ${name}()`)
      throw err
    }
  }

  // GET a paginated 'recent' listing endpoint.
  async getRecent (path, name, params) {
    try {
      const result = await this.axios.get(`${config.backend}${path}`, {
        params
      })

      return result.data
    } catch (err) {
      console.error(`Error in ${name}()`)
      throw err
    }
  }

  // GET a paginated resource page at a full path.
  async getPage (path, name, { limit = 100, offset = 0 } = {}) {
    try {
      const result = await this.axios.get(`${config.backend}${path}`, {
        params: { limit, offset }
      })

      return result.data
    } catch (err) {
      console.error(`Error in ${name}()`)
      throw err
    }
  }

  // GET a level endpoint that resolves an address. Returns null on 404.
  async getLevelResource (endpoint, addr, name) {
    try {
      const result = await this.axios.get(
        `${config.backend}/level/${endpoint}/${encodeURIComponent(addr)}`
      )
      return result.data
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return null
      }
      console.error(`Error in ${name}()`)
      throw err
    }
  }

  async getPostsByAddr (addr, opts = {}) {
    return this.getPage(`/posts/by/${encodeURIComponent(addr)}`, 'getPostsByAddr', opts)
  }

  async getPostThread (txid) {
    try {
      const result = await this.axios.get(
        `${config.backend}/posts/${encodeURIComponent(txid)}/thread`
      )

      return result.data
    } catch (err) {
      console.error('Error in getPostThread()')
      throw err
    }
  }

  async getFollowingFeed (addr, opts = {}) {
    return this.getPage(`/posts/following/${encodeURIComponent(addr)}`, 'getFollowingFeed', opts)
  }
}

export default MemoDb

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T19:05:30.808Z","module_hash":"8b135684ab4778511f6dd0b6a6410bfd31d225bbcc2a1b58e37cfaa5db0de8b5","functions":[{"id":"func/MemoDb.constructor","name":"MemoDb.constructor","line":9,"end_line":11,"hash":"188825ae5983840d4e1a4df182966ef012297c336ea3b763c87ea1c384654279"},{"id":"func/MemoDb.getRecentProfiles","name":"MemoDb.getRecentProfiles","line":13,"end_line":15,"hash":"cb819c72881b70f719f964c607f64be70b40377297c738897eee495bcf6dff4d"},{"id":"func/MemoDb.getRecentPosts","name":"MemoDb.getRecentPosts","line":17,"end_line":19,"hash":"7c0fd29c2fdc67a27a05a190e2e4294a698a1fe5223d8017ca82c4f890c2d094"},{"id":"func/MemoDb.getProfile","name":"MemoDb.getProfile","line":21,"end_line":23,"hash":"6a250c7205799b40dbe97b8f17ddaee6eace8cb435b0561d9ff8f5eac93d2b20"},{"id":"func/MemoDb.getProfilePic","name":"MemoDb.getProfilePic","line":25,"end_line":27,"hash":"d61dd5aebce32ef28b69ad56f2f7108d6b5f333a4d94cd83f05f01a09fa8f1d7"},{"id":"func/MemoDb.getName","name":"MemoDb.getName","line":29,"end_line":31,"hash":"3f841735b93180c6aeeb14a563bb6d4eb0ca5d395fb960267c8896b06c1e85f3"},{"id":"func/MemoDb.getFollowState","name":"MemoDb.getFollowState","line":33,"end_line":35,"hash":"a7e0ad2336b146a0748f43f14bbcb92aa8e2dbe784b205b27ca2ae2958954e76"},{"id":"func/MemoDb.getMuteState","name":"MemoDb.getMuteState","line":37,"end_line":39,"hash":"80dc5dd85911a4088b16f4a77ce076001226f8c55dc0ce259e3a3ad63e38576d"},{"id":"func/MemoDb.getMuted","name":"MemoDb.getMuted","line":41,"end_line":43,"hash":"79d8e81b255fcb50e8974a08e429ed3ec814bbac16726af71b4d33757e0d53fa"},{"id":"func/MemoDb.getTopics","name":"MemoDb.getTopics","line":45,"end_line":47,"hash":"8d392b8a4b1bef405a9872c2564c51d9343df7b1c628d016258ee1c165f713ef"},{"id":"func/MemoDb.getTopicPosts","name":"MemoDb.getTopicPosts","line":49,"end_line":51,"hash":"4cc1e13334b5b4a2b72942cbc5f3cce8493254628f7d51da33d7be9c60ef9ff7"},{"id":"func/MemoDb.getTopicFollowState","name":"MemoDb.getTopicFollowState","line":53,"end_line":55,"hash":"d943e39339d689a241251bdfc704b1d99b65ba463a37852afbfd2dad20070a95"},{"id":"func/MemoDb.getTopicFollowers","name":"MemoDb.getTopicFollowers","line":57,"end_line":59,"hash":"95c0f5dc416b2fe974150ba5d551cb81c11400ccffe0876d82ae68c52e23e9f1"},{"id":"func/MemoDb.search","name":"MemoDb.search","line":61,"end_line":72,"hash":"541370ca00b2f5e4cb6835b0601564f0dae6199cbdaa77e9221b29f8492c4dab"},{"id":"func/MemoDb._getState","name":"MemoDb._getState","line":75,"end_line":83,"hash":"d1f571f2421e0c70795a5a12e381175c42b5d0b0c5db203ad852aeb218b40825"},{"id":"func/MemoDb._getList","name":"MemoDb._getList","line":86,"end_line":94,"hash":"11bb9f3afad183d5c37f662506d27c75e010364798f3d4b9646358165433a596"},{"id":"func/MemoDb.getRecent","name":"MemoDb.getRecent","line":97,"end_line":108,"hash":"1565fd17dced45fbf1b6d6fd6b8003521129bbd88046ff52a4eb61c17862530d"},{"id":"func/MemoDb.getPage","name":"MemoDb.getPage","line":111,"end_line":122,"hash":"986ec43d7699d642b25a9f4627aa5420cc685a247c3caa4671797778bc84e3b5"},{"id":"func/MemoDb.getLevelResource","name":"MemoDb.getLevelResource","line":125,"end_line":138,"hash":"c2fb7338918b1e69aa8a14f65ae687532c843f0641f04074947731691001e4ea"},{"id":"func/MemoDb.getPostsByAddr","name":"MemoDb.getPostsByAddr","line":140,"end_line":142,"hash":"45bbfef12cd8e35da1d71299153b2e54304664d5e3191c497f105ba17b134431"},{"id":"func/MemoDb.getPostThread","name":"MemoDb.getPostThread","line":144,"end_line":155,"hash":"ed5ef157b457f8d984ff6a9488a4dccf7a37b0ae65adb40005df90508426661f"},{"id":"func/MemoDb.getFollowingFeed","name":"MemoDb.getFollowingFeed","line":157,"end_line":159,"hash":"905b6d7c194d295070eca2eb13c11fda93392213cf2b1fd5cd994085184b8d93"}]}
// mutate4javascript-manifest-end

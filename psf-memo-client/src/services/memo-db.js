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
    try {
      const result = await this.axios.get(
        `${config.backend}/follow/state`,
        {
          params: {
            follower: followerAddr,
            followee: followeeAddr
          }
        }
      )
      return result.data.following === true
    } catch (err) {
      console.error('Error in getFollowState()')
      throw err
    }
  }

  async getTopics () {
    return this.getRecent('/topics', 'getTopics', {})
  }

  async getTopicPosts (room, { limit = 100, offset = 0 } = {}) {
    try {
      const result = await this.axios.get(
        `${config.backend}/topics/${encodeURIComponent(room)}/posts`,
        { params: { limit, offset } }
      )
      return result.data
    } catch (err) {
      console.error('Error in getTopicPosts()')
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

  async getPostsByAddr (addr, { limit = 100, offset = 0 } = {}) {
    try {
      const result = await this.axios.get(
        `${config.backend}/posts/by/${encodeURIComponent(addr)}`,
        { params: { limit, offset } }
      )

      return result.data
    } catch (err) {
      console.error('Error in getPostsByAddr()')
      throw err
    }
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
}

export default MemoDb

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T17:52:51.766Z","module_hash":"3f694a85efbd3d3d6fb3d24c8261166d36113990091680e5d11485bef973d6c9","functions":[{"id":"func/MemoDb.constructor","name":"MemoDb.constructor","line":9,"end_line":11,"hash":"188825ae5983840d4e1a4df182966ef012297c336ea3b763c87ea1c384654279"},{"id":"func/MemoDb.getRecentProfiles","name":"MemoDb.getRecentProfiles","line":13,"end_line":15,"hash":"cb819c72881b70f719f964c607f64be70b40377297c738897eee495bcf6dff4d"},{"id":"func/MemoDb.getRecentPosts","name":"MemoDb.getRecentPosts","line":17,"end_line":19,"hash":"7c0fd29c2fdc67a27a05a190e2e4294a698a1fe5223d8017ca82c4f890c2d094"},{"id":"func/MemoDb.getProfile","name":"MemoDb.getProfile","line":21,"end_line":23,"hash":"6a250c7205799b40dbe97b8f17ddaee6eace8cb435b0561d9ff8f5eac93d2b20"},{"id":"func/MemoDb.getProfilePic","name":"MemoDb.getProfilePic","line":25,"end_line":27,"hash":"d61dd5aebce32ef28b69ad56f2f7108d6b5f333a4d94cd83f05f01a09fa8f1d7"},{"id":"func/MemoDb.getName","name":"MemoDb.getName","line":29,"end_line":31,"hash":"3f841735b93180c6aeeb14a563bb6d4eb0ca5d395fb960267c8896b06c1e85f3"},{"id":"func/MemoDb.getFollowState","name":"MemoDb.getFollowState","line":33,"end_line":49,"hash":"d62eb85c742b40f2d319230c6ef59e21738063d31bccf1f37ebdc52c20bac994"},{"id":"func/MemoDb.getRecent","name":"MemoDb.getRecent","line":52,"end_line":63,"hash":"1565fd17dced45fbf1b6d6fd6b8003521129bbd88046ff52a4eb61c17862530d"},{"id":"func/MemoDb.getLevelResource","name":"MemoDb.getLevelResource","line":66,"end_line":79,"hash":"c2fb7338918b1e69aa8a14f65ae687532c843f0641f04074947731691001e4ea"},{"id":"func/MemoDb.getPostsByAddr","name":"MemoDb.getPostsByAddr","line":81,"end_line":93,"hash":"c39322f75bec244cffd3b66614ae2814040ac428cf39af53b04d3fcae4d59b19"},{"id":"func/MemoDb.getPostThread","name":"MemoDb.getPostThread","line":95,"end_line":106,"hash":"ed5ef157b457f8d984ff6a9488a4dccf7a37b0ae65adb40005df90508426661f"}]}
// mutate4javascript-manifest-end

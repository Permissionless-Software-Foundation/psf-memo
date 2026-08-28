/*
  Topic Discovery Page behavior: load and display the list of Memo topics.

  This is the testable controller behind the React "Topics" page. It wraps
  the MemoDb client and exposes the loaded topics so the view can render each
  topic name and post count.
*/

const TOPICS_PATH = '/topics'

class TopicDiscoveryPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.navigate = deps.navigate || (() => {})
    this.topics = []
  }

  async load () {
    if (!this.memoDb) {
      throw new Error('Topic discovery page requires a memo db client.')
    }

    const data = await this.memoDb.getTopics()
    this.topics = data.topics || []

    return { topics: this.topics }
  }

  getTopic (room) {
    return this.topics.find((topic) => topic.room === room) || null
  }

  openTopic (room) {
    const path = TopicDiscoveryPage.topicFeedPath(room)
    this.navigate(path)
    return { path }
  }
}

TopicDiscoveryPage.TOPICS_PATH = TOPICS_PATH
TopicDiscoveryPage.topicFeedPath = function (room) {
  return `${TOPICS_PATH}/${encodeURIComponent(room)}`
}

module.exports = TopicDiscoveryPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T15:33:23.381Z","module_hash":"a238b89f4edc83d06d6a424a0f2e19307187410fe8328b5220289dab5bf18fe6","functions":[{"id":"func/TopicDiscoveryPage.constructor","name":"TopicDiscoveryPage.constructor","line":12,"end_line":16,"hash":"5e7790aac90f4000c71b5e8a4b4b15c6b2895d1315cc05741a4fa2577c9f1d61"},{"id":"func/TopicDiscoveryPage.load","name":"TopicDiscoveryPage.load","line":18,"end_line":27,"hash":"2ce74ae73560c443d862dc97c65adda83ca5cd2bcc4c0df8bb87889d99b60f1d"},{"id":"func/TopicDiscoveryPage.getTopic","name":"TopicDiscoveryPage.getTopic","line":29,"end_line":31,"hash":"7faf4b56db0bc89d32176a1741546958495ba10b5f313581f321de47e58ecb95"},{"id":"func/TopicDiscoveryPage.openTopic","name":"TopicDiscoveryPage.openTopic","line":33,"end_line":37,"hash":"ebd17b5f176c964308b69705b7a53af4c9c392e9856308b3095d69151ebde9aa"}]}
// mutate4javascript-manifest-end

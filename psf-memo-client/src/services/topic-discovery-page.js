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

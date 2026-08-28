/*
  Display the posts for a single Memo topic.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap'
import { useParams } from 'react-router-dom'

// Local libraries
import MemoDb from '../../../services/memo-db'
import TopicFeedPage from '../../../services/topic-feed-page'
import PostFeedItem from '../../post-feed/post-feed-item'
import PostThreadModal from '../../post-thread-modal'
import {
  collectPostAddrs,
  loadThreadProfiles
} from '../../post-thread-modal/thread-profiles'
import '../../../App.css'
import '../../post-feed/post-feed.css'

const PAGE_SIZE = 100

function TopicFeed (props) {
  const { appData } = props
  const { room } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState({})
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)
  const [threadTxid, setThreadTxid] = useState(null)
  const [showThreadModal, setShowThreadModal] = useState(false)

  const openThread = (txid) => {
    setThreadTxid(txid)
    setShowThreadModal(true)
  }

  const closeThread = () => {
    setShowThreadModal(false)
    setThreadTxid(null)
  }

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true)
      setError(null)
      setProfiles({})

      try {
        const memoDb = new MemoDb()
        const page = new TopicFeedPage({ memoDb, room })
        const data = await page.load({ limit: PAGE_SIZE, offset })

        const loadedPosts = data.posts || []
        const addrs = collectPostAddrs(loadedPosts)
        const profileMap = await loadThreadProfiles(addrs, memoDb)

        setPosts(loadedPosts)
        setProfiles(profileMap)
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.message || `Failed to load posts for topic ${room}`)
        setPosts([])
        setProfiles({})
        setPagination(null)
      }

      setLoading(false)
    }

    loadPosts()
  }, [room, offset])

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  return (
    <Container className='topic-feed-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='topic-feed-heading'>
            <h1>#{room}</h1>
            <p>Posts published in the {room} topic.</p>

            {pagination && posts.length > 0 && (
              <span className='topic-feed-count'>
                Showing {pagination.offset + 1}–
                {pagination.offset + posts.length} of {pagination.total}
              </span>
            )}
          </header>

          {error && (
            <p className='topic-feed-error'>
              {error}
            </p>
          )}

          {loading && (
            <div className='text-center my-5'>
              <Spinner animation='border' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </Spinner>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <p className='topic-feed-empty'>There are no posts for this topic.</p>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className='posts-feed'>
              {posts.map((post) => (
                <PostFeedItem
                  key={post.txid}
                  post={post}
                  profiles={profiles}
                  wallet={appData?.wallet}
                  onReplyClick={() => openThread(post.txid)}
                  showFooterMeta
                />
              ))}
            </div>
          )}

          {!loading && !error && (pagination || offset > 0) && (
            <div className='topic-feed-pagination'>
              <Button
                variant='outline-dark'
                onClick={handlePrevious}
                disabled={!canGoBack}
              >
                Previous
              </Button>

              <Button
                variant='outline-dark'
                onClick={handleNext}
                disabled={!canGoNext}
              >
                Next
              </Button>
            </div>
          )}
        </Col>
      </Row>

      <PostThreadModal
        show={showThreadModal}
        txid={threadTxid}
        onHide={closeThread}
        wallet={appData?.wallet}
        profiles={profiles}
      />
    </Container>
  )
}

export default TopicFeed

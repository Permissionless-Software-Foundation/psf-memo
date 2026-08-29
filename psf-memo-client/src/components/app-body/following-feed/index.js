/*
  Display the Following feed: top-level posts from profiles the viewer follows.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import FollowingFeedPage from '../../../services/following-feed-page'
import PostFeedItem from '../../post-feed/post-feed-item'
import PostThreadModal from '../../post-thread-modal'
import {
  collectPostAddrs,
  loadThreadProfiles
} from '../../post-thread-modal/thread-profiles'
import '../../../App.css'
import '../../post-feed/post-feed.css'

const PAGE_SIZE = 100

function FollowingFeed (props) {
  const { appData } = props
  const wallet = appData?.wallet

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState({})
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)
  const [threadTxid, setThreadTxid] = useState(null)
  const [showThreadModal, setShowThreadModal] = useState(false)
  const [emptyBecauseNoFollows, setEmptyBecauseNoFollows] = useState(false)

  const openThread = (txid) => {
    setThreadTxid(txid)
    setShowThreadModal(true)
  }

  const closeThread = () => {
    setShowThreadModal(false)
    setThreadTxid(null)
  }

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true)
      setError(null)
      setProfiles({})
      setEmptyBecauseNoFollows(false)

      try {
        const memoDb = new MemoDb()
        const page = new FollowingFeedPage({ memoDb, wallet })
        const data = await page.load({ limit: PAGE_SIZE, offset })

        const loadedPosts = data.posts || []
        const addrs = collectPostAddrs(loadedPosts)
        const profileMap = await loadThreadProfiles(addrs, memoDb)

        setPosts(loadedPosts)
        setProfiles(profileMap)
        setPagination(data.pagination || null)
        setEmptyBecauseNoFollows(data.emptyBecauseNoFollows === true)
      } catch (err) {
        setError(err.message || 'Failed to load following feed')
        setPosts([])
        setProfiles({})
        setPagination(null)
        setEmptyBecauseNoFollows(false)
      }

      setLoading(false)
    }

    loadFeed()
  }, [offset, wallet])

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  return (
    <Container className='following-feed-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='following-feed-heading'>
            <h1>Following</h1>
            <p>Posts from profiles you follow.</p>

            {pagination && posts.length > 0 && (
              <span className='following-feed-count'>
                Showing {pagination.offset + 1}–
                {pagination.offset + posts.length} of {pagination.total}
              </span>
            )}
          </header>

          {error && (
            <p className='following-feed-error'>
              {error}
            </p>
          )}

          {loading && (
            <div className='text-center my-5'>
              <Spinner animation='border' role='status'>
                <span className='visually-hidden'>
                  Loading...
                </span>
              </Spinner>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <p className='following-feed-empty'>
              {emptyBecauseNoFollows
                ? 'You are not following anyone.'
                : 'No posts from profiles you follow.'}
            </p>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className='posts-feed'>
              {posts.map((post) => (
                <PostFeedItem
                  key={post.txid}
                  post={post}
                  profiles={profiles}
                  wallet={wallet}
                  onReplyClick={() => openThread(post.txid)}
                  showFooterMeta
                />
              ))}
            </div>
          )}

          {!loading && !error && (pagination || offset > 0) && (
            <div className='following-feed-pagination'>
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
        wallet={wallet}
        profiles={profiles}
      />
    </Container>
  )
}

export default FollowingFeed

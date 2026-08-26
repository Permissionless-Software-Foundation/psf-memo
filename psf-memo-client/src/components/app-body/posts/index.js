/*
  Display the most recent Memo posts from psf-memo-db.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import PostFeedItem from '../../post-feed/post-feed-item'
import PostThreadModal from '../../post-thread-modal'
import {
  collectPostAddrs,
  loadThreadProfiles
} from '../../post-thread-modal/thread-profiles'
import '../../../App.css'
import '../../post-feed/post-feed.css'

const PAGE_SIZE = 100

function RecentPosts (props) {
  const { appData } = props
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
        const data = await memoDb.getRecentPosts({
          limit: PAGE_SIZE,
          offset
        })

        const loadedPosts = data.posts || []
        const addrs = collectPostAddrs(loadedPosts)
        const profileMap = await loadThreadProfiles(addrs, memoDb)

        setPosts(loadedPosts)
        setProfiles(profileMap)
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.message || 'Failed to load recent posts')
        setPosts([])
        setProfiles({})
        setPagination(null)
      }

      setLoading(false)
    }

    loadPosts()
  }, [offset])

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  return (
    <Container className='recent-posts-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='recent-posts-heading'>
            <h1>BCH Memo Posts</h1>
            <p>
              Recent messages published through the Memo protocol on Bitcoin Cash.
            </p>

            {pagination && posts.length > 0 && (
              <span className='recent-posts-count'>
                Showing {pagination.offset + 1}–
                {pagination.offset + posts.length} of {pagination.total}
              </span>
            )}

            {pagination && posts.length === 0 && (
              <span className='recent-posts-count'>
                No posts on this page.
              </span>
            )}
          </header>

          {error && (
            <p className='recent-posts-error'>
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
            <div className='recent-posts-pagination'>
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

export default RecentPosts

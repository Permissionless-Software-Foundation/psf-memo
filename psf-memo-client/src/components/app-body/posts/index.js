/*
  Display the recent/following Memo posts from psf-memo-db.

  One posts page with two mode buttons: "Recent" shows the global recent feed
  and "Following" shows top-level posts from profiles the viewer follows. The
  default tab is chosen from the viewer's follow state, and switching tabs
  resets the feed to its first page.
*/

// Global npm libraries
import React, { useState, useEffect, useRef } from 'react'
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import FeedTabsPage from '../../../services/feed-tabs-page'
import PostFeedItem from '../../post-feed/post-feed-item'
import PostThreadModal from '../../post-thread-modal'
import {
  collectPostAddrs,
  loadThreadProfiles
} from '../../post-thread-modal/thread-profiles'
import '../../../App.css'
import '../../post-feed/post-feed.css'

const PAGE_SIZE = 50

function RecentPosts (props) {
  const { appData } = props
  const wallet = appData?.wallet

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState({})
  const [pagination, setPagination] = useState(null)
  const [mode, setMode] = useState(null)
  const [emptyBecauseNoFollows, setEmptyBecauseNoFollows] = useState(false)
  const [offset, setOffset] = useState(0)
  const [threadTxid, setThreadTxid] = useState(null)
  const [showThreadModal, setShowThreadModal] = useState(false)

  const pageRef = useRef(null)

  // Reflect a loaded controller page into React state, including the author
  // profiles needed by the post cards. The controller snapshot is the single
  // source of feed state; the view never reaches into its internal fields.
  const showPage = async (page) => {
    const state = page.getState()
    const addrs = collectPostAddrs(state.posts)
    const profileMap = await loadThreadProfiles(addrs, page.memoDb)

    setPosts(state.posts)
    setPagination(state.pagination)
    setMode(state.mode)
    setEmptyBecauseNoFollows(state.emptyBecauseNoFollows)
    setOffset(state.offset)
    setProfiles(profileMap)
  }

  const openThread = (txid) => {
    setThreadTxid(txid)
    setShowThreadModal(true)
  }

  const closeThread = () => {
    setShowThreadModal(false)
    setThreadTxid(null)
  }

  useEffect(() => {
    let cancelled = false

    const loadPosts = async () => {
      setLoading(true)
      setError(null)
      setProfiles({})

      try {
        const page = new FeedTabsPage({ memoDb: new MemoDb(), wallet })
        pageRef.current = page
        await page.open({ limit: PAGE_SIZE, offset: 0 })

        if (cancelled) return
        await showPage(page)
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to load posts')
        setPosts([])
        setProfiles({})
        setPagination(null)
        setEmptyBecauseNoFollows(false)
        setOffset(0)
      }

      if (!cancelled) setLoading(false)
    }

    loadPosts()

    return () => { cancelled = true }
  }, [wallet])

  const runPageAction = async (action) => {
    const page = pageRef.current
    if (!page) return

    setLoading(true)
    setError(null)
    try {
      await action(page)
      await showPage(page)
    } catch (err) {
      setError(err.message || 'Failed to load posts')
      setPosts([])
      setProfiles({})
      setPagination(null)
      setEmptyBecauseNoFollows(false)
      setOffset(0)
    }
    setLoading(false)
  }

  const handleSelectTab = (tab) => runPageAction((page) => page.selectTab(tab))
  const handlePrevious = () => runPageAction((page) => page.previousPage())
  const handleNext = () => runPageAction((page) => page.nextPage())

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  return (
    <Container className='recent-posts-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='recent-posts-heading'>
            <h1>BCH Memo Posts</h1>
            <p>
              Recent messages published through the Memo protocol on Bitcoin Cash.
            </p>

            <div className='posts-feed-tabs'>
              <Button
                variant={mode === FeedTabsPage.RECENT_MODE ? 'dark' : 'outline-dark'}
                onClick={() => handleSelectTab('Recent')}
              >
                Recent
              </Button>

              <Button
                variant={mode === FeedTabsPage.FOLLOWING_MODE ? 'dark' : 'outline-dark'}
                onClick={() => handleSelectTab('Following')}
              >
                Following
              </Button>
            </div>

            {pagination && posts.length > 0 && (
              <span className='recent-posts-count'>
                Showing {pagination.offset + 1}–
                {pagination.offset + posts.length} of {pagination.total}
              </span>
            )}

            {pagination && posts.length === 0 && !emptyBecauseNoFollows && (
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

          {!loading && !error && posts.length === 0 && emptyBecauseNoFollows && (
            <p className='recent-posts-empty'>
              You are not following anyone.
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
        wallet={wallet}
        profiles={profiles}
      />
    </Container>
  )
}

export default RecentPosts

/*
  Display the posts for a single Memo topic and provide topic post / follow
  controls.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Button, Form } from 'react-bootstrap'
import { useParams } from 'react-router-dom'

// Local libraries
import MemoDb from '../../../services/memo-db'
import TopicFeedPage from '../../../services/topic-feed-page'
import MemoTopicPost from '../../../services/memo-topic-post'
import TopicPostPage from '../../../services/topic-post-page'
import MemoTopicFollow from '../../../services/memo-topic-follow'
import PostFeedItem from '../../post-feed/post-feed-item'
import PostThreadModal from '../../post-thread-modal'
import {
  collectPostAddrs,
  loadThreadProfiles
} from '../../post-thread-modal/thread-profiles'
import { byteLength } from '../../../services/utf8'
import '../../../App.css'
import '../../post-feed/post-feed.css'

const PAGE_SIZE = 100

function TopicFeed (props) {
  const { appData } = props
  const { room } = useParams()
  const myAddr = appData?.wallet?.walletInfo?.cashAddress

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState({})
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)
  const [threadTxid, setThreadTxid] = useState(null)
  const [showThreadModal, setShowThreadModal] = useState(false)

  const [composerInput, setComposerInput] = useState('')
  const [composerErr, setComposerErr] = useState('')
  const [postingTopic, setPostingTopic] = useState(false)

  const [isFollowing, setIsFollowing] = useState(false)
  const [followers, setFollowers] = useState([])
  const [followSubmitting, setFollowSubmitting] = useState(false)

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

      try {
        const memoDb = new MemoDb()
        const memoTopicFollow = new MemoTopicFollow({
          wallet: appData?.wallet,
          profiles: appData?.profiles
        })
        const page = new TopicFeedPage({
          memoDb,
          room,
          myAddr,
          memoTopicFollow
        })
        const data = await page.load({ limit: PAGE_SIZE, offset })

        const loadedPosts = data.posts || []
        const addrs = collectPostAddrs(loadedPosts)
        const profileMap = await loadThreadProfiles(addrs, memoDb)

        setPosts(loadedPosts)
        setProfiles(profileMap)
        setPagination(data.pagination || null)
        setIsFollowing(data.followState === true)
        setFollowers(data.followers || [])
      } catch (err) {
        setError(err.message || `Failed to load posts for topic ${room}`)
        setPosts([])
        setProfiles({})
        setPagination(null)
        setIsFollowing(false)
        setFollowers([])
      }

      setLoading(false)
    }

    loadFeed()
  }, [room, offset, myAddr, appData?.wallet, appData?.profiles])

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  const remainingBytes = () => {
    return MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES - byteLength(room) - byteLength(composerInput)
  }

  const handleComposerChange = (event) => {
    setComposerInput(event.target.value)
    setComposerErr('')
  }

  const handlePostTopic = async (event) => {
    event.preventDefault()
    setComposerErr('')
    setPostingTopic(true)

    try {
      const memoTopicPost = new MemoTopicPost({
        wallet: appData?.wallet,
        room
      })
      const page = new TopicPostPage({ memoTopicPost })
      page.setInput(composerInput)

      const result = await page.submit()
      if (!result.ok) {
        if (result.error === 'topic_post_length') {
          setComposerErr(`Topic message is too long. Maximum is ${MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES} bytes.`)
        } else if (result.error === 'topic_post_validation') {
          setComposerErr('Topic message must not be empty.')
        } else if (result.message) {
          setComposerErr(`Failed to broadcast: ${result.message}`)
        } else {
          setComposerErr('Failed to post topic message.')
        }
      } else {
        // Optimistically show the new post at the top of the feed.
        const newPost = {
          txid: result.txid,
          addr: myAddr,
          text: composerInput,
          seen: Date.now(),
          blockHeight: 0,
          replyCount: 0,
          likeCount: 0
        }
        setPosts((prev) => [newPost, ...prev])
        setComposerInput('')
      }
    } catch (submitErr) {
      setComposerErr(submitErr.message)
    } finally {
      setPostingTopic(false)
    }
  }

  const handleFollowClick = async () => {
    setFollowSubmitting(true)
    setError(null)

    try {
      const memoTopicFollow = new MemoTopicFollow({
        wallet: appData?.wallet,
        profiles: appData?.profiles
      })
      const page = new TopicFeedPage({
        memoDb: new MemoDb(),
        room,
        myAddr,
        memoTopicFollow
      })
      await page.follow()
      setIsFollowing(true)
      if (myAddr && !followers.includes(myAddr)) {
        setFollowers((prev) => [...prev, myAddr])
      }
    } catch (err) {
      setError(`Failed to follow topic: ${err.message}`)
    }

    setFollowSubmitting(false)
  }

  const handleUnfollowClick = async () => {
    setFollowSubmitting(true)
    setError(null)

    try {
      const memoTopicFollow = new MemoTopicFollow({
        wallet: appData?.wallet,
        profiles: appData?.profiles
      })
      const page = new TopicFeedPage({
        memoDb: new MemoDb(),
        room,
        myAddr,
        memoTopicFollow
      })
      await page.unfollow()
      setIsFollowing(false)
      if (myAddr) {
        setFollowers((prev) => prev.filter((addr) => addr !== myAddr))
      }
    } catch (err) {
      setError(`Failed to unfollow topic: ${err.message}`)
    }

    setFollowSubmitting(false)
  }

  const showComposer = Boolean(myAddr)
  const showFollowButton = Boolean(myAddr)

  return (
    <Container className='topic-feed-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='topic-feed-heading'>
            <div className='topic-feed-heading-row'>
              <div>
                <h1>#{room}</h1>
                <p>Posts published in the {room} topic.</p>
              </div>

              {showFollowButton && (
                <Button
                  variant={isFollowing ? 'outline-secondary' : 'primary'}
                  onClick={isFollowing ? handleUnfollowClick : handleFollowClick}
                  disabled={followSubmitting}
                >
                  {followSubmitting
                    ? 'Working...'
                    : (isFollowing ? 'Unfollow' : 'Follow')}
                </Button>
              )}
            </div>

            {pagination && posts.length > 0 && (
              <span className='topic-feed-count'>
                Showing {pagination.offset + 1}–
                {pagination.offset + posts.length} of {pagination.total}
              </span>
            )}

            {followers.length > 0 && (
              <span className='topic-feed-follower-count'>
                {followers.length} follower{followers.length === 1 ? '' : 's'}
              </span>
            )}
          </header>

          {showComposer && (
            <Form onSubmit={handlePostTopic} className='topic-post-composer mb-4'>
              <Form.Group controlId='topic-post-message' className='mb-2'>
                <Form.Control
                  as='textarea'
                  rows={3}
                  value={composerInput}
                  onChange={handleComposerChange}
                  placeholder={`Post in #${room}...`}
                />
              </Form.Group>

              <div className='topic-post-composer-footer'>
                <p className='topic-post-counter mb-0'>
                  {remainingBytes()} bytes remaining
                </p>

                <Button type='submit' variant='primary' disabled={postingTopic}>
                  {postingTopic ? 'Posting...' : 'Post'}
                </Button>
              </div>

              {composerErr && (
                <p className='topic-post-error mt-2'>{composerErr}</p>
              )}
            </Form>
          )}

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

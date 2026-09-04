/*
  Display a Memo user profile: avatar, bio, and posts.
*/

import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Row, Col, Spinner, Card, Button } from 'react-bootstrap'
import Jdenticon from '@chris.troutner/react-jdenticon'

import MemoDb from '../../../services/memo-db'
import MemoFollow from '../../../services/memo-follow'
import MemoMute from '../../../services/memo-mute'
import ProfilePage from '../../../services/profile-page'
import { getViewerAddress } from '../../../services/profile-wallet'
import PostReplyCount from '../../post-reply-count'
import LikeButton from '../../post-feed/like-button'
import PostThreadModal from '../../post-thread-modal'
import '../../../App.css'
import './profile.css'

const PAGE_SIZE = 50

function formatSeen (seen) {
  if (!seen) return ''
  const ms = seen > 1e12 ? seen : seen * 1000
  return new Date(ms).toLocaleString()
}

function ProfileAvatar ({ addr, profilePicUrl }) {
  const [picError, setPicError] = useState(false)

  useEffect(() => {
    setPicError(false)
  }, [profilePicUrl, addr])

  if (profilePicUrl && !picError) {
    return (
      <img
        src={profilePicUrl}
        alt='Profile'
        className='profile-avatar'
        onError={() => setPicError(true)}
      />
    )
  }

  return (
    <div className='profile-avatar profile-avatar-jdenticon'>
      <Jdenticon size='120' value={addr} />
    </div>
  )
}

function Profile (props) {
  const { appData } = props
  const { addr: encodedAddr } = useParams()
  const addr = decodeURIComponent(encodedAddr || '')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profileText, setProfileText] = useState('')
  const [profilePicUrl, setProfilePicUrl] = useState(null)
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [threadTxid, setThreadTxid] = useState(null)
  const [showThreadModal, setShowThreadModal] = useState(false)
  const [profiles, setProfiles] = useState({})
  const [profilePage, setProfilePage] = useState(null)
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)

  const openThread = (txid) => {
    setThreadTxid(txid)
    setShowThreadModal(true)
  }

  const closeThread = () => {
    setShowThreadModal(false)
    setThreadTxid(null)
  }

  const wallet = appData?.wallet || null
  const appProfiles = appData?.profiles || null
  const myAddr = getViewerAddress(appData)

  const runAction = async (method, failMsg) => {
    if (!profilePage || busy) return
    setBusy(true)
    try {
      await profilePage[method]()
    } catch (err) {
      setError(err.message || failMsg)
    }
    setBusy(false)
  }

  const handleFollow = () => runAction('follow', 'Failed to follow')
  const handleUnfollow = () => runAction('unfollow', 'Failed to unfollow')
  const handleMute = () => runAction('mute', 'Failed to mute')
  const handleUnmute = () => runAction('unmute', 'Failed to unmute')

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        const memoFollow = myAddr && wallet
          ? new MemoFollow({ wallet, profiles: appProfiles })
          : null
        const memoMute = myAddr && wallet
          ? new MemoMute({ wallet, profiles: appProfiles })
          : null
        const page = new ProfilePage({ memoDb, addr, myAddr, memoFollow, memoMute })

        const [profile, profilePic, pageData] = await Promise.all([
          memoDb.getProfile(addr),
          memoDb.getProfilePic(addr),
          page.load({ limit: PAGE_SIZE, offset })
        ])

        setProfileText(profile?.text || '')
        setProfilePicUrl(profilePic?.url || null)
        setPosts(pageData.posts || [])
        setPagination(pageData.pagination || null)
        setProfilePage(page)
        setProfiles({})
      } catch (err) {
        setError(err.message || 'Failed to load profile')
      }

      setLoading(false)
    }

    if (addr) {
      loadProfile()
    } else {
      setError('Missing profile address')
      setLoading(false)
    }
  }, [addr, myAddr, wallet, appProfiles, offset])

  const showFollowButton = profilePage && profilePage.canFollow() && !profilePage.isFollowing()
  const showUnfollowButton = profilePage && profilePage.canFollow() && profilePage.isFollowing()
  const showMuteButton = profilePage && profilePage.canMute() && !profilePage.isMuting()
  const showUnmuteButton = profilePage && profilePage.canMute() && profilePage.isMuting()

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  return (
    <Container fluid className='profile-page mt-4'>
      {error && <p className='text-danger'>{error}</p>}

      {loading && (
        <div className='text-center my-5'>
          <Spinner animation='border' role='status' variant='primary'>
            <span className='visually-hidden'>Loading...</span>
          </Spinner>
        </div>
      )}

      {!loading && !error && (
        <Row>
          <Col lg={3} md={4} className='profile-sidebar mb-4'>
            <ProfileAvatar addr={addr} profilePicUrl={profilePicUrl} />
            {profileText && (
              <p className='profile-bio mt-3'>{profileText}</p>
            )}
            {!profileText && (
              <p className='profile-bio profile-bio-empty mt-3 text-muted'>
                No profile text
              </p>
            )}
            <div className='profile-address mt-3'>
              <span className='profile-address-label'>BCH</span>
              <span className='profile-address-value' title={addr}>{addr}</span>
            </div>
            {showFollowButton && (
              <Button
                className='mt-3'
                variant='primary'
                onClick={handleFollow}
                disabled={busy}
                data-testid='follow-button'
              >
                Follow
              </Button>
            )}
            {showUnfollowButton && (
              <Button
                className='mt-3'
                variant='outline-primary'
                onClick={handleUnfollow}
                disabled={busy}
                data-testid='unfollow-button'
              >
                Unfollow
              </Button>
            )}
            {showMuteButton && (
              <Button
                className='mt-3 ms-2'
                variant='secondary'
                onClick={handleMute}
                disabled={busy}
                data-testid='mute-button'
              >
                Mute
              </Button>
            )}
            {showUnmuteButton && (
              <Button
                className='mt-3 ms-2'
                variant='outline-secondary'
                onClick={handleUnmute}
                disabled={busy}
                data-testid='unmute-button'
              >
                Unmute
              </Button>
            )}
          </Col>

          <Col lg={9} md={8} className='profile-posts'>
            <div className='profile-posts-header mb-3'>
              <h2 className='profile-posts-title'>Posts</h2>
              {pagination && (
                <span className='text-muted'>
                  {pagination.offset + 1}–{pagination.offset + posts.length} of {pagination.total} posts
                </span>
              )}
            </div>

            {posts.length === 0 && (
              <p className='text-muted'>No posts for this address.</p>
            )}

            {posts.map((post) => (
              <Card key={post.txid} className='profile-post-card mb-3'>
                <Card.Body>
                  <div className='profile-post-meta text-muted mb-2'>
                    <span>{formatSeen(post.seen)}</span>
                    <span className='profile-post-block ms-2'>Block {post.blockHeight}</span>
                  </div>
                  <Card.Text className='profile-post-text'>{post.text}</Card.Text>
                  <div className='profile-post-actions d-flex gap-3 align-items-center'>
                    <LikeButton count={post.likeCount ?? 0} liked={false} readOnly />
                    <PostReplyCount
                      count={post.replyCount ?? 0}
                      onClick={() => openThread(post.txid)}
                    />
                  </div>
                </Card.Body>
              </Card>
            ))}

            {!loading && !error && (pagination || offset > 0) && (
              <div className='profile-posts-pagination mt-3'>
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
      )}

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

export default Profile

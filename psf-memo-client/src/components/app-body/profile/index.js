/*
  Display a Memo user profile: avatar, bio, and posts.
*/

import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Row, Col, Spinner, Card } from 'react-bootstrap'
import Jdenticon from '@chris.troutner/react-jdenticon'

import MemoDb from '../../../services/memo-db'
import PostReplyCount from '../../post-reply-count'
import PostThreadModal from '../../post-thread-modal'
import '../../../App.css'
import './profile.css'

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

  const openThread = (txid) => {
    setThreadTxid(txid)
    setShowThreadModal(true)
  }

  const closeThread = () => {
    setShowThreadModal(false)
    setThreadTxid(null)
  }

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        const [profile, profilePic, postsData] = await Promise.all([
          memoDb.getProfile(addr),
          memoDb.getProfilePic(addr),
          memoDb.getPostsByAddr(addr, { limit: 100, offset: 0 })
        ])

        setProfileText(profile?.text || '')
        setProfilePicUrl(profilePic?.url || null)
        setPosts(postsData.posts || [])
        setPagination(postsData.pagination || null)
        setProfiles({}) // Future: load profile names for the post list.
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
  }, [addr])

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
          </Col>

          <Col lg={9} md={8} className='profile-posts'>
            <div className='profile-posts-header mb-3'>
              <h2 className='profile-posts-title'>Posts</h2>
              {pagination && (
                <span className='text-muted'>
                  {pagination.total} post{pagination.total === 1 ? '' : 's'}
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
                  <PostReplyCount
                    count={post.replyCount ?? 0}
                    onClick={() => openThread(post.txid)}
                  />
                </Card.Body>
              </Card>
            ))}
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

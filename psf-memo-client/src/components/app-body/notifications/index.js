/*
  Display the Notifications page: replies to my posts, likes on my posts,
  and new follows, newest first.

  Each entry names its actor with the actor's Memo display name and avatar,
  links both to the actor's profile, shows the full address as small plain
  text, and offers a "View Post" link for like and reply notifications that
  opens the referenced post's thread.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import NotificationsPage from '../../../services/notifications-page'
import PostThreadModal from '../../post-thread-modal'
import NotificationEntry from './notification-entry'
import '../../../App.css'

const PAGE_SIZE = 50

function Notifications (props) {
  const { appData } = props
  const wallet = appData?.wallet

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [entries, setEntries] = useState([])
  const [profiles, setProfiles] = useState({})
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)
  const [threadTxid, setThreadTxid] = useState(null)
  const [showThreadModal, setShowThreadModal] = useState(false)

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        const page = new NotificationsPage({ memoDb, wallet })
        const data = await page.load({ limit: PAGE_SIZE, offset })

        setEntries(page.getEntries())
        setProfiles(data.profiles || {})
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.message || 'Failed to load notifications')
        setEntries([])
        setProfiles({})
        setPagination(null)
      }

      setLoading(false)
    }

    loadNotifications()
  }, [offset, wallet])

  const openThread = (txid) => {
    if (!txid) return
    setThreadTxid(txid)
    setShowThreadModal(true)
  }

  const closeThread = () => {
    setShowThreadModal(false)
    setThreadTxid(null)
  }

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  const ready = !loading && !error

  return (
    <Container className='notifications-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='notifications-heading'>
            <h1>Notifications</h1>
            <p>Replies, likes, and follows involving you.</p>

            {pagination && entries.length > 0 && (
              <span className='notifications-count'>
                Showing {pagination.offset + 1}–
                {pagination.offset + entries.length} of {pagination.total}
              </span>
            )}
          </header>

          {error && (
            <p className='notifications-error'>
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

          {ready && entries.length === 0 && (
            <p className='notifications-empty'>You have no notifications.</p>
          )}

          {ready && entries.length > 0 && (
            <div className='notifications-list'>
              {entries.map((entry) => (
                <NotificationEntry
                  key={entry.txid}
                  entry={entry}
                  onViewPost={openThread}
                />
              ))}
            </div>
          )}

          {ready && (pagination || offset > 0) && (
            <div className='notifications-pagination'>
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

export default Notifications

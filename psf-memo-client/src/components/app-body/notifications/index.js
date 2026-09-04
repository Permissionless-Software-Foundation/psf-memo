/*
  Display the Notifications page: replies to my posts, likes on my posts,
  and new follows, newest first.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import NotificationsPage from '../../../services/notifications-page'
import '../../../App.css'

const PAGE_SIZE = 50

function notificationText (n) {
  if (n.type === 'reply') {
    return `replied to your post: ${n.text || ''}`
  }
  if (n.type === 'like') {
    return 'liked your post'
  }
  if (n.type === 'follow') {
    return 'followed you'
  }
  return ''
}

function Notifications (props) {
  const { appData } = props
  const wallet = appData?.wallet

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        const page = new NotificationsPage({ memoDb, wallet })
        const data = await page.load({ limit: PAGE_SIZE, offset })

        setNotifications(data.notifications || [])
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.message || 'Failed to load notifications')
        setNotifications([])
        setPagination(null)
      }

      setLoading(false)
    }

    loadNotifications()
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
    <Container className='notifications-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='notifications-heading'>
            <h1>Notifications</h1>
            <p>Replies, likes, and follows involving you.</p>

            {pagination && notifications.length > 0 && (
              <span className='notifications-count'>
                Showing {pagination.offset + 1}–
                {pagination.offset + notifications.length} of {pagination.total}
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

          {!loading && !error && notifications.length === 0 && (
            <p className='notifications-empty'>You have no notifications.</p>
          )}

          {!loading && !error && notifications.length > 0 && (
            <div className='notifications-list'>
              {notifications.map((n) => (
                <div key={n.txid} className='notification-item' style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}>
                  <p className='text-muted' style={{ fontFamily: 'monospace', marginBottom: '0.25rem' }}>
                    {n.addr}
                  </p>
                  <p style={{ marginBottom: 0 }}>{notificationText(n)}</p>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && (pagination || offset > 0) && (
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
    </Container>
  )
}

export default Notifications

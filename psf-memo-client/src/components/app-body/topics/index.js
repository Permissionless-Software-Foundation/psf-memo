/*
  Display a page of Memo topics served by psf-memo-db.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, ListGroup, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import MemoDb from '../../../services/memo-db'
import TopicDiscoveryPage from '../../../services/topic-discovery-page'
import { relativeTime } from '../../../services/relative-time'
import '../../../App.css'

const PAGE_SIZE = 50

function Topics (props) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [topics, setTopics] = useState([])
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const loadTopics = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        const page = new TopicDiscoveryPage({ memoDb, navigate })
        const result = await page.load({ limit: PAGE_SIZE, offset })
        setTopics(result.topics || [])
        setPagination(result.pagination || null)
      } catch (err) {
        setError(err.message || 'Failed to load topics')
        setTopics([])
        setPagination(null)
      }

      setLoading(false)
    }

    loadTopics()
  }, [navigate, offset])

  const handleClick = (room) => {
    navigate(TopicDiscoveryPage.topicFeedPath(room))
  }

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  return (
    <Container className='topics-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='topics-heading'>
            <h1>Topics</h1>
            <p>Discover Memo conversations organized by topic.</p>

            {pagination && topics.length > 0 && (
              <span className='topics-count'>
                Showing {pagination.offset + 1}–
                {pagination.offset + topics.length} of {pagination.total}
              </span>
            )}
          </header>

          {error && (
            <p className='topics-error'>
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

          {!loading && !error && topics.length === 0 && (
            <p className='topics-empty'>No topics available.</p>
          )}

          {!loading && !error && topics.length > 0 && (
            <ListGroup>
              {topics.map((topic) => (
                <ListGroup.Item
                  key={topic.room}
                  action
                  onClick={() => handleClick(topic.room)}
                  className='d-flex justify-content-between align-items-center'
                >
                  <span className='topic-name'>#{topic.room}</span>
                  <span className='topic-last-seen text-muted'>{relativeTime(topic.lastSeen, Date.now())}</span>
                  <span className='topic-post-count text-muted'>{topic.postCount} posts</span>
                  <span className='topic-follower-count text-muted'>{topic.followerCount} followers</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          {!loading && !error && (pagination || offset > 0) && (
            <div className='topics-pagination mt-3'>
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

export default Topics

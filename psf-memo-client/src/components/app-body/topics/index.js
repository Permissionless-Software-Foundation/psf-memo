/*
  Display the list of Memo topics served by psf-memo-db.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, ListGroup } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import MemoDb from '../../../services/memo-db'
import TopicDiscoveryPage from '../../../services/topic-discovery-page'
import '../../../App.css'

function Topics (props) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [topics, setTopics] = useState([])

  useEffect(() => {
    const loadTopics = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        const page = new TopicDiscoveryPage({ memoDb, navigate })
        const result = await page.load()
        setTopics(result.topics || [])
      } catch (err) {
        setError(err.message || 'Failed to load topics')
        setTopics([])
      }

      setLoading(false)
    }

    loadTopics()
  }, [navigate])

  const handleClick = (room) => {
    navigate(TopicDiscoveryPage.topicFeedPath(room))
  }

  return (
    <Container className='topics-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='topics-heading'>
            <h1>Topics</h1>
            <p>Discover Memo conversations organized by topic.</p>
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
                >
                  #{topic.room}{' '}
                  <span className='text-muted'>({topic.postCount} posts)</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default Topics

/*
  New Topic view: name a new Memo topic, broadcast its first message, and land
  on the new topic's feed. Creating a topic is the same on-chain action as
  posting to a topic, so this page submits the Memo topic-message action with
  the room derived from the typed name.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import NewTopicPage from '../../../services/new-topic-page'

// Bytes remaining for the current draft, computed through the page controller
// so the name normalization and byte budget stay in one place.
function computeRemaining (topicName, firstMessage) {
  const page = new NewTopicPage({})
  page.setTopicName(topicName).setFirstMessage(firstMessage)
  return page.remainingCount()
}

function NewTopic (props) {
  const { appData } = props
  const navigate = useNavigate()

  const [topicName, setTopicName] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const remaining = computeRemaining(topicName, firstMessage)

  async function handleSubmit (event) {
    event.preventDefault()
    setErr('')
    setSubmitting(true)

    try {
      const page = new NewTopicPage({ wallet: appData?.wallet, navigate })
      page.setTopicName(topicName).setFirstMessage(firstMessage)

      const result = await page.submit()
      if (!result.ok) {
        if (result.error === 'topic_name_validation') {
          setErr('Topic name must not be empty.')
        } else if (result.error === 'topic_post_validation') {
          setErr('First message must not be empty.')
        } else if (result.error === 'topic_post_length') {
          setErr(`Topic name and first message are too long. Maximum is ${NewTopicPage.MAX_TOPIC_MESSAGE_BYTES} bytes combined.`)
        } else if (result.message) {
          setErr(`Failed to broadcast: ${result.message}`)
        } else {
          setErr('Failed to create topic.')
        }
      }
      // On success page.submit() navigated to the new topic's feed.
    } catch (submitErr) {
      setErr(submitErr.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className='new-topic-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='new-topic-heading'>
            <h1>New Topic</h1>
            <p>Start a Memo conversation by publishing its first message.</p>
          </header>

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId='new-topic-name' className='mb-3'>
              <Form.Label><b>Topic Name</b></Form.Label>
              <Form.Control
                type='text'
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder='Enter a topic name...'
                disabled={submitting}
              />
            </Form.Group>

            <Form.Group controlId='new-topic-message' className='mb-3'>
              <Form.Label><b>First Message</b></Form.Label>
              <Form.Control
                as='textarea'
                rows={4}
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder='Write the first message in this topic...'
                disabled={submitting}
              />
            </Form.Group>

            <p className='new-topic-counter'>
              {remaining} bytes remaining
            </p>

            {err && <p className='new-topic-error'>{err}</p>}

            <Button type='submit' variant='primary' disabled={submitting}>
              {submitting ? 'Creating Topic...' : 'Create Topic'}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

export default NewTopic

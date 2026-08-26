/*
  New Post view: compose and broadcast a Memo post, with a character counter
  that counts down from the memo limit. On success the user is navigated to the
  recent feed.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import MemoPost from '../../../services/memo-post'
import NewPostPage from '../../../services/new-post'

function NewPost (props) {
  const { appData } = props
  const navigate = useNavigate()

  const maxChars = MemoPost.MAX_MEMO_CHARS
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [posting, setPosting] = useState(false)

  const remaining = maxChars - input.length

  async function handleSubmit (event) {
    event.preventDefault()
    setErr('')
    setPosting(true)

    try {
      const memoPost = new MemoPost({ wallet: appData?.wallet })
      const page = new NewPostPage({ memoPost, navigate })
      page.setInput(input)

      const result = await page.submit()
      if (!result.ok) {
        if (result.error === 'memo_length') {
          setErr(`Memo is too long. Maximum is ${maxChars} characters.`)
        } else if (result.error === 'memo_validation') {
          setErr('Memo must not be empty.')
        } else if (result.message) {
          setErr(`Failed to broadcast: ${result.message}`)
        } else {
          setErr('Failed to post memo.')
        }
      }
      // On success page.submit() navigated to the recent feed.
    } catch (submitErr) {
      setErr(submitErr.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <Container>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='new-post-heading'>
            <h1>New Post</h1>
            <p>Compose a Memo message and publish it to Bitcoin Cash.</p>
          </header>

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId='new-post-message' className='mb-3'>
              <Form.Label><b>Message</b></Form.Label>
              <Form.Control
                as='textarea'
                rows={6}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Write your Memo here...'
              />
            </Form.Group>

            <p className='new-post-counter'>
              {remaining} characters remaining
            </p>

            {err && <p className='new-post-error'>{err}</p>}

            <Button type='submit' variant='primary' disabled={posting}>
              {posting ? 'Posting...' : 'Post'}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

export default NewPost

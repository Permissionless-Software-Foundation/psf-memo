/*
  New Post view: compose and broadcast a Memo post, with a character counter
  that counts down from the memo limit. After broadcast, a modal reports
  success (txid + explorer link) or failure. Dismissing a successful result
  navigates to the recent feed.
*/

// Global npm libraries
import React, { useRef, useState } from 'react'
import { Container, Row, Col, Form, Button, Modal } from 'react-bootstrap'
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
  const [showResultModal, setShowResultModal] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const pageRef = useRef(null)

  const remaining = maxChars - input.length
  const resultTxid = lastResult && lastResult.ok ? lastResult.txid : ''
  const explorerUrl = NewPostPage.explorerUrl(resultTxid)

  async function handleSubmit (event) {
    event.preventDefault()
    setErr('')
    setPosting(true)

    try {
      const memoPost = new MemoPost({ wallet: appData?.wallet })
      const page = new NewPostPage({ memoPost, navigate })
      pageRef.current = page
      page.setInput(input)

      const result = await page.submit()
      setLastResult(result)
      if (!result.ok) {
        if (result.error === 'memo_length') {
          setErr(`Memo is too long. Maximum is ${maxChars} characters.`)
        } else if (result.error === 'memo_validation') {
          setErr('Memo must not be empty.')
        }
      }
      if (page.showResultModal) {
        setShowResultModal(true)
      }
    } catch (submitErr) {
      const result = { ok: false, error: 'broadcast', message: submitErr.message }
      setLastResult(result)
      setShowResultModal(true)
    } finally {
      setPosting(false)
    }
  }

  function handleDismissResult () {
    if (pageRef.current) {
      pageRef.current.dismissResult()
    } else if (lastResult && lastResult.ok) {
      navigate(NewPostPage.RECENT_FEED_PATH)
    }
    setShowResultModal(false)
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
                disabled={posting}
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

      <Modal show={showResultModal} onHide={handleDismissResult} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {lastResult && lastResult.ok ? 'Post published' : 'Post failed'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {lastResult && lastResult.ok
            ? (
              <>
                <p>Your post was broadcast to the Bitcoin Cash network.</p>
                <p className='new-post-txid mb-0'>
                  Transaction ID:{' '}
                  <a
                    href={explorerUrl}
                    target='_blank'
                    rel='noreferrer'
                    style={{ wordBreak: 'break-all' }}
                  >
                    {resultTxid}
                  </a>
                </p>
              </>
              )
            : (
              <p className='new-post-error mb-0'>
                {(lastResult && lastResult.message) || 'Failed to post memo.'}
              </p>
              )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant='primary' onClick={handleDismissResult}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default NewPost

/*
  Set Avatar URL view: compose and broadcast a Memo avatar URL, with a byte
  counter that counts down from the avatar URL limit. On success the user is
  navigated to the account page.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import MemoSetAvatarUrl from '../../../services/memo-set-avatar-url'
import SetAvatarUrlPage from '../../../services/set-avatar-url-page'
import { byteLength } from '../../../services/utf8'

function SetAvatarUrl (props) {
  const { appData } = props
  const navigate = useNavigate()

  const maxBytes = MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [settingAvatarUrl, setSettingAvatarUrl] = useState(false)

  const remaining = maxBytes - byteLength(input)

  async function handleSubmit (event) {
    event.preventDefault()
    setErr('')
    setSettingAvatarUrl(true)

    try {
      const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet: appData?.wallet, profiles: appData?.profiles })
      const page = new SetAvatarUrlPage({ memoSetAvatarUrl, navigate })
      page.setInput(input)

      const result = await page.submit()
      if (!result.ok) {
        if (result.error === 'avatar_url_length') {
          setErr(`Avatar URL is too long. Maximum is ${maxBytes} bytes.`)
        } else if (result.error === 'avatar_url_validation') {
          setErr('Avatar URL must not be empty.')
        } else if (result.message) {
          setErr(`Failed to broadcast: ${result.message}`)
        } else {
          setErr('Failed to set avatar URL.')
        }
      }
      // On success page.submit() navigated to the account page.
    } catch (submitErr) {
      setErr(submitErr.message)
    } finally {
      setSettingAvatarUrl(false)
    }
  }

  return (
    <Container>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='set-avatar-url-heading'>
            <h1>Set Avatar URL</h1>
            <p>Set your profile picture URL and publish it to Bitcoin Cash.</p>
          </header>

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId='set-avatar-url-input' className='mb-3'>
              <Form.Label><b>Avatar URL</b></Form.Label>
              <Form.Control
                type='text'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='https://example.com/avatar.png'
              />
            </Form.Group>

            <p className='set-avatar-url-counter'>
              {remaining} bytes remaining
            </p>

            {err && <p className='set-avatar-url-error'>{err}</p>}

            <Button type='submit' variant='primary' disabled={settingAvatarUrl}>
              {settingAvatarUrl ? 'Setting Avatar URL...' : 'Set Avatar URL'}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

export default SetAvatarUrl

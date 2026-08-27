/*
  Set Bio view: compose and broadcast a Memo profile text, with a byte counter
  that counts down from the bio limit. On success the user is navigated to the
  account page.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import MemoSetBio from '../../../services/memo-set-bio'
import SetBioPage from '../../../services/set-bio-page'
import { byteLength } from '../../../services/utf8'

function SetBio (props) {
  const { appData } = props
  const navigate = useNavigate()

  const maxBytes = MemoSetBio.MAX_BIO_BYTES
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [settingBio, setSettingBio] = useState(false)

  const remaining = maxBytes - byteLength(input)

  async function handleSubmit (event) {
    event.preventDefault()
    setErr('')
    setSettingBio(true)

    try {
      const memoSetBio = new MemoSetBio({ wallet: appData?.wallet, profiles: appData?.profiles })
      const page = new SetBioPage({ memoSetBio, navigate })
      page.setInput(input)

      const result = await page.submit()
      if (!result.ok) {
        if (result.error === 'bio_length') {
          setErr(`Bio is too long. Maximum is ${maxBytes} bytes.`)
        } else if (result.error === 'bio_validation') {
          setErr('Bio must not be empty.')
        } else if (result.message) {
          setErr(`Failed to broadcast: ${result.message}`)
        } else {
          setErr('Failed to set bio.')
        }
      }
      // On success page.submit() navigated to the account page.
    } catch (submitErr) {
      setErr(submitErr.message)
    } finally {
      setSettingBio(false)
    }
  }

  return (
    <Container>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='set-bio-heading'>
            <h1>Set Bio</h1>
            <p>Set your profile bio and publish it to Bitcoin Cash.</p>
          </header>

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId='set-bio-input' className='mb-3'>
              <Form.Label><b>Bio</b></Form.Label>
              <Form.Control
                as='textarea'
                rows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Write a short bio...'
              />
            </Form.Group>

            <p className='set-bio-counter'>
              {remaining} bytes remaining
            </p>

            {err && <p className='set-bio-error'>{err}</p>}

            <Button type='submit' variant='primary' disabled={settingBio}>
              {settingBio ? 'Setting Bio...' : 'Set Bio'}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

export default SetBio

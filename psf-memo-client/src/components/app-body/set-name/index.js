/*
  Set Name view: compose and broadcast a Memo display name, with a byte counter
  that counts down from the name limit. On success the user is navigated to
  the account page.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import MemoSetName from '../../../services/memo-set-name'
import SetNamePage from '../../../services/set-name-page'
import { byteLength } from '../../../services/utf8'

function SetName (props) {
  const { appData } = props
  const navigate = useNavigate()

  const maxBytes = MemoSetName.MAX_NAME_BYTES
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [settingName, setSettingName] = useState(false)

  const remaining = maxBytes - byteLength(input)

  async function handleSubmit (event) {
    event.preventDefault()
    setErr('')
    setSettingName(true)

    try {
      const memoSetName = new MemoSetName({ wallet: appData?.wallet, profiles: appData?.profiles })
      const page = new SetNamePage({ memoSetName, navigate })
      page.setInput(input)

      const result = await page.submit()
      if (!result.ok) {
        if (result.error === 'name_length') {
          setErr(`Name is too long. Maximum is ${maxBytes} bytes.`)
        } else if (result.error === 'name_validation') {
          setErr('Name must not be empty.')
        } else if (result.message) {
          setErr(`Failed to broadcast: ${result.message}`)
        } else {
          setErr('Failed to set name.')
        }
      }
      // On success page.submit() navigated to the account page.
    } catch (submitErr) {
      setErr(submitErr.message)
    } finally {
      setSettingName(false)
    }
  }

  return (
    <Container>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='set-name-heading'>
            <h1>Set Name</h1>
            <p>Choose a display name and publish it to Bitcoin Cash.</p>
          </header>

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId='set-name-input' className='mb-3'>
              <Form.Label><b>Name</b></Form.Label>
              <Form.Control
                type='text'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Enter your display name...'
              />
            </Form.Group>

            <p className='set-name-counter'>
              {remaining} bytes remaining
            </p>

            {err && <p className='set-name-error'>{err}</p>}

            <Button type='submit' variant='primary' disabled={settingName}>
              {settingName ? 'Setting Name...' : 'Set Name'}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

export default SetName

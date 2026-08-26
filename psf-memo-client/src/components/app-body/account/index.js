/*
  Account view: show the authenticated user's display name and offer a button
  to navigate to the Set Name page.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Button, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import MemoDb from '../../../services/memo-db'
import AccountPage from '../../../services/account-page'
import { truncateAddr } from '../../../util'

function Account (props) {
  const { appData } = props
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState(null)

  const wallet = appData?.wallet
  const address = wallet?.walletInfo?.cashAddress || ''

  useEffect(() => {
    const loadName = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        const profile = await memoDb.getName(address)
        setName(profile?.name || null)
      } catch (err) {
        setError(err.message || 'Failed to load name')
      }

      setLoading(false)
    }

    if (address) {
      loadName()
    } else {
      setLoading(false)
    }
  }, [address])

  const accountPage = new AccountPage({
    wallet,
    profiles: appData?.profiles,
    navigate
  })

  const displayName = name || accountPage.getName() || truncateAddr(address, 24)

  return (
    <Container className='account-page mt-4'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <h1>Account</h1>

          {error && <p className='text-danger'>{error}</p>}

          {loading && (
            <div className='text-center my-5'>
              <Spinner animation='border' role='status' variant='primary'>
                <span className='visually-hidden'>Loading...</span>
              </Spinner>
            </div>
          )}

          {!loading && (
            <div className='account-details'>
              <p className='account-name'>
                <strong>Name: </strong>
                {displayName}
              </p>
              <p className='account-address'>
                <strong>Address: </strong>
                {address}
              </p>

              {accountPage.hasSetNameButton() && (
                <Button
                  variant='primary'
                  onClick={() => accountPage.clickSetName()}
                >
                  Set Name
                </Button>
              )}
            </div>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default Account

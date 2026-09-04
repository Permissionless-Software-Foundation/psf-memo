/*
  Display the most recent Memo profiles from psf-memo-db.
*/

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Spinner, Table, Button } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import RecentProfilesPage from '../../../services/recent-profiles-page'
import AppUtil, { truncateAddr, truncateTxid } from '../../../util'
import '../../../App.css'

const appUtil = new AppUtil()
const PAGE_SIZE = 50

function formatSeen (seen) {
  if (!seen) return ''
  const ms = seen > 1e12 ? seen : seen * 1000
  return new Date(ms).toLocaleString()
}

function RecentProfiles () {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoading(true)
        setError(null)
        const memoDb = new MemoDb()
        const page = new RecentProfilesPage({ memoDb })
        const data = await page.load({ limit: PAGE_SIZE, offset })
        setProfiles(data.profiles || [])
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.message || 'Failed to load recent profiles')
        setProfiles([])
        setPagination(null)
      }
      setLoading(false)
    }

    loadProfiles()
  }, [offset])

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  return (
    <Container>
      <Row>
        <Col>
          <h1 className='mt-4'>Recent Profiles</h1>
          {pagination && (
            <p className='text-muted'>
              Showing {profiles.length} of {pagination.total} profiles
            </p>
          )}

          {error && <p className='text-danger'>{error}</p>}

          {loading && (
            <div className='text-center my-5'>
              <Spinner animation='border' role='status' variant='primary'>
                <span className='visually-hidden'>Loading...</span>
              </Spinner>
            </div>
          )}

          {!loading && !error && (
            <Table striped bordered hover responsive className='mt-3'>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Bio</th>
                  <th>Block</th>
                  <th>Seen</th>
                  <th>TXID</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={`${profile.addr}-${profile.txid}`}>
                    <td>
                      <Link
                        to={`/profile/${encodeURIComponent(profile.addr)}`}
                        style={{ fontFamily: 'monospace' }}
                        title={profile.addr}
                      >
                        {truncateAddr(profile.addr, 24)}
                      </Link>
                    </td>
                    <td>{profile.text}</td>
                    <td>{profile.blockHeight}</td>
                    <td>{formatSeen(profile.seen)}</td>
                    <td>
                      <span
                        style={{ fontFamily: 'monospace', cursor: 'pointer' }}
                        title={profile.txid}
                        onClick={() => appUtil.copyToClipboard(profile.txid)}
                      >
                        {truncateTxid(profile.txid, 20)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {!loading && !error && (pagination || offset > 0) && (
            <div className='recent-profiles-pagination'>
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

export default RecentProfiles

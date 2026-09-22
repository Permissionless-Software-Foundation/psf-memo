/*
  Display the most recent Memo profiles from psf-memo-db.
*/

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Row, Col, Spinner, Table, Button, Modal } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import MemoFollow from '../../../services/memo-follow'
import RecentProfilesPage from '../../../services/recent-profiles-page'
import { getViewerAddress } from '../../../services/profile-wallet'
import {
  RECENT_PROFILES_TABLE_HEADERS,
  buildRecentProfileAccount,
  buildRecentProfileFollow
} from '../../../services/recent-profiles-table'
import RecentProfileAccount from './recent-profile-account'
import RecentProfileFollowButton from './recent-profile-follow-button'
import RecentProfileFollowConfirm from './recent-profile-follow-confirm'
import RecentProfileFollowResult from './recent-profile-follow-result'
import { truncateAddr } from '../../../util'
import '../../../App.css'

const PAGE_SIZE = 50

function formatSeen (seen) {
  if (!seen) return ''
  const ms = seen > 1e12 ? seen : seen * 1000
  return new Date(ms).toLocaleString()
}

function RecentProfiles (props) {
  const { appData } = props
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [followState, setFollowState] = useState({})
  const [busy, setBusy] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showFollowResultModal, setShowFollowResultModal] = useState(false)
  const [followResult, setFollowResult] = useState(null)
  const [pendingFollow, setPendingFollow] = useState(null)

  const wallet = appData?.wallet || null
  const appProfiles = appData?.profiles || null
  const myAddr = getViewerAddress(appData)

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoading(true)
        setError(null)
        const memoDb = new MemoDb()
        const memoFollow = myAddr && wallet
          ? new MemoFollow({ wallet, profiles: appProfiles })
          : null
        const recentProfilesPage = new RecentProfilesPage({ memoDb, myAddr, memoFollow })
        const data = await recentProfilesPage.load({ limit: PAGE_SIZE, offset })
        setProfiles(data.profiles || [])
        setPagination(data.pagination || null)
        setPage(recentProfilesPage)
        setFollowState(data.followState || {})
      } catch (err) {
        setError(err.message || 'Failed to load recent profiles')
        setProfiles([])
        setPagination(null)
      }
      setLoading(false)
    }

    loadProfiles()
  }, [offset, myAddr, wallet, appProfiles])

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  // Open the confirmation modal for one row. Nothing is broadcast until the
  // viewer confirms.
  const handleFollowClick = (addr) => {
    if (!page || busy) return
    setError(null)
    page.requestFollow(addr)
    setPendingFollow(page.pendingFollow)
    setFollowResult(null)
    setFollowLoading(false)
    setShowFollowResultModal(true)
  }

  // Confirm the pending follow/unfollow and keep the row and result modal in
  // sync with the controller.
  const handleConfirmFollow = async () => {
    if (!page || busy) return
    setBusy(true)
    setFollowLoading(true)
    setPendingFollow(null)
    try {
      await page.confirmFollow()
      setFollowState({ ...page.followState })
      setFollowResult(page.lastFollowResult)
    } catch (err) {
      setError(err.message || 'Failed to follow')
    }
    setFollowLoading(false)
    setBusy(false)
  }

  // Cancel the confirmation without broadcasting.
  const handleCancelFollow = () => {
    if (page) page.cancelFollow()
    setPendingFollow(null)
    setShowFollowResultModal(false)
  }

  const handleDismissFollowResult = () => {
    if (page) page.dismissFollowResult()
    setPendingFollow(null)
    setShowFollowResultModal(false)
  }

  const followSucceeded = Boolean(followResult && followResult.ok)

  return (
    <Container>
      <Row>
        <Col>
          <h1 className='mt-4'>Recent Profiles</h1>
          <p className='text-muted'>
            Memo profiles on Bitcoin Cash, ordered by most recent post.
          </p>
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
                  {RECENT_PROFILES_TABLE_HEADERS.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={`${profile.addr}-${profile.txid}`}>
                    <td>
                      <RecentProfileAccount account={buildRecentProfileAccount(profile)} onProfileClick={navigate} />
                    </td>
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
                      <RecentProfileFollowButton
                        follow={buildRecentProfileFollow(profile, {
                          myAddr,
                          following: followState[profile.addr] === true
                        })}
                        onClick={handleFollowClick}
                      />
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

      <Modal show={showFollowResultModal} onHide={handleDismissFollowResult} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {pendingFollow ? 'Confirm follow' : followLoading || followSucceeded ? 'Follow broadcast' : 'Follow failed'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pendingFollow
            ? (
              <RecentProfileFollowConfirm
                message={page ? page.getFollowConfirmMessage() : ''}
                onYes={handleConfirmFollow}
                onNo={handleCancelFollow}
              />
              )
            : (
              <RecentProfileFollowResult
                loading={followLoading}
                txid={followSucceeded ? followResult.txid : ''}
                message={page ? page.getFollowBroadcastMessage() : ''}
                error={page ? page.getFollowResultError() : ''}
                explorerUrl={followSucceeded ? page.explorerUrl(followResult.txid) : ''}
              />
              )}
        </Modal.Body>
        {!pendingFollow && (
          <Modal.Footer>
            <Button variant='primary' onClick={handleDismissFollowResult}>
              Close
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </Container>
  )
}

export default RecentProfiles

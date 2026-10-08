/*
  Account view: the authenticated account's identity sidebar (avatar, bio,
  copyable BCH address, SLP token icons) and the Set Name, Set Bio, and Set
  Avatar URL controls, each preceded by a description of what it does.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

// Local libraries
import MemoDb from '../../../services/memo-db'
import AccountPage from '../../../services/account-page'
import { applyLike } from '../../../services/profile-post-like'
import AccountSidebar from './account-sidebar'
import { AccountPostsFeed } from './account-posts-feed'
import AccountControls from '../../../components/account/account-controls'
import PostThreadModal from '../../../components/post-thread-modal'
import LikeTipModal from '../../../components/post-feed/like-tip-modal'
import AppUtil from '../../../util'
import '../profile/profile.css'
import './account.css'

const PAGE_SIZE = 50
const appUtil = new AppUtil()

const CONTROL_HANDLERS = {
  'Set Name': (page) => page.clickSetName(),
  'Set Bio': (page) => page.clickSetBio(),
  'Set Avatar URL': (page) => page.clickSetAvatarUrl()
}

function Account (props) {
  const { appData } = props
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState(null)
  const [bio, setBio] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [addressCopied, setAddressCopied] = useState(false)
  const [tokenIcons, setTokenIcons] = useState([])
  const [accountPage, setAccountPage] = useState(null)
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)
  const [likes, setLikes] = useState({})
  const [likeTarget, setLikeTarget] = useState(null)
  const [threadTxid, setThreadTxid] = useState(null)
  const [showThreadModal, setShowThreadModal] = useState(false)

  const wallet = appData?.wallet
  const address = wallet?.walletInfo?.cashAddress || ''

  useEffect(() => {
    let page = null
    setAddressCopied(false)
    setTokenIcons([])

    const loadAccount = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        page = new AccountPage({
          wallet,
          profiles: appData?.profiles,
          memoDb,
          navigate,
          tokenSource: wallet,
          copyToClipboard: (text) => appUtil.copyToClipboard(text),
          onAddressCopyChange: setAddressCopied,
          onTokenIconsChange: setTokenIcons
        })

        const [profile, nameDoc, profilePic] = await Promise.all([
          memoDb.getProfile(address),
          memoDb.getName(address),
          memoDb.getProfilePic(address)
        ])
        setBio(profile?.text || null)
        setName(nameDoc?.name || null)
        setAvatarUrl(profilePic?.url || null)
        setAccountPage(page)

        const pageData = await page.load({ limit: PAGE_SIZE, offset })
        setPosts(pageData.posts || [])
        setPagination(pageData.pagination || null)

        // Phase two: resolve each token's genesis name and mutable-data image
        // asynchronously. onTokenIconsChange re-renders the sidebar when it
        // completes.
        page.loadTokenData().catch(() => {})
      } catch (err) {
        setError(err.message || 'Failed to load account')
      }

      setLoading(false)
    }

    if (address) {
      loadAccount()
    } else {
      setLoading(false)
    }

    return () => {
      if (page) page.destroy()
    }
  }, [address, appData?.profiles, navigate, wallet, offset])

  const openThread = (txid) => {
    setThreadTxid(txid)
    setShowThreadModal(true)
  }

  const closeThread = () => {
    setShowThreadModal(false)
    setThreadTxid(null)
  }

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  const handleLikeSuccess = () => {
    if (!likeTarget) return
    const target = likeTarget
    setLikes((prev) => applyLike(prev, target))
  }

  const displayName = accountPage
    ? accountPage.getDisplayName(name)
    : (name || '')
  const displayAvatarUrl = accountPage
    ? accountPage.getDisplayAvatarUrl(avatarUrl)
    : avatarUrl
  const displayBio = (accountPage && accountPage.getBio()) || bio || ''

  const handleCopyAddress = () => {
    if (!accountPage) return
    accountPage.copyAddress().catch((err) => {
      setError(err.message || 'Failed to copy address')
    })
  }

  const controls = accountPage
    ? accountPage.getControls().map((control) => ({
      ...control,
      onClick: () => {
        const handler = CONTROL_HANDLERS[control.label]
        if (handler) handler(accountPage)
      }
    }))
    : []

  return (
    <Container fluid className='account-page mt-4'>
      {error && <p className='text-danger'>{error}</p>}

      {loading && (
        <div className='text-center my-5'>
          <Spinner animation='border' role='status' variant='primary'>
            <span className='visually-hidden'>Loading...</span>
          </Spinner>
        </div>
      )}

      {!loading && (
        <Row>
          <Col lg={3} md={4} className='profile-sidebar mb-4'>
            <AccountSidebar
              addr={address}
              avatarUrl={displayAvatarUrl}
              bio={displayBio}
              copied={addressCopied}
              onCopyAddress={handleCopyAddress}
              onProfileClick={() => { if (accountPage) accountPage.clickProfileLink() }}
              tokens={tokenIcons}
            />
          </Col>

          <Col lg={9} md={8}>
            <h1>Account</h1>
            <p className='account-name'>
              <strong>Name: </strong>
              {displayName}
            </p>
            <AccountControls controls={controls} />

            <div className='account-posts mt-4'>
              <h2 className='account-posts-title'>Posts</h2>
              <AccountPostsFeed
                posts={posts}
                wallet={wallet}
                profiles={appData?.profiles}
                likes={likes}
                onLike={(post) => setLikeTarget(post)}
                onReply={(post) => openThread(post.txid)}
              />

              {(pagination || offset > 0) && (
                <div className='account-posts-pagination mt-3'>
                  <Button
                    variant='outline-dark'
                    onClick={handlePrevious}
                    disabled={offset === 0}
                  >
                    Previous
                  </Button>

                  <Button
                    variant='outline-dark'
                    className='ms-2'
                    onClick={handleNext}
                    disabled={!(pagination && pagination.hasMore)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </Col>
        </Row>
      )}

      <PostThreadModal
        show={showThreadModal}
        txid={threadTxid}
        onHide={closeThread}
        wallet={appData?.wallet}
        profiles={appData?.profiles || {}}
      />

      <LikeTipModal
        show={Boolean(likeTarget)}
        post={likeTarget}
        wallet={wallet}
        profiles={appData?.profiles || {}}
        onHide={() => setLikeTarget(null)}
        onSuccess={handleLikeSuccess}
      />
    </Container>
  )
}

export default Account

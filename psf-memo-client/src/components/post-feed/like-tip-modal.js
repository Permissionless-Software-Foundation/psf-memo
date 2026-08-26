/*
  Like / Tip modal for a post.

  Lets the user submit a Memo like (0x6d04) with an optional satoshi tip to the
  post author. The wallet and target post are injected through props. Errors
  from validation, dust/maximum/balance checks, and broadcast failures are
  surfaced in the modal body.
*/

import React, { useState, useEffect } from 'react'
import { Modal, Form, Button } from 'react-bootstrap'

import MemoLike from '../../services/memo-like'
import LikeTipPage from '../../services/like-tip-page'
import { getDisplayName } from './post-display'
import './post-feed.css'

function formatError (result) {
  if (!result || result.ok) return ''
  return result.message || ''
}

function LikeTipModal ({ show, post, wallet, profiles = {}, onHide, onSuccess }) {
  const [tip, setTip] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const displayName = post ? getDisplayName(post.addr, profiles) : ''

  // Reset state whenever the modal is shown and check the wallet balance.
  useEffect(() => {
    if (!show || !post || !wallet) {
      setTip('')
      setError('')
      setSubmitting(false)
      return
    }

    setTip('')
    setError('')
    setSubmitting(false)

    let cancelled = false

    const checkBalance = async () => {
      try {
        // Refresh the wallet's spendable UTXOs so the gating balance check is
        // accurate against the live minimal-slp-wallet (which exposes
        // wallet.utxos as a UtxoStore object, not an array).
        if (typeof wallet.getUtxos === 'function') {
          await wallet.getUtxos()
        }
        if (cancelled) return

        const memoLike = new MemoLike({ wallet })
        const page = new LikeTipPage({ memoLike })
        const result = page.open(post.txid, post.addr)
        if (!result.ok) {
          setError(formatError(result))
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    checkBalance()

    return () => { cancelled = true }
  }, [show, post, wallet])

  async function handleSubmit () {
    if (!post || !wallet) return
    setError('')
    setSubmitting(true)

    try {
      const memoLike = new MemoLike({ wallet })
      const page = new LikeTipPage({ memoLike })
      page.open(post.txid, post.addr)
      page.setTip(tip)

      const result = await page.submit()
      if (result.ok) {
        setTip('')
        if (typeof onSuccess === 'function') {
          onSuccess()
        }
      } else {
        setError(formatError(result))
      }
    } catch (submitErr) {
      setError(submitErr.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancel () {
    setTip('')
    setError('')
    onHide()
  }

  return (
    <Modal show={show} onHide={handleCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Like / Tip</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {post && (
          <p className='like-tip-modal-target'>
            Like the post by <strong>{displayName}</strong>
          </p>
        )}

        <Form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          <Form.Group controlId='like-tip-amount' className='mb-3'>
            <Form.Label>Tip (satoshis, optional)</Form.Label>
            <Form.Control
              type='number'
              min='0'
              step='1'
              placeholder='0'
              value={tip}
              onChange={(e) => {
                setTip(e.target.value)
                // Clear a previous validation error so the user can retry.
                setError('')
              }}
              disabled={submitting}
            />
          </Form.Group>
        </Form>

        {error && (
          <p className='like-tip-modal-error text-danger'>{error}</p>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant='secondary' onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          variant='primary'
          onClick={handleSubmit}
          disabled={submitting || !post || !wallet}
        >
          {submitting ? 'Liking...' : 'Like'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default LikeTipModal

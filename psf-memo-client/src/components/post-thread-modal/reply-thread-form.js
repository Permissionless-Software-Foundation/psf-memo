/*
  Reply form rendered inside the post thread modal.

  Composes and broadcasts a Memo reply (0x6d03) to the displayed post,
  with a live byte counter counting down from the 184-byte reply limit.
  On success, the reply is added to the thread optimistically so the user
  sees it immediately without waiting for the network crawl/index cycle.

  The wallet and optional profile store are injected through props.
*/

import React, { useState } from 'react'
import { Form, Button } from 'react-bootstrap'

import MemoReply from '../../services/memo-reply'
import ReplyThreadPage from '../../services/reply-thread-page'
import { byteLength } from '../../services/utf8'
import { buildOptimisticReply } from '../../services/optimistic-reply'

function ReplyThreadForm ({ parentTxid, rootPost, wallet, profiles, onOptimisticReply }) {
  const maxBytes = MemoReply.MAX_REPLY_BYTES
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [replying, setReplying] = useState(false)

  const remaining = maxBytes - byteLength(input)
  const overLimit = remaining < 0

  async function handleSubmit (event) {
    event.preventDefault()
    setErr('')
    setReplying(true)

    try {
      const memoReply = new MemoReply({ wallet, thread: null })
      const page = new ReplyThreadPage({ memoReply })
      page.setParent(parentTxid)
      page.setInput(input)

      const result = await page.submit()
      if (result.ok) {
        setInput('')
        if (typeof onOptimisticReply === 'function') {
          const cashAddress = wallet?.walletInfo?.cashAddress
          const displayName = profiles?.[cashAddress]?.name || null
          onOptimisticReply(buildOptimisticReply({
            txid: result.txid,
            addr: cashAddress,
            text: input,
            seen: Date.now(),
            blockHeight: rootPost?.blockHeight,
            displayName
          }))
        }
      } else {
        if (result.error === 'reply_length') {
          setErr(`Reply is too long. Maximum is ${maxBytes} bytes.`)
        } else if (result.error === 'reply_validation') {
          setErr('Reply must not be empty.')
        } else if (result.message) {
          setErr(`Failed to broadcast: ${result.message}`)
        } else {
          setErr('Failed to post reply.')
        }
      }
    } catch (submitErr) {
      setErr(submitErr.message)
    } finally {
      setReplying(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit} className='reply-thread-form' data-testid='reply-thread-form'>
      <Form.Group controlId='reply-thread-message' className='mb-2'>
        <Form.Label><b>Reply</b></Form.Label>
        <Form.Control
          as='textarea'
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Write a reply...'
          disabled={replying}
        />
      </Form.Group>

      <p className={`reply-thread-counter${overLimit ? ' reply-thread-counter-over' : ''}`}>
        {remaining} bytes remaining
      </p>

      {err && <p className='reply-thread-error'>{err}</p>}

      <Button type='submit' variant='primary' disabled={replying || overLimit || byteLength(input) === 0}>
        {replying ? 'Posting Reply...' : 'Post Reply'}
      </Button>
    </Form>
  )
}

export default ReplyThreadForm

/*
  Single-post permalink page served at /posts/thread/:txid.

  This is the thin UI adapter over the tested SinglePostPage controller. It
  loads one root Memo post and its reply thread, shows the replies ten per page
  with a "Load more replies" control, copies the page permalink, and offers the
  normal like and reply actions on the root post and on every reply. Unknown
  txids render "Post not found" and a failed request renders the error.
*/

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap'

import MemoDb from '../../../services/memo-db'
import SinglePostPage from '../../../services/single-post-page'
import PostFeedItem from '../../post-feed/post-feed-item'
import ReplyThreadForm from '../../post-thread-modal/reply-thread-form'
import {
  collectThreadAddrs,
  loadThreadProfiles
} from '../../post-thread-modal/thread-profiles'
import '../../../App.css'
import '../../post-feed/post-feed.css'

function SinglePost ({ appData }) {
  const { txid } = useParams()
  const wallet = appData?.wallet

  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState({})
  const [replyTarget, setReplyTarget] = useState(txid)
  const [optimisticReplies, setOptimisticReplies] = useState([])
  const [, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setProfiles({})
      setOptimisticReplies([])
      setPage(null)

      const controller = new SinglePostPage({
        memoDb: new MemoDb(),
        wallet,
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        copyToClipboard: async (text) => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(text)
          }
        }
      })

      await controller.load(txid)
      if (cancelled) return

      setPage(controller)
      setReplyTarget(txid)
      setVersion((value) => value + 1)

      if (controller.rootPost) {
        const addrs = collectThreadAddrs(controller.rootPost)
        const map = await loadThreadProfiles(addrs, controller.memoDb)
        if (!cancelled) setProfiles(map)
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [txid, wallet])

  const handleLoadMore = useCallback(() => {
    if (!page) return
    page.loadMoreReplies()
    setVersion((value) => value + 1)
  }, [page])

  const handleCopyLink = useCallback(async () => {
    if (!page) return
    await page.copyLink()
    setVersion((value) => value + 1)
  }, [page])

  const handleOptimisticReply = useCallback((reply) => {
    if (page && !page.getPost(reply.txid)) {
      page.addReply(reply)
      setVersion((value) => value + 1)
    }
    setOptimisticReplies((previous) => [...previous, reply])
  }, [page])

  const renderPost = (post, isReply) => (
    <PostFeedItem
      key={post.txid}
      post={post}
      profiles={profiles}
      wallet={wallet}
      showFooterMeta
      showRepliedLabel={isReply}
      onReplyClick={() => setReplyTarget(post.txid)}
    />
  )

  return (
    <Container className='single-post-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          {loading && (
            <div className='text-center my-5'>
              <Spinner animation='border' role='status'>
                <span className='visually-hidden'>Loading post...</span>
              </Spinner>
            </div>
          )}

          {!loading && page && page.error && (
            <p className='single-post-error'>{page.error}</p>
          )}

          {!loading && page && !page.error && page.notFound && (
            <p className='single-post-not-found'>Post not found</p>
          )}

          {!loading && page && page.rootPost && (
            <>
              <header className='single-post-heading'>
                <h1>Post</h1>
                <Button
                  variant='outline-dark'
                  size='sm'
                  className='single-post-copy-link'
                  onClick={handleCopyLink}
                >
                  Copy link
                </Button>
                {page.linkCopied && (
                  <span className='single-post-copy-confirmation' role='status'>
                    Link copied
                  </span>
                )}
              </header>

              <div className='posts-feed'>
                {renderPost(page.rootPost, false)}

                {page.visibleReplies().map((reply) => renderPost(reply, true))}

                {optimisticReplies
                  .filter((reply) => !page.getPost(reply.txid))
                  .map((reply) => renderPost(reply, true))}
              </div>

              {page.canLoadMoreReplies() && (
                <div className='single-post-pagination'>
                  <Button
                    variant='outline-dark'
                    className='single-post-load-more'
                    onClick={handleLoadMore}
                  >
                    Load more replies
                  </Button>
                </div>
              )}

              <ReplyThreadForm
                parentTxid={replyTarget}
                rootPost={page.rootPost}
                wallet={wallet}
                profiles={profiles}
                onOptimisticReply={handleOptimisticReply}
              />
            </>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default SinglePost

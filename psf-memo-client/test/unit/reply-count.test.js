/*
  Unit tests for the reply-count view model.

  The view model decides the label, tooltip, accessible name, and interactive
  attributes for a reply-count indicator. These tests pin every branch so the
  React wrapper can stay branch-free.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  replyCountLabel,
  isReplyCountActivationKey,
  replyCountClassName,
  replyCountTitle,
  replyCountAriaLabel,
  makeReplyCountKeyDown,
  replyCountInteractiveProps,
  buildReplyCountViewModel
} = require('../../src/services/reply-count')

function makeEvent (key) {
  return { key, prevented: false, preventDefault () { this.prevented = true } }
}

test('replyCountLabel uses the singular form for one reply', () => {
  assert.equal(replyCountLabel(1), '1 reply')
})

test('replyCountLabel uses the plural form for other counts', () => {
  assert.equal(replyCountLabel(0), '0 replies')
  assert.equal(replyCountLabel(2), '2 replies')
})

test('isReplyCountActivationKey is true for Enter and Space only', () => {
  assert.equal(isReplyCountActivationKey({ key: 'Enter' }), true)
  assert.equal(isReplyCountActivationKey({ key: ' ' }), true)
  assert.equal(isReplyCountActivationKey({ key: 'a' }), false)
})

test('replyCountClassName marks the clickable and disabled variants', () => {
  assert.equal(replyCountClassName(true), 'post-reply-count post-reply-count-always-clickable')
  assert.equal(replyCountClassName(false), 'post-reply-count post-reply-count-disabled')
})

test('replyCountTitle and replyCountAriaLabel add the click hint only when clickable', () => {
  assert.equal(replyCountTitle('2 replies', false), '2 replies')
  assert.equal(replyCountTitle('2 replies', true), '2 replies — click to view')
  assert.equal(replyCountAriaLabel('2 replies', false), '2 replies')
  assert.equal(replyCountAriaLabel('2 replies', true), '2 replies — click to view thread')
})

test('makeReplyCountKeyDown returns undefined when not clickable', () => {
  assert.equal(makeReplyCountKeyDown(false, () => {}), undefined)
})

test('makeReplyCountKeyDown activates on Enter and Space and ignores other keys', () => {
  let clicks = 0
  const onKeyDown = makeReplyCountKeyDown(true, () => { clicks++ })

  const enter = makeEvent('Enter')
  onKeyDown(enter)
  const space = makeEvent(' ')
  onKeyDown(space)
  onKeyDown(makeEvent('a'))

  assert.equal(enter.prevented, true)
  assert.equal(space.prevented, true)
  assert.equal(clicks, 2)
})

test('replyCountInteractiveProps is inert when not clickable', () => {
  assert.deepEqual(replyCountInteractiveProps(false, () => {}, () => {}), {
    role: undefined,
    tabIndex: undefined,
    onClick: undefined,
    onKeyDown: undefined
  })
})

test('replyCountInteractiveProps exposes button semantics when clickable', () => {
  const onClick = () => {}
  const onKeyDown = () => {}
  const props = replyCountInteractiveProps(true, onClick, onKeyDown)

  assert.equal(props.role, 'button')
  assert.equal(props.tabIndex, 0)
  assert.equal(props.onClick, onClick)
  assert.equal(props.onKeyDown, onKeyDown)
})

test('buildReplyCountViewModel describes a disabled count', () => {
  const view = buildReplyCountViewModel({ count: 0 })

  assert.equal(view.label, '0 replies')
  assert.equal(view.clickable, false)
  assert.equal(view.className, 'post-reply-count post-reply-count-disabled')
  assert.equal(view.title, '0 replies')
  assert.equal(view.ariaLabel, '0 replies')
  assert.equal(view.role, undefined)
  assert.equal(view.onClick, undefined)
  assert.equal(view.onKeyDown, undefined)
})

test('buildReplyCountViewModel describes a clickable count', () => {
  const onClick = () => {}
  const view = buildReplyCountViewModel({ count: 1, onClick })

  assert.equal(view.label, '1 reply')
  assert.equal(view.clickable, true)
  assert.equal(view.className, 'post-reply-count post-reply-count-always-clickable')
  assert.equal(view.title, '1 reply — click to view')
  assert.equal(view.ariaLabel, '1 reply — click to view thread')
  assert.equal(view.role, 'button')
  assert.equal(view.tabIndex, 0)
  assert.equal(view.onClick, onClick)
  assert.equal(typeof view.onKeyDown, 'function')
})

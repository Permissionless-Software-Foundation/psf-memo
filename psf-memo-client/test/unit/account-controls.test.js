/*
  Unit tests for the account controls presentation component.

  The account page right column shows the Set Name, Set Bio, and Set Avatar URL
  controls. Each control is preceded by a short description of what it does.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const AccountControls = require('../../src/components/account/account-controls')

const CONTROLS = [
  {
    label: 'Set Name',
    description: 'Set the name shown next to your posts and on your profile.'
  },
  {
    label: 'Set Bio',
    description: 'Write the profile text shown on your profile page.'
  },
  {
    label: 'Set Avatar URL',
    description: 'Set the URL of the image used as your profile picture.'
  }
]

function renderControls (controls = CONTROLS) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(AccountControls, { controls })
  )
}

test('renders no markup when there are no controls', () => {
  assert.equal(renderControls([]), '')
})

test('renders one button per control', () => {
  const html = renderControls()

  assert.equal((html.match(/<button/g) || []).length, 3)
  assert.ok(html.includes('>Set Name<'))
  assert.ok(html.includes('>Set Bio<'))
  assert.ok(html.includes('>Set Avatar URL<'))
})

test('renders each control description above its button', () => {
  const html = renderControls()

  for (const control of CONTROLS) {
    const descriptionIndex = html.indexOf(control.description)
    const buttonIndex = html.indexOf(`>${control.label}<`)
    assert.ok(descriptionIndex >= 0, `missing description for ${control.label}`)
    assert.ok(buttonIndex >= 0, `missing button for ${control.label}`)
    assert.ok(
      descriptionIndex < buttonIndex,
      `description for ${control.label} is not above its button`
    )
  }
})

test('renders the description in the account control description element', () => {
  const html = renderControls([CONTROLS[0]])

  assert.ok(html.includes('class="account-control-description"'))
  assert.ok(html.includes(CONTROLS[0].description))
})

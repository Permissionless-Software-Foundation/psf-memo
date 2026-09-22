/*
  Confirmation body for a follow/unfollow submission.

  Shown before anything is broadcast: asks whether to follow or unfollow the
  profile's display name and offers Yes and No buttons. Yes continues to the
  broadcast; No closes the modal without broadcasting.

  Written in plain React.createElement style so the same module can be used by
  the JSX Recent Profiles page in the browser build and by the acceptance
  adapter that renders HTML under Node.
*/

const React = require('react')

function RecentProfileFollowConfirm ({ message = '', onYes, onNo }) {
  return React.createElement(
    'div',
    { className: 'recent-profile-follow-confirm' },
    React.createElement('p', { className: 'recent-profile-follow-confirm-message' }, message),
    React.createElement(
      'div',
      { className: 'recent-profile-follow-confirm-actions' },
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'recent-profile-follow-confirm-yes',
          onClick: () => { if (onYes) onYes() }
        },
        'Yes'
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'recent-profile-follow-confirm-no',
          onClick: () => { if (onNo) onNo() }
        },
        'No'
      )
    )
  )
}

module.exports = RecentProfileFollowConfirm

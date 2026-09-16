/*
  Shared post options menu.

  Every post card renders this same three-dots menu: a "Post options" button
  whose menu's first item is "See on block explorer", a link to the post
  transaction on bch.loping.net that opens in a new tab. The menu closes on the
  button again, an outside click, or Escape, and ArrowDown moves focus to the
  first item.

  Written in plain React.createElement style so the same module can be used by
  the JSX components in the browser build and by the acceptance adapter that
  renders HTML under Node.
*/

const React = require('react')
const {
  postOptionsItems,
  togglePostOptions,
  focusFirstPostOption,
  handlePostOptionsEscape,
  handlePostOptionsOutsideClick
} = require('../../services/post-options')

function PostOptionsMenu ({
  txid,
  initialOpen = false,
  initialFocusedIndex = -1
}) {
  const [state, setState] = React.useState(() => ({
    open: Boolean(initialOpen),
    focusedIndex: initialFocusedIndex
  }))
  const containerRef = React.useRef(null)
  const items = postOptionsItems(txid)

  // Close the open menu when the user clicks anywhere outside it.
  React.useEffect(() => {
    if (!state.open) return undefined

    const handleDocumentMouseDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setState((previous) => handlePostOptionsOutsideClick(previous))
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [state.open])

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setState((previous) => handlePostOptionsEscape(previous))
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setState((previous) => focusFirstPostOption(previous, items))
    }
  }

  return React.createElement(
    'div',
    {
      className: 'post-options',
      ref: containerRef,
      onKeyDown: handleKeyDown
    },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'post-options-button',
        'aria-label': 'Post options',
        'aria-haspopup': 'menu',
        'aria-expanded': state.open ? 'true' : 'false',
        title: 'Post options',
        onClick: () => setState((previous) => togglePostOptions(previous))
      },
      React.createElement('span', { 'aria-hidden': 'true' }, '•••')
    ),
    state.open &&
      React.createElement(
        'ul',
        {
          className: 'post-options-menu',
          role: 'menu',
          'aria-label': 'Post options'
        },
        items.map((item, index) =>
          React.createElement(
            'li',
            {
              key: item.id,
              className: 'post-options-menu-item',
              role: 'none'
            },
            React.createElement(
              'a',
              {
                href: item.href,
                target: item.target,
                rel: item.rel,
                role: 'menuitem',
                className: 'post-options-link',
                tabIndex: index === state.focusedIndex ? 0 : -1,
                autoFocus: index === state.focusedIndex
              },
              item.label
            )
          )
        )
      )
  )
}

module.exports = PostOptionsMenu

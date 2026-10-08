/*
  Reply count indicator for a post (icon + number).

  Browser entry: loads the component styles and re-exports the shared,
  Node-renderable view so the JSX post cards and the Node acceptance renderer
  show the same element.
*/

import './post-reply-count.css'
import ReplyCountView from './reply-count-view'

export default ReplyCountView

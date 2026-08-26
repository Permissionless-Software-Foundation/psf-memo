/*
  A placeholder view used for unreviewed routes.
*/

// Global npm libraries
import React, { useEffect } from 'react'

function PlaceholderView (props) {
  const { viewNumber } = props

  useEffect(() => {
    console.log(`Placeholder ${viewNumber} loaded.`)
  }, [viewNumber])

  return (
    <>
      <p style={{ padding: '25px' }}>This is placeholder View #{viewNumber}</p>
    </>
  )
}

export default PlaceholderView

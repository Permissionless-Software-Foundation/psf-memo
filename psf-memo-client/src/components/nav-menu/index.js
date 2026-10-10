/*
  This component controlls the navigation menu.

  Inspired from this example:
  https://codesandbox.io/s/react-bootstrap-hamburger-menu-example-rnud4?from-embed
*/

// Global npm libraries
import React, { useState } from 'react'
import { Nav, Navbar, Image } from 'react-bootstrap' // Used for Navbar Style and Layouts .
import { NavLink, Link } from 'react-router-dom' // Used to navigate between routes

// Local libraries
import { NAV_MENU_ENTRIES, isMenuEntryActive } from '../../services/nav-menu'

// Assets
const Logo = '/blippost-logo-assets/png/white-on-green/blippost-white-on-green-128.png'

function NavMenu (props) {
  // Get the current path
  const { currentPath } = props.appData

  // Navbar state
  const [expanded, setExpanded] = useState(false)

  // Handle click event
  const handleClickEvent = () => {
    // Collapse the navbar
    setExpanded(false)
  }

  return (
    <>
      <Navbar expanded={expanded} onToggle={setExpanded} expand='xxxl' bg='dark' variant='dark' style={{ paddingRight: '20px' }}>
        <Navbar.Brand as={Link} to='/posts/recent' style={{ paddingLeft: '20px' }} onClick={handleClickEvent}>
          <Image src={Logo} thumbnail width='50' />{' '}
          Blip Post
        </Navbar.Brand>

        <Navbar.Toggle aria-controls='responsive-navbar-nav' />
        <Navbar.Collapse id='responsive-navbar-nav'>
          <Nav className='mr-auto'>
            {NAV_MENU_ENTRIES.map((entry) => (
              <NavLink
                key={entry.path}
                className={isMenuEntryActive(entry, currentPath) ? 'nav-link-active' : 'nav-link-inactive'}
                to={entry.path}
                onClick={handleClickEvent}
              >
                {entry.label}
              </NavLink>
            ))}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </>
  )
}

export default NavMenu

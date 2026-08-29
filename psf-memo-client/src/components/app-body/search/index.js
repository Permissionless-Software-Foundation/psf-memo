/*
  Search page: submit a query and display matching posts and profiles.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button, Spinner, ListGroup } from 'react-bootstrap'
import { Link } from 'react-router-dom'

// Local libraries
import MemoDb from '../../../services/memo-db'
import SearchPage from '../../../services/search-page'
import '../../../App.css'

function SearchResults (props) {
  const { posts, profiles, searched } = props

  if (!searched) return null

  if (posts.length === 0 && profiles.length === 0) {
    return <p className='search-empty mt-4'>No results found.</p>
  }

  return (
    <>
      {posts.length > 0 && (
        <>
          <h2 className='mt-4'>Posts</h2>
          <ListGroup>
            {posts.map((post) => (
              <ListGroup.Item key={post.txid}>
                <p>{post.text}</p>
                <p className='text-muted' style={{ fontFamily: 'monospace' }}>
                  {post.addr}
                </p>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}

      {profiles.length > 0 && (
        <>
          <h2 className='mt-4'>Profiles</h2>
          <ListGroup>
            {profiles.map((profile) => (
              <ListGroup.Item key={profile.addr}>
                <Link to={`/profile/${encodeURIComponent(profile.addr)}`}>
                  {profile.name || profile.addr}
                </Link>
                {profile.text && <p className='text-muted'>{profile.text}</p>}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}
    </>
  )
}

function Search (props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState([])
  const [searched, setSearched] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const memoDb = new MemoDb()
      const page = new SearchPage({ memoDb })
      page.setQuery(query)
      const result = await page.submit()
      setPosts(result.posts || [])
      setProfiles(result.profiles || [])
    } catch (err) {
      setError(err.message || 'Search failed')
      setPosts([])
      setProfiles([])
    }

    setLoading(false)
  }

  return (
    <Container className='search-page'>
      <Row className='justify-content-center'>
        <Col lg={8} md={10} xs={12}>
          <header className='search-heading'>
            <h1>Search</h1>
            <p>Find posts and profiles on Memo.</p>
          </header>

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId='searchQuery' className='mb-3'>
              <Form.Control
                type='text'
                placeholder='Search posts and profiles...'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
            </Form.Group>
            <Button type='submit' variant='primary' disabled={loading}>
              Search
            </Button>
          </Form>

          {error && <p className='text-danger mt-3'>{error}</p>}

          {loading && (
            <div className='text-center my-5'>
              <Spinner animation='border' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </Spinner>
            </div>
          )}

          {!loading && <SearchResults posts={posts} profiles={profiles} searched={searched} />}
        </Col>
      </Row>
    </Container>
  )
}

export default Search

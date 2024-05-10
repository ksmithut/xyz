import React from 'react'
import { Navigate } from 'react-router-dom'

/**
 * @param {import('react').PropsWithChildren} props
 */
export default function RequireAuth({ children }) {
  const [state, setState] = React.useState({ loading: true, data: false })
  React.useEffect(() => {
    fetch('/api/auth', { credentials: 'same-origin' })
      .then((res) => {
        if (res.ok) setState({ loading: false, data: true })
        else setState({ loading: false, data: false })
      })
      .catch(() => setState({ loading: false, data: false }))
  }, [])
  if (state.loading) return <p>Loading...</p>
  if (state.data) return children
  return <Navigate to="/auth" />
}

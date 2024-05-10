import { createBrowserRouter } from 'react-router-dom'
import Root from './Root.jsx'
import Organization from './routes/orgs.$slug.jsx'
import Favorites from './routes/_index.jsx'
import Auth, { loader as authLoader } from './routes/auth.jsx'
import RequireAuth from './components/RequireAuth.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <Root />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Favorites />
      },
      {
        path: 'orgs/:slug',
        element: <Organization />
      }
    ]
  },
  {
    path: '/auth',
    element: <Auth />,
    loader: authLoader
  }
])

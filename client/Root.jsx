import { Outlet, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import cx from 'clsx'
import { getAllOrganizations } from './fly.js'

export default function Root() {
  return (
    <>
      <header className="bg-white">
        <OrgNav />
      </header>
      <div className="px-4 py-4">
        <Outlet />
      </div>
    </>
  )
}

function OrgNav() {
  const { isLoading, error, data } = useQuery({
    queryKey: ['organizations'],
    queryFn() {
      return getAllOrganizations()
    }
  })
  if (!data) return null
  return (
    <nav className="bg-white shadow">
      <div className="px-2">
        <div className="relative flex h-16 justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center"></div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="ml-6 flex space-x-8">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  cx(
                    'inline-flex items-center border-b-2 px-1 pt-1 font-mono text-xl font-thin',
                    isActive
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )
                }
              >
                XYZ
              </NavLink>
              {data.map((organization) => (
                <NavLink
                  key={organization.id}
                  to={`/orgs/${encodeURIComponent(organization.slug)}`}
                  className={({ isActive }) =>
                    cx(
                      'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium',
                      isActive
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )
                  }
                >
                  {organization.name}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

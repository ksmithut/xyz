import React from 'react'
import { useParams, Outlet, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listApps, listAppMachines } from '../fly.js'
import { Search } from '../components/Search.jsx'
import { AppList } from '../components/AppList.jsx'

export default function Organization() {
  const { slug = '' } = useParams()
  const [search, setSearch] = React.useState('')
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: ['organizationApps', slug],
    async queryFn(args) {
      return listApps(slug)
    }
  })
  const sortedApps = React.useMemo(() => {
    return (
      data?.toSorted((a, b) => {
        if (a.name > b.name) return 1
        if (a.name < b.name) return -1
        return 0
      }) ?? []
    )
  }, [data])

  return (
    <div className="flex flex-col gap-4">
      <Search
        value={search}
        onChange={setSearch}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isError ? (
        <p>An error occurred fetching apps.</p>
      ) : (
        <AppList apps={sortedApps} search={search} />
      )}
      <Outlet />
    </div>
  )
}

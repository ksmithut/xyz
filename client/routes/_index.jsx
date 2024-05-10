import React from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { AppList } from '../components/AppList.jsx'
import { Search } from '../components/Search.jsx'

const favoriteSchema = z.object({
  id: z.string(),
  label: z.string(),
  apps: z.array(z.string())
})

const favoritesSchema = z.array(favoriteSchema)

export default function Favorites() {
  const [search, setSearch] = React.useState('')
  const favorites = useQuery({
    queryKey: ['favorites'],
    async queryFn() {
      const res = await fetch('/api/favorites', {
        credentials: 'same-origin'
      })
      return favoritesSchema.parse(await res.json())
    }
  })
  return (
    <div className="flex flex-col gap-4">
      <Search
        value={search}
        onChange={setSearch}
        isFetching={favorites.isFetching}
        refetch={favorites.refetch}
      />
      {favorites.data?.map((favorite) => (
        <Section key={favorite.id} favorite={favorite} search={search} />
      ))}
    </div>
  )
}

/**
 * @param {object} props
 * @param {z.infer<typeof favoriteSchema>} props.favorite
 * @param {string?} [props.search]
 */
function Section({ favorite, search }) {
  return (
    <>
      <div className="border-b border-gray-300 py-5">
        <h3 className="text-2xl font-bold leading-6 text-gray-700">
          {favorite.label}
        </h3>
      </div>
      <AppList
        apps={favorite.apps.map((app) => ({ id: app, name: app }))}
        search={search}
      />
    </>
  )
}

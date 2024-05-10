import { ArrowPathIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {boolean} props.isFetching
 * @param {() => void} props.refetch
 * @returns
 */
export function Search({ value, onChange, isFetching, refetch }) {
  return (
    <div className="flex items-center gap-4">
      <input
        className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        name="search"
        type="search"
        placeholder="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        disabled={isFetching}
        onClick={() => refetch()}
      >
        <ArrowPathIcon
          className={cx('h-4 w-4', isFetching && 'animate-spin')}
        />
      </button>
    </div>
  )
}

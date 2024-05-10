import React from 'react'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption
} from '@headlessui/react'
import {
  CheckIcon,
  ChevronUpDownIcon,
  XMarkIcon
} from '@heroicons/react/20/solid'
import { useQuery, useMutation } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useNotify } from './Notifications.jsx'
import { listRegions, scaleCount } from '../fly.js'
import { Modal } from './Modal.jsx'
import { streamResponse } from '../lib/stream-response.js'

/**
 * @param {object} params
 * @param {string} params.appName
 */
export function ScaleCountForm({ appName }) {
  const notify = useNotify()
  const notifyError = React.useCallback(
    /**
     * @param {string} heading
     * @param {Error} error
     */
    (heading, error) => {
      console.error(heading, error)
      notify({
        type: 'error',
        content: (
          <>
            <p className="text-sm font-medium text-gray-900">{heading}</p>
            <p className="mt-1 text-sm text-gray-500">{error.message}</p>
          </>
        )
      })
    },
    [notify]
  )
  const [selectedRegions, setSelectedRegions] = React.useState(
    /** @returns {string[]} */
    () => []
  )
  const [count, setCount] = React.useState(2)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [output, setOutput] = React.useState('')
  const scaleAppMachines = useMutation({
    /**
     * @param {object} params
     * @param {string} params.appName
     * @param {number} params.count
     * @param {string[]} params.regions
     */
    async mutationFn({ appName, count, regions }) {
      setOutput('')
      const res = await scaleCount(appName, count, { regions })
      for await (const chunk of streamResponse(res)) {
        setOutput((output) => output + chunk)
      }
      setOutput((output) => (output += '\n[done]'))
    },
    onError(error) {
      notifyError('Error scaling count', error)
    }
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setShowConfirm(true)
      }}
    >
      <div className="flex items-end gap-3 py-3">
        <div>
          <label
            htmlFor="count"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Count
          </label>
          <div className="mt-2">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              name="count"
              id="count"
              className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={count}
              onChange={(e) => setCount(e.target.valueAsNumber)}
              placeholder="Number of machines"
            />
          </div>
        </div>
        <RegionCombobox value={selectedRegions} onChange={setSelectedRegions} />
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Scale Count
        </button>
        <Modal
          title="Scale Application"
          open={showConfirm}
          onClose={setShowConfirm}
          buttons={
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
              onClick={() => {
                scaleAppMachines.mutate({
                  appName,
                  count,
                  regions: selectedRegions
                })
                setShowConfirm(false)
              }}
            >
              Scale Count
            </button>
          }
        >
          <p className="text-sm text-gray-500">
            Are you sure you want to scale{' '}
            <strong>
              <code>{appName}</code>
            </strong>{' '}
            to <strong>{count}</strong> machine(s) in{' '}
            {selectedRegions.length ? (
              <strong className="font-mono">
                {selectedRegions.join(', ')}
              </strong>
            ) : (
              'all regions where there is at least one machine running'
            )}
            ?
          </p>
        </Modal>
      </div>
      {output && (
        <div className="relative">
          <pre className="rounded bg-gray-800 p-3 text-gray-200">{output}</pre>
          <button
            className="absolute right-0 top-0 p-1"
            type="button"
            onClick={() => setOutput('')}
          >
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>
      )}
    </form>
  )
}

/**
 * @param {object} props
 * @param {string[]} props.value
 * @param {(value: string[]) => void} props.onChange
 * @param {boolean} [props.paid]
 * @returns
 */
function RegionCombobox({ value, onChange, paid }) {
  const [query, setQuery] = React.useState('')

  const regions = useQuery({
    queryKey: ['regions'],
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    queryFn() {
      return listRegions()
    }
  })
  const filteredRegions = React.useMemo(() => {
    if (!regions.data) return []
    const normalizedQuery = query.trim().toLowerCase()
    let myRegions = regions.data ?? []
    if (!paid)
      myRegions = myRegions.filter((region) => !region.requiresPaidPlan)
    if (!normalizedQuery) return myRegions
    return myRegions.filter((region) => {
      return (
        region.code.toLowerCase().includes(normalizedQuery) ||
        region.name.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [regions.data, query, paid])

  return (
    <Combobox
      className="flex-grow"
      as="div"
      multiple
      value={value}
      onChange={onChange}
      onClose={() => setQuery('')}
    >
      {value.length ? (
        <div className="flex gap-2">
          {value.map((code) => (
            <button
              key={code}
              type="button"
              className="flex items-center gap-1 rounded bg-white px-2 py-1 font-mono text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={() => onChange(value.filter((v) => v !== code))}
            >
              {code}
              <XMarkIcon className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : (
        <span>&nbsp;</span>
      )}
      <div className="relative mt-2">
        <ComboboxInput
          className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-12 font-mono text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          onChange={(event) => setQuery(event.target.value)}
          onBlur={() => setQuery('')}
          displayValue={(person) => person?.name}
          placeholder="Select regions"
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          <ChevronUpDownIcon
            className="h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </ComboboxButton>

        {filteredRegions.length > 0 && (
          <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredRegions.map((region) => (
              <ComboboxOption
                key={region.code}
                value={region.code}
                className={({ focus }) =>
                  clsx(
                    'relative cursor-default select-none py-2 pl-8 pr-9',
                    focus ? 'bg-indigo-600 text-white' : 'text-gray-900'
                  )
                }
              >
                {({ focus, selected }) => (
                  <>
                    <div className="flex items-center">
                      <span
                        className={clsx(
                          'truncate font-mono',
                          selected && 'font-semibold'
                        )}
                      >
                        {region.code}
                      </span>
                      <span
                        className={clsx(
                          'ml-2 truncate text-xs text-gray-500',
                          focus ? 'text-indigo-200' : 'text-gray-500'
                        )}
                      >
                        {region.name}
                      </span>
                    </div>
                    {selected && (
                      <span
                        className={clsx(
                          'absolute inset-y-0 left-0 flex items-center pl-1.5',
                          focus ? 'text-white' : 'text-indigo-600'
                        )}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        )}
      </div>
    </Combobox>
  )
}

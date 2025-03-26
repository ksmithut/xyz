import React from 'react'
import cx from 'clsx'
import { useQuery, useMutation } from '@tanstack/react-query'
import { RadioGroup, Radio, Label } from '@headlessui/react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Modal } from './Modal.jsx'
import {
  listAppMachines,
  restartMachine,
  stopMachine,
  startMachine,
  waitForState,
  withLease,
  destroyMachine,
  listAppVolumes
} from '../fly.js'
import { useNotifyError } from './Notifications.jsx'
import { ScaleCountForm } from './ScaleCountForm.jsx'
import { MachineChecks } from './MachineChecks.jsx'
import { SidePanel } from './SidePanel.jsx'

/**
 * @param {object} props
 * @param {{id: string, name: string}[]} props.apps
 * @param {string?} [props.search]
 */
export function AppList({ apps, search }) {
  return (
    <div className="flex flex-wrap gap-4">
      {apps.map((app) => (
        <App key={app.id} app={app} search={search} />
      ))}
    </div>
  )
}

/**
 * @param {string} appName
 * @param {number|false} [refetchInterval]
 */
function useMachines(appName, refetchInterval) {
  return useQuery({
    queryKey: ['appMachines', appName],
    queryFn() {
      return listAppMachines(appName)
    },
    refetchInterval
  })
}

/**
 * @param {string} appName
 * @param {number|false} [refetchInterval]
 * @returns
 */
function useVolumes(appName, refetchInterval) {
  return useQuery({
    queryKey: ['appVolumes', appName],
    queryFn() {
      return listAppVolumes(appName)
    },
    refetchInterval
  })
}

/**
 * @param {object} props
 * @param {{id: string, name: string}} props.app
 * @param {string?} [props.search]
 */
function App({ app, search }) {
  const hidden = search && !app.name.includes(search)
  const [open, setOpen] = React.useState(false)
  const machines = useMachines(app.name, 10_000)
  if (hidden) return null
  return (
    <>
      <div className="flex w-64 flex-col divide-y divide-gray-200 rounded-lg bg-white shadow">
        <div className="flex w-full flex-col space-x-6 p-4">
          <h3 className="truncate text-sm font-medium text-gray-900">
            <button onClick={() => setOpen(true)}>
              {hightlightSearch(app.name, search)}
            </button>
          </h3>
        </div>
        <div className="flex flex-grow flex-wrap content-start items-start justify-start gap-3 p-3">
          {machines.error && <p>{machines.error.message}</p>}
          {machines.data?.map((machine) => (
            <MachineChecks key={machine.id} machine={machine}>
              {machine.region}
            </MachineChecks>
          ))}
        </div>
      </div>
      <SidePanel title={app.name} open={open} setOpen={setOpen}>
        <AppDetails app={app} />
      </SidePanel>
    </>
  )
}

/**
 * @param {string} string
 * @param {string?} [search]
 */
function hightlightSearch(string, search) {
  if (!search?.trim()) return [<span key={string}>{string}</span>]
  return string.split(search).flatMap((seg, i, arr) => {
    const segments = [<span key={seg + i}>{seg}</span>]
    if (i !== arr.length - 1)
      segments.push(<mark key={search + i}>{search}</mark>)
    return segments
  })
}

/**
 * @type {{interval: number|false, label: string}[]}
 */
const refreshIntervals = [
  { interval: 1000, label: '1s' },
  { interval: 5000, label: '5s' },
  { interval: 30_000, label: '30s' },
  { interval: 60_000, label: '1m' },
  { interval: false, label: 'None' }
]

/**
 * @param {object} props
 * @param {{ id: string, name: string }} props.app
 */
function AppDetails({ app }) {
  const notifyError = useNotifyError()

  /** @type {React.MutableRefObject<HTMLInputElement|null>} */
  const checkbox = React.useRef(null)
  const [checked, setChecked] = React.useState(false)
  const [indeterminate, setIndeterminate] = React.useState(false)
  const [selectedMachines, setSelectedMachines] = React.useState(
    /** @returns {Set<string>} */
    () => new Set()
  )
  const [refreshInterval, setRefreshInterval] = React.useState(
    /** @returns {number|false} */
    () => refreshIntervals[1].interval
  )
  const [showAllDetails, setShowAllDetails] = React.useState(false)

  const [showRestartMachinesConfirm, setShowRestartMachinesConfirm] =
    React.useState(false)
  const restartMachines = useMutation({
    /**
     * @param {Set<string>} machines
     */
    async mutationFn(machines) {
      for (const machineId of machines) {
        await withLease(
          app.name,
          machineId,
          { description: 'Restarting Machine' },
          async (params) => {
            await restartMachine(app.name, machineId, { nonce: params.nonce })
            await waitForState(app.name, machineId, { state: 'started' })
          }
        )
      }
    },
    onError(error) {
      notifyError('Error restarting machines', error)
    }
  })

  const [showStopMachinesConfirm, setShowStopMachinesConfirm] =
    React.useState(false)
  const stopMachines = useMutation({
    /**
     * @param {Set<string>} machineStates
     */
    async mutationFn(machineStates) {
      const machinesById = Map.groupBy(
        machines.data ?? [],
        (machine) => machine.id
      )
      for (const machineId of machineStates) {
        const machine = machinesById.get(machineId)?.at(0)
        await withLease(
          app.name,
          machineId,
          { description: 'Stopping Machine' },
          async (params) => {
            await stopMachine(app.name, machineId, { nonce: params.nonce })
            await waitForState(app.name, machineId, {
              state: 'stopped',
              instanceId: machine?.instance_id
            })
          }
        )
      }
    },
    onError(error) {
      notifyError('Error stopping machines', error)
    }
  })
  const startMachines = useMutation({
    /**
     * @param {Set<string>} machineStates
     */
    async mutationFn(machineStates) {
      for (const machineId of machineStates) {
        await withLease(
          app.name,
          machineId,
          { description: 'Stopping Machine' },
          async (params) => {
            await startMachine(app.name, machineId, { nonce: params.nonce })
            await waitForState(app.name, machineId, { state: 'started' })
          }
        )
      }
    },
    onError(error) {
      notifyError('Error starting machines', error)
    }
  })
  const [showDestroyMachinesConfirm, setShowDestroyMachinesConfirm] =
    React.useState(false)
  const destroyMachines = useMutation({
    /**
     * @param {Set<string>} machineStates
     */
    async mutationFn(machineStates) {
      for (const machineId of machineStates) {
        await withLease(
          app.name,
          machineId,
          { description: 'Destroying machine' },
          async (params) => {
            await destroyMachine(app.name, machineId, {
              nonce: params.nonce
            })
            await waitForState(app.name, machineId, { state: 'destroyed' })
          }
        )
      }
    },
    onError(error) {
      notifyError('Error destroying machines', error)
    }
  })
  const pendingActions =
    restartMachines.isPending ||
    stopMachines.isPending ||
    startMachines.isPending ||
    destroyMachines.isPending
  const machines = useMachines(
    app.name,
    pendingActions ? 1000 : refreshInterval
  )
  const machinesList = machines.data ?? []
  const volumes = useVolumes(app.name, pendingActions ? 1000 : refreshInterval)
  const volumesList = volumes.data ?? []

  React.useLayoutEffect(() => {
    const isIndeterminate =
      selectedMachines.size > 0 && selectedMachines.size < machinesList.length
    setChecked(selectedMachines.size === machinesList.length)
    setIndeterminate(isIndeterminate)
    if (checkbox.current) checkbox.current.indeterminate = isIndeterminate
  }, [selectedMachines, machinesList.length])

  function toggleAll() {
    setSelectedMachines(
      new Set(checked || indeterminate ? [] : machinesList.map((m) => m.id))
    )
    setChecked(!checked && !indeterminate)
    setIndeterminate(false)
  }

  return (
    <div className="mt-8 flow-root h-full">
      <div className="-mx-4 -my-2 h-full overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block h-full min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="flex gap-2">
            <button
              onClick={() => machines.refetch()}
              disabled={machines.isFetching}
              className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <ArrowPathIcon
                className={cx('h-4 w-4', machines.isFetching && 'animate-spin')}
              />
            </button>
            <RadioGroup value={refreshInterval} onChange={setRefreshInterval}>
              <div className="grid grid-cols-3 gap-1 py-1 sm:grid-cols-6">
                {refreshIntervals.map((option) => (
                  <Radio
                    key={option.label}
                    value={option.interval}
                    className={({ focus, checked }) =>
                      cx(
                        'cursor-pointer focus:outline-none',
                        focus ? 'ring-2 ring-indigo-600 ring-offset-2' : '',
                        checked
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                          : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
                        'flex items-center justify-center rounded-md px-1 py-2 text-xs font-semibold sm:flex-1'
                      )
                    }
                  >
                    <Label as="span">{option.label}</Label>
                  </Radio>
                ))}
              </div>
            </RadioGroup>
          </div>
          <div className="relative flex flex-col gap-3">
            {selectedMachines.size > 0 && (
              <div className="absolute left-14 top-0 flex h-12 items-center space-x-3 bg-white sm:left-12">
                <button
                  type="button"
                  className="inline-flex items-center rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
                  disabled={pendingActions}
                  onClick={() => setShowRestartMachinesConfirm(true)}
                >
                  Restart
                </button>
                <Modal
                  title="Restart Machines"
                  open={showRestartMachinesConfirm}
                  onClose={setShowRestartMachinesConfirm}
                  buttons={
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                      onClick={() => {
                        restartMachines.mutate(selectedMachines)
                        setSelectedMachines(new Set())
                        setShowRestartMachinesConfirm(false)
                      }}
                    >
                      Restart
                    </button>
                  }
                >
                  <p className="text-sm text-gray-500">
                    Are you sure you want to restart these machines?
                  </p>
                </Modal>
                <button
                  type="button"
                  className="inline-flex items-center rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
                  disabled={pendingActions}
                  onClick={() => setShowStopMachinesConfirm(true)}
                >
                  Stop
                </button>
                <Modal
                  title="Stop Machines"
                  open={showStopMachinesConfirm}
                  onClose={setShowStopMachinesConfirm}
                  buttons={
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                      onClick={() => {
                        stopMachines.mutate(selectedMachines)
                        setSelectedMachines(new Set())
                        setShowStopMachinesConfirm(false)
                      }}
                    >
                      Stop Machines
                    </button>
                  }
                >
                  <p className="text-sm text-gray-500">
                    Are you sure you want to stop these machines?
                  </p>
                </Modal>
                <button
                  type="button"
                  className="inline-flex items-center rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
                  disabled={pendingActions}
                  onClick={() => {
                    startMachines.mutate(selectedMachines)
                    setSelectedMachines(new Set())
                  }}
                >
                  Start
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
                  disabled={pendingActions}
                  onClick={() => setShowDestroyMachinesConfirm(true)}
                >
                  Destroy
                </button>
                <Modal
                  title="Destroy Machines"
                  open={showDestroyMachinesConfirm}
                  onClose={setShowDestroyMachinesConfirm}
                  buttons={
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                      onClick={() => {
                        destroyMachines.mutate(selectedMachines)
                        setSelectedMachines(new Set())
                        setShowDestroyMachinesConfirm(false)
                      }}
                    >
                      Destroy Machines
                    </button>
                  }
                >
                  <p className="text-sm text-gray-500">
                    Are you sure you want to destroy these machines?
                  </p>
                </Modal>
              </div>
            )}
            <table className="min-w-full table-fixed divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      ref={checkbox}
                      checked={checked}
                      onChange={toggleAll}
                    />
                  </th>
                  <th
                    scope="col"
                    className="min-w-[12rem] py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                  >
                    Machine ID
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    <button
                      onClick={() => setShowAllDetails((value) => !value)}
                    >
                      State
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Region
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Size
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {machines.data?.map((machine) => (
                  <MachineRows
                    key={machine.id}
                    machine={machine}
                    selected={selectedMachines.has(machine.id)}
                    showAllDetails={showAllDetails}
                    onChange={(machine, selected) => {
                      setSelectedMachines((selectedMachines) => {
                        const newSet = new Set(selectedMachines)
                        if (selected) newSet.add(machine.id)
                        else newSet.delete(machine.id)
                        return newSet
                      })
                    }}
                  />
                ))}
              </tbody>
            </table>
            {volumesList.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg">Volumes</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                      >
                        Volume ID
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Attached Machine ID
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Available / Total space
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {volumesList.map((volume) => (
                      <tr key={volume.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                          {volume.id}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {volume.attached_machine_id}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <FreeSpace volume={volume} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="mb-3 border-t border-gray-300">
              <ScaleCountForm appName={app.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const BYTES_TO_GB = 1000 ** 3
const BYTES_TO_GiB = 1024 ** 3

/**
 * @param {object} props
 * @param {import('../fly.js').Volume} props.volume
 */
function FreeSpace({ volume }) {
  const bytesAvailable = volume.blocks_avail * volume.block_size
  const bytesFree = volume.blocks_free * volume.block_size
  const bytes = volume.blocks * volume.block_size
  return (
    <span>
      <strong>{(bytesAvailable / BYTES_TO_GB).toFixed(2)}</strong>GB /{' '}
      <strong>{(bytes / BYTES_TO_GB).toFixed(2)}</strong>GB
    </span>
  )
}

/**
 * @param {object} props
 * @param {import('../fly.js').Machine} props.machine
 * @param {boolean} props.selected
 * @param {(machine: import('../fly.js').Machine, selected: boolean) => void} props.onChange
 * @param {boolean} props.showAllDetails
 */
function MachineRows({ machine, selected, showAllDetails, onChange }) {
  const [showDetails, setShowDetails] = React.useState(showAllDetails)
  return (
    <>
      <tr className={selected ? 'bg-gray-50' : undefined}>
        <td className="relative px-7 sm:w-12 sm:px-6">
          {selected && (
            <div className="absolute inset-y-0 left-0 w-0.5 bg-indigo-600" />
          )}
          <input
            type="checkbox"
            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
            value={machine.id}
            checked={selected}
            onChange={(e) => onChange(machine, e.target.checked)}
          />
        </td>
        <td
          className={cx(
            'whitespace-nowrap py-4 pr-3 text-sm font-medium',
            selected ? 'text-indigo-600' : 'text-gray-900'
          )}
        >
          {machine.id}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          <button onClick={() => setShowDetails((show) => !show)}>
            <MachineChecks machine={machine}>{machine.state}</MachineChecks>
          </button>
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          {machine.region}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          {machine.config?.guest && (
            <span>
              {machine.config.guest.cpu_kind}-cpu-
              {machine.config.guest.cpus}x:
              {machine.config.guest.memory_mb}MB
            </span>
          )}
        </td>
      </tr>
      {machine.checks?.map((check) => (
        <tr
          key={check.name}
          className={cx(
            'text-xs',
            showDetails || showAllDetails ? 'table-row' : 'hidden'
          )}
        >
          <td></td>
          <td>{check.name}</td>
          <td>
            <div className="flex w-full pl-6">
              <svg
                key={check.name}
                className={cx('h-3 w-3', {
                  'fill-red-500': check.status === 'critical',
                  'fill-yellow-500': check.status === 'warning',
                  'fill-green-500': check.status === 'passing'
                })}
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
            </div>
          </td>
          <td colSpan={2}>
            <pre className="rounded bg-gray-800 p-2 py-2 font-mono text-xs text-gray-200">
              {check.output ?? <>&nbsp;</>}
            </pre>
          </td>
        </tr>
      ))}
    </>
  )
}

import React from 'react'
import ReactDOM from 'react-dom'
import { Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/20/solid'
import {
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

/**
 * @typedef {object} Notification
 * @property {string} id
 * @property {'success'|'error'} [type]
 * @property {number} [ttl]
 * @property {React.ReactNode} children
 */

/** @type {Notification[]} */
const defaultNotifications = []
/** @type {React.Dispatch<React.SetStateAction<Notification[]>>} */
const defaultSetNofications = () => {}

/** @type {React.Context<Notification[]>} */
const NotificationsContext = React.createContext(defaultNotifications)
const SetNotificationsContext = React.createContext(defaultSetNofications)

/**
 * @param {React.PropsWithChildren<{}>} props
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = React.useState(
    /** @returns {Notification[]} */
    () => []
  )
  return (
    <SetNotificationsContext.Provider value={setNotifications}>
      <NotificationsContext.Provider value={notifications}>
        {children}
      </NotificationsContext.Provider>
    </SetNotificationsContext.Provider>
  )
}

export function NotificationsOutlet() {
  const notifications = React.useContext(NotificationsContext)
  return ReactDOM.createPortal(
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-20 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {notifications.map((notification) => {
          return (
            <Notification key={notification.id} notification={notification} />
          )
        })}
      </div>
    </div>,
    document.body
  )
}

/**
 * @param {object} props
 * @param {Notification} props.notification
 */
function Notification({ notification }) {
  const setNotifications = React.useContext(SetNotificationsContext)
  const close = React.useCallback(() => {
    setNotifications((notifications) =>
      notifications.filter((n) => n.id !== notification.id)
    )
  }, [notification.id])
  return (
    <Transition
      key={notification.id}
      appear
      show
      as={React.Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' && (
                <CheckCircleIcon
                  className="h-6 w-6 text-green-400"
                  aria-hidden="true"
                />
              )}
              {notification.type === 'error' && (
                <ExclamationCircleIcon
                  className="h-6 w-6 text-red-400"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              {notification.children}
            </div>
            <div className="ml-4 flex flex-shrink-0">
              <button
                type="button"
                className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => close()}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  )
}

export function useNotify() {
  const setNotifications = React.useContext(SetNotificationsContext)
  return React.useCallback(
    /**
     * @param {object} params
     * @param {React.ReactNode} params.content
     * @param {'success'|'error'} [params.type]
     * @param {number} [params.ttl]
     */
    (params) => {
      /** @type {Notification} */
      const notification = {
        id: crypto.randomUUID(),
        type: params.type,
        children: params.content,
        ttl: params.ttl
      }
      setNotifications((notifications) => [...notifications, notification])
    },
    []
  )
}

export function useNotifyError() {
  const notify = useNotify()
  return React.useCallback(
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
}

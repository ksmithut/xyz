import cx from 'clsx'
import { useLoaderData, Form, redirect } from 'react-router-dom'
import { ExclamationCircleIcon } from '@heroicons/react/20/solid'

/**
 * @param {import('react-router-dom').LoaderFunctionArgs} params
 */
export async function loader({ request }) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return {}
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'same-origin'
  })
  console.log(res.ok)
  if (res.ok) return redirect('/')
  return { error: 'Invalid token' }
}

export default function Auth() {
  const data = useLoaderData()
  // @ts-ignore
  const error = data?.error
  return (
    <div className="flex h-screen w-screen items-center justify-center p-4">
      <Form className="flex max-w-lg">
        <div className="flex w-full flex-col gap-2">
          <label
            htmlFor="token"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Token
          </label>
          <p className="text-xs text-gray-600">
            Run{' '}
            <code className="rounded bg-gray-900 px-1.5 py-1 text-gray-200">
              xyz token
            </code>{' '}
            to get your token and paste it here
          </p>
          <div className="relative">
            <input
              data-1p-ignore
              type="password"
              name="token"
              id="token"
              className={cx(
                'block w-full rounded-md border-0 px-2 py-1.5 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6',
                error
                  ? 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500'
                  : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600'
              )}
              placeholder="a4f216..."
              aria-invalid={error ? true : false}
              aria-describedby="token-error"
            />
            {error && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ExclamationCircleIcon
                  className="h-5 w-5 text-red-500"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Submit
          </button>
          {error && (
            <p className="mt-2 text-sm text-red-600" id="token-error">
              {error}
            </p>
          )}
        </div>
      </Form>
    </div>
  )
}

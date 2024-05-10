import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  NotificationsProvider,
  NotificationsOutlet
} from './components/Notifications.jsx'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'

const queryClient = new QueryClient()

export default function App() {
  return (
    <NotificationsProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
      <NotificationsOutlet />
    </NotificationsProvider>
  )
}

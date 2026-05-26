import { redirect } from 'next/navigation'

// Account settings are shared across roles.
// A coordinator-specific settings page can replace this redirect in the future.
export default function CoordinatorSettingsPage() {
  redirect('/dashboard/settings')
}

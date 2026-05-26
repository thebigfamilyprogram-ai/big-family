import { redirect } from 'next/navigation'

// Coordinator community feed shares the student feed page.
// A dedicated coordinator feed page can replace this redirect in the future.
export default function CoordinatorFeedPage() {
  redirect('/dashboard/feed')
}

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function StudentProjectPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/projects/${params.id}/edit`)
}

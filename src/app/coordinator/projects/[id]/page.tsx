import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CoordinatorProjectPage({ params }: { params: { id: string } }) {
  redirect(`/coordinator/projects/${params.id}/evaluate`)
}

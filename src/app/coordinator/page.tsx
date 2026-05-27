export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import CoordinatorClient from './CoordinatorClient'

export default async function CoordinatorPage() {
  if (MOCK_MODE) {
    return (
      <CoordinatorClient
        initialFullName={MOCK.currentCoordinator.name}
        initialSchoolId={MOCK.currentCoordinator.school_id}
      />
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'coordinator') redirect('/dashboard')

  return (
    <CoordinatorClient
      initialFullName={profile.full_name ?? ''}
      initialSchoolId={profile.school_id ?? ''}
    />
  )
}

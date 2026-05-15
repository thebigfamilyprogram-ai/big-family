import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import CoordinatorClient from './CoordinatorClient'

export default async function CoordinatorPage() {
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

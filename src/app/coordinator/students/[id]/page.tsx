export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import StudentProfileClient from './StudentProfileClient'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: studentId } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = await createSupabaseAdminClient()
  const { data: coordProfile } = await admin
    .from('profiles')
    .select('role, full_name, school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!coordProfile || coordProfile.role !== 'coordinator') redirect('/dashboard')

  const { data: studentProfile } = await admin
    .from('profiles')
    .select('school_id')
    .eq('id', studentId)
    .maybeSingle()

  if (!studentProfile || studentProfile.school_id !== coordProfile.school_id) {
    redirect('/coordinator')
  }

  const { data: authData } = await admin.auth.admin.getUserById(studentId)
  const lastSignIn = authData?.user?.last_sign_in_at ?? null

  return (
    <StudentProfileClient
      studentId={studentId}
      coordinatorId={user.id}
      coordinatorName={coordProfile.full_name ?? ''}
      coordinatorSchoolId={coordProfile.school_id ?? ''}
      lastSignIn={lastSignIn}
    />
  )
}

import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationType =
  | 'announcement'
  | 'project_evaluated'
  | 'module_published'
  | 'quiz_retry_approved'
  | 'kashi_session'
  | 'great_venture_reminder'
  | 'suggestion'
  | 'event_created'

interface CreateNotificationParams {
  userId: string
  type:   NotificationType
  title:  string
  body?:  string
  link?:  string
}

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams,
) {
  return supabase.from('notifications').insert({
    user_id: params.userId,
    type:    params.type,
    title:   params.title,
    body:    params.body ?? null,
    link:    params.link ?? null,
    read:    false,
  })
}

/** Batch: create the same notification for multiple users at once */
export async function createNotificationBatch(
  supabase: SupabaseClient,
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>,
) {
  if (userIds.length === 0) return
  return supabase.from('notifications').insert(
    userIds.map(userId => ({
      user_id: userId,
      type:    params.type,
      title:   params.title,
      body:    params.body ?? null,
      link:    params.link ?? null,
      read:    false,
    }))
  )
}

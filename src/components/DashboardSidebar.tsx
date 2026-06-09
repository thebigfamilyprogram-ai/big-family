'use client'

import { useTranslations } from 'next-intl'
import AppSidebar from './AppSidebar'

type ActivePage =
  | 'dashboard' | 'leadership-path' | 'global-map'
  | 'projects' | 'team-hub' | 'goals' | 'calendar' | 'settings'
  | 'announcements' | 'feed' | 'stories'

interface Props {
  activePage?: ActivePage
  userName?: string
  userInitial?: string
  unreadAnnouncements?: number
  userRole?: string | null
}

export default function DashboardSidebar({ userName, userInitial, unreadAnnouncements, userRole }: Props) {
  const tRoles = useTranslations('roles')
  const ROLE_LABELS: Record<string, string> = {
    student:     tRoles('student'),
    coordinator: tRoles('coordinator'),
    expositor:   tRoles('expositor'),
    admin:       tRoles('admin'),
  }
  const roleLabelOverride = userRole ? (ROLE_LABELS[userRole] ?? userRole) : undefined

  return (
    <AppSidebar
      role="student"
      roleLabelOverride={roleLabelOverride}
      userName={userName}
      userInitial={userInitial}
      unreadAnnouncements={unreadAnnouncements}
    />
  )
}

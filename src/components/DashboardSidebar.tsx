'use client'

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

const ROLE_LABELS: Record<string, string> = {
  student:     'Estudiante',
  coordinator: 'Coordinador',
  expositor:   'Expositor',
  admin:       'Administrador',
}

export default function DashboardSidebar({ userName, userInitial, unreadAnnouncements, userRole }: Props) {
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

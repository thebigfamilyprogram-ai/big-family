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
}

export default function DashboardSidebar({ userName, userInitial, unreadAnnouncements }: Props) {
  return (
    <AppSidebar
      role="student"
      userName={userName}
      userInitial={userInitial}
      unreadAnnouncements={unreadAnnouncements}
    />
  )
}

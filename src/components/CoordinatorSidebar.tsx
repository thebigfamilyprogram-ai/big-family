'use client'

import AppSidebar from './AppSidebar'

interface Props {
  userName?: string
  userInitial?: string
  schoolName?: string
}

export default function CoordinatorSidebar({ userName, userInitial, schoolName }: Props) {
  return (
    <AppSidebar
      role="coordinator"
      userName={userName}
      userInitial={userInitial}
      schoolName={schoolName}
    />
  )
}

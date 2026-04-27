'use client'

import { createContext, useContext } from 'react'
import type { Organization } from '@/types'

interface OrgAdminContextType {
  org: Organization | null
  reload: () => Promise<void>
}

export const OrgAdminContext = createContext<OrgAdminContextType>({
  org: null,
  reload: async () => {},
})

export const useOrgAdmin = () => useContext(OrgAdminContext)

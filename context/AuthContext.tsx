'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUser, updateUser, getOrgsByAdmin } from '@/lib/firestore'
import { requestNotificationPermission } from '@/lib/notifications'
import type { User, Organization } from '@/types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  orgAdmins: Organization[]
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  orgAdmins: [],
  loading: true,
  refreshUser: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [orgAdmins, setOrgAdmins] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    if (!firebaseUser) return
    const u = await getUser(firebaseUser.uid)
    setUser(u)
  }

  useEffect(() => {
    let currentUid: string | null = null

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      if (fbUser) {
        // token refresh fires onAuthStateChanged again with same uid — skip reload
        if (fbUser.uid === currentUid) return
        currentUid = fbUser.uid

        const [u, orgs] = await Promise.all([
          getUser(fbUser.uid),
          getOrgsByAdmin(fbUser.uid),
        ])
        setUser(u)
        setOrgAdmins(orgs)
        setLoading(false)

        // FCM token update in background — don't block
        requestNotificationPermission().then((token) => {
          if (token && u && u.fcmToken !== token) {
            updateUser(fbUser.uid, { fcmToken: token })
          }
        })
      } else {
        currentUid = null
        setUser(null)
        setOrgAdmins([])
        setLoading(false)
      }
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ firebaseUser, user, orgAdmins, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

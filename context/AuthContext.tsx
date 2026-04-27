'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUser, updateUser, getOrgByAdmin } from '@/lib/firestore'
import { requestNotificationPermission } from '@/lib/notifications'
import type { User, Organization } from '@/types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  orgAdmin: Organization | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  orgAdmin: null,
  loading: true,
  refreshUser: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [orgAdmin, setOrgAdmin] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    if (!firebaseUser) return
    const u = await getUser(firebaseUser.uid)
    setUser(u)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const [u, org] = await Promise.all([
          getUser(fbUser.uid),
          getOrgByAdmin(fbUser.uid),
        ])
        setUser(u)
        setOrgAdmin(org)
        // request FCM token and update
        const token = await requestNotificationPermission()
        if (token && u && u.fcmToken !== token) {
          await updateUser(fbUser.uid, { fcmToken: token })
        }
      } else {
        setUser(null)
        setOrgAdmin(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ firebaseUser, user, orgAdmin, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

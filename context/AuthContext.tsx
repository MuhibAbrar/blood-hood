'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserFromServer, getOrgsByAdmin } from '@/lib/firestore'
import { authenticatedFetch } from '@/lib/api-client'
import type { User, Organization } from '@/types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  orgAdmins: Organization[]
  loading: boolean
  profileLoadError: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  orgAdmins: [],
  loading: true,
  profileLoadError: false,
  refreshUser: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [orgAdmins, setOrgAdmins] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState(false)

  const refreshUser = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return
    await authenticatedFetch('/api/reconcile-org-membership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUser.uid }),
    }).catch(() => null)
    const u = await getUserFromServer(currentUser.uid)
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

        try {
        setProfileLoadError(false)
        await authenticatedFetch('/api/reconcile-org-membership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: fbUser.uid }),
        }).catch(() => null)

        const [u, orgs] = await Promise.all([
          getUserFromServer(fbUser.uid),
          getOrgsByAdmin(fbUser.uid),
        ])
        setUser(u)
        setOrgAdmins(orgs)

        // FCM token update in background — don't block
        } catch (error) {
          console.error('Unable to load authenticated profile:', error)
          setProfileLoadError(true)
          setUser(null)
          setOrgAdmins([])
        } finally {
          setLoading(false)
        }
      } else {
        currentUid = null
        setUser(null)
        setOrgAdmins([])
        setProfileLoadError(false)
        setLoading(false)
      }
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ firebaseUser, user, orgAdmins, loading, profileLoadError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

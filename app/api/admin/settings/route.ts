import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireRole } from '@/lib/api-auth'

const SOCIAL_KEYS = ['facebook', 'instagram', 'youtube', 'whatsapp', 'website', 'email', 'phone'] as const
const URL_KEYS = new Set(['facebook', 'instagram', 'youtube', 'website'])
const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'superadmin'])
    const input = await req.json() as Record<string, unknown>
    const db = adminDb()

    if (input.type === 'social') {
      const rawLinks = input.links && typeof input.links === 'object'
        ? input.links as Record<string, unknown>
        : {}
      const links: Record<string, string> = {}
      for (const key of SOCIAL_KEYS) {
        const value = clean(rawLinks[key], 300)
        if (URL_KEYS.has(key) && value && !/^https?:\/\//i.test(value)) {
          return NextResponse.json({ error: `${key} must be a valid web URL` }, { status: 400 })
        }
        if (key === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return NextResponse.json({ error: 'invalid email' }, { status: 400 })
        }
        links[key] = value
      }
      await db.collection('settings').doc('social').set({
        ...links,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
      return NextResponse.json({ success: true })
    }

    if (input.type === 'helplines') {
      if (!Array.isArray(input.orgs) || input.orgs.length > 100) {
        return NextResponse.json({ error: 'invalid helpline list' }, { status: 400 })
      }
      const orgs = input.orgs.map((entry, index) => {
        const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
        return {
          id: clean(item.id, 100) || `helpline-${index + 1}`,
          name: clean(item.name, 100),
          phone: clean(item.phone, 30),
        }
      })
      if (orgs.some((org) => !org.name || !org.phone)) {
        return NextResponse.json({ error: 'helpline name and phone required' }, { status: 400 })
      }
      await db.collection('settings').doc('helplines').set({
        orgs,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'invalid settings type' }, { status: 400 })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to save settings' }, { status: 500 })
  }
}

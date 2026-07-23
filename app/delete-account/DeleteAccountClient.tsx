'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { authenticatedFetch } from '@/lib/api-client'
import { logout } from '@/lib/auth'

export default function DeleteAccountClient() {
  const { firebaseUser, user, loading } = useAuth()
  const router = useRouter()
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const deleteAccount = async () => {
    if (confirmation !== 'DELETE') return
    setDeleting(true)
    setError('')
    try {
      const response = await authenticatedFetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      })
      if (!response.ok) throw new Error('Deletion failed')
      await logout().catch(() => {})
      router.replace('/login?accountDeleted=1')
    } catch {
      setError('অ্যাকাউন্ট মুছে ফেলা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন অথবা যোগাযোগ পেজ থেকে সহায়তা নিন।')
      setDeleting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#D92B2B]">
          <span aria-hidden>←</span> Blood Hood
        </Link>

        <section className="mt-6 rounded-3xl border border-[#E5E5E5] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl" aria-hidden>🗑️</div>
          <h1 className="mt-5 text-2xl font-bold text-[#111111]">অ্যাকাউন্ট মুছে ফেলুন</h1>
          <p className="mt-2 text-sm leading-6 text-[#555555]">
            এই পেজ থেকে আপনার Blood Hood অ্যাকাউন্ট এবং সংশ্লিষ্ট ব্যক্তিগত তথ্য স্থায়ীভাবে মুছে ফেলতে পারবেন।
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">মুছে ফেলার আগে জেনে নিন</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>আপনার লগইন, প্রোফাইল, যোগাযোগ ও নোটিফিকেশন তথ্য মুছে যাবে।</li>
              <li>সংগঠন ও ক্যাম্পের সদস্য তালিকা থেকে আপনাকে সরানো হবে।</li>
              <li>সেবার ইতিহাস ও নিরাপত্তার জন্য পুরোনো রক্তদান বা অনুরোধ পরিচয়বিহীনভাবে রাখা হতে পারে।</li>
              <li>এই কাজটি শেষ হলে অ্যাকাউন্ট ফিরিয়ে আনা যাবে না।</li>
            </ul>
            <Link href="/privacy-policy" className="mt-3 inline-block font-semibold text-[#D92B2B] underline underline-offset-2">
              সম্পূর্ণ গোপনীয়তা নীতি পড়ুন
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center justify-center py-8 text-sm text-[#555555]">অ্যাকাউন্ট যাচাই করা হচ্ছে...</div>
          ) : !firebaseUser || !user ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm leading-6 text-[#555555]">
                নিরাপত্তার জন্য প্রথমে আপনার Blood Hood অ্যাকাউন্টে লগইন করুন। লগইন করার পর আপনাকে এই পেজে ফিরিয়ে আনা হবে।
              </p>
              <Link href="/login?next=/delete-account" className="btn-primary block w-full text-center">
                লগইন করে মুছে ফেলুন
              </Link>
              <Link href="/contact" className="block text-center text-sm font-semibold text-[#D92B2B]">
                লগইন করতে সমস্যা হলে যোগাযোগ করুন
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-[#F7F7F7] p-4 text-sm">
                <p className="text-[#777777]">যে অ্যাকাউন্টটি মুছে যাবে</p>
                <p className="mt-1 font-semibold text-[#111111]">{user.name}</p>
                <p className="text-[#555555]">{user.phone}</p>
              </div>
              <div>
                <label htmlFor="delete-confirmation" className="mb-1.5 block text-sm font-medium text-[#111111]">
                  নিশ্চিত করতে ইংরেজিতে DELETE লিখুন
                </label>
                <input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input-field w-full" placeholder="DELETE" autoComplete="off" />
              </div>
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button onClick={deleteAccount} disabled={confirmation !== 'DELETE' || deleting} className="w-full rounded-xl bg-red-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {deleting ? 'মুছে ফেলা হচ্ছে...' : 'স্থায়ীভাবে অ্যাকাউন্ট মুছুন'}
              </button>
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-[#777777]">
          তথ্য মুছে ফেলা সম্পর্কে প্রশ্ন থাকলে <Link href="/contact" className="font-semibold text-[#D92B2B]">Blood Hood-এর সাথে যোগাযোগ করুন</Link>।
        </p>
      </div>
    </main>
  )
}

import type { Metadata } from 'next'
import DeleteAccountClient from './DeleteAccountClient'

export const metadata: Metadata = {
  title: 'অ্যাকাউন্ট মুছে ফেলুন',
  description: 'Blood Hood অ্যাকাউন্ট এবং সংশ্লিষ্ট ব্যক্তিগত তথ্য মুছে ফেলার অনুরোধ করুন।',
  robots: { index: true, follow: true },
}

export default function DeleteAccountPage() {
  return <DeleteAccountClient />
}

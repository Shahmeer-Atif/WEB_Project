import { getAuthFromCookies } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const auth = await getAuthFromCookies()

  // Middleware already blocks non-admins but double-check server side
  if (!auth) redirect('/')
  if (auth.role !== 'admin') redirect('/403')

  return <AdminClient user={auth} />
}
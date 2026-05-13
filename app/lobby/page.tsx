import { getAuthFromCookies } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LobbyClient from './LobbyClient'

export default async function LobbyPage() {
  const auth = await getAuthFromCookies()
  if (!auth) redirect('/')
  return <LobbyClient user={auth} />
}
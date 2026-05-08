import { getAuthFromCookies } from '@/lib/auth'
import { redirect } from 'next/navigation'
import GameRoomClient from './GameRoomClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function GameRoomPage({ params }: Props) {
  const auth = await getAuthFromCookies()
  if (!auth) redirect('/')

  const { id } = await params

  return <GameRoomClient roomId={id} user={auth} />
}
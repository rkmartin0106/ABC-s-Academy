import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getDashboardPath } from '@/lib/auth'

export default async function RootPage() {
  const user = await getSessionUser()

  if (user) {
    redirect(getDashboardPath(user.role))
  }

  redirect('/login')
}

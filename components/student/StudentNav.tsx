'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Props {
  name: string
  level: string | null
}

export default function StudentNav({ name, level }: Props) {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function getInitials(n: string) {
    return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">A</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">ABC&apos;s Academy</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {level && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {level}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-700">{getInitials(name)}</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">{name}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

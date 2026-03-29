'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { Video, Library, Settings, LogOut } from 'lucide-react'

export function NavHeader() {
  const { data: session } = useSession()

  if (!session) return null

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/library" className="text-lg font-bold">
          ScreenForge
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/library" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <Library className="h-4 w-4" /> Library
          </Link>
          <Link href="/record" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <Video className="h-4 w-4" /> Record
          </Link>
          <Link href="/settings" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <Settings className="h-4 w-4" /> Settings
          </Link>

          <div className="ml-2 flex items-center gap-2">
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt=""
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <button
              onClick={() => void signOut({ callbackUrl: '/' })}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}

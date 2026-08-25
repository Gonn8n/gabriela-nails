import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { Sidebar } from "@/components/sidebar"

async function getUser() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value

  if (!session) {
    return null
  }

  try {
    const sessionData = db.prepare("SELECT value FROM Settings WHERE key = ?").get(`session:${session}`) as { value: string } | undefined

    if (!sessionData) {
      return null
    }

    const parsed = JSON.parse(sessionData.value)

    if (new Date(parsed.expiresAt) < new Date()) {
      db.prepare("DELETE FROM Settings WHERE key = ?").run(`session:${session}`)
      return null
    }

    const user = db.prepare("SELECT id, email, name FROM User WHERE id = ?").get(parsed.userId) as { id: string; email: string; name: string } | undefined

    return user || null
  } catch {
    return null
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar user={{ email: user.email }} />
      <main className="flex-1 pt-14 lg:pt-0 px-4 py-6 lg:px-8 lg:py-8 bg-pink-50/50 min-h-screen">
        {children}
      </main>
    </div>
  )
}

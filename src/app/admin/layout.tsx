import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/sidebar"
import { InstallPrompt } from "@/components/install-prompt"

async function getUser() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value

  if (!session) {
    return null
  }

  try {
    const { data: sessionData } = await supabase
      .from("Settings")
      .select("value")
      .eq("key", `session:${session}`)
      .single()

    if (!sessionData) {
      return null
    }

    const parsed = JSON.parse(sessionData.value)

    if (new Date(parsed.expiresAt) < new Date()) {
      await supabase.from("Settings").delete().eq("key", `session:${session}`)
      return null
    }

    const { data: user } = await supabase
      .from("User")
      .select("id, email, name")
      .eq("id", parsed.userId)
      .single()

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
      <InstallPrompt />
      <Sidebar user={{ email: user.email }} />
      <main className="flex-1 px-5 pb-24 pt-6 lg:px-10 lg:py-8 lg:pb-6 bg-brand-soft/40 min-h-screen" style={{ paddingTop: "max(calc(var(--spacing) * 18), 1.5rem)" }}>
        {children}
      </main>
    </div>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Users,
  Settings,
  LayoutDashboard,
  LogOut,
} from "lucide-react"
import { NailIcon } from "@/components/icons"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Calendario", href: "/admin/calendar", icon: Calendar },
  { name: "Turnos", href: "/admin/appointments", icon: Calendar },
  { name: "Clientes", href: "/admin/clients", icon: Users },
  { name: "Servicios", href: "/admin/services", icon: NailIcon },
  { name: "Configuración", href: "/admin/settings", icon: Settings, hideOnMobile: true },
]

const bottomNav = navigation.filter((item) => !item.hideOnMobile)

interface SidebarProps {
  user: {
    email?: string
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 h-14 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/logo-gabriela.png" alt="Gabriela Nails" width={140} height={40} className="h-10 w-auto" priority />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/admin/settings" aria-label="Configuración" className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Configuración">
            <Settings className="h-4 w-4" />
          </Link>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Cerrar sesión" title="Cerrar sesión" className="h-9 w-9 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t px-2 h-16 flex items-center justify-around safe-area-pb">
        {bottomNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors min-w-[48px] ${
                isActive
                  ? "text-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 bg-card border-r flex-col h-screen sticky top-0">
        <div className="p-6">
          <Link href="/admin">
            <Image src="/logo-gabriela.png" alt="Gabriela Nails" width={200} height={52} className="h-13 w-auto" priority />
          </Link>
          <p className="text-sm text-muted-foreground mt-2">{user.email}</p>
        </div>
        <Separator />
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-soft text-brand"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4">
          <Separator className="mb-4" />
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-5 w-5 mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </>
  )
}

"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      void e
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  useEffect(() => {
    if (deferred) {
      // Espera un pequeño momento para que la página cargue y luego ofrece la instalación
      const timer = setTimeout(() => {
        deferred.prompt()
        void deferred.userChoice
        setDeferred(null)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [deferred])

  return null
}
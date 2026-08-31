"use client"

import { useEffect, useState } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    const dismissed = localStorage.getItem("push-notification-dismissed")
    if (dismissed) return

    navigator.serviceWorker.ready.then((registration) => {
      return registration.pushManager.getSubscription()
    }).then((subscription) => {
      if (!subscription) {
        setShow(true)
      }
    })
  }, [])

  async function handleEnable() {
    setSubscribing(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setShow(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const vapidRes = await fetch("/api/push/vapid-key")
      const { publicKey } = await vapidRes.json()

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const sub = subscription.toJSON()
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
        }),
      })

      setShow(false)
    } catch (err) {
      console.error("Push subscription error:", err)
      setShow(false)
    } finally {
      setSubscribing(false)
    }
  }

  function handleDismiss() {
    localStorage.setItem("push-notification-dismissed", "true")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-xs bg-white border border-gray-200 rounded-xl shadow-lg p-4 animate-in slide-in-from-bottom-5">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
          <Bell className="h-5 w-5 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Recibí alertas de nuevos turnos, cancelaciones y más
          </p>
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={subscribing}
            className="mt-2 text-xs h-7"
          >
            {subscribing ? "Activando..." : "Activar notificaciones"}
          </Button>
        </div>
      </div>
    </div>
  )
}

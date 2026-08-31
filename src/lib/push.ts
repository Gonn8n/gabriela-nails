import webPush from "web-push"
import { supabase } from "./supabase"

let initialized = false

function ensureInitialized() {
  if (initialized) return
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublicKey || !vapidPrivateKey) return
  webPush.setVapidDetails(
    "mailto:gabriela.nails026@gmail.com",
    vapidPublicKey,
    vapidPrivateKey
  )
  initialized = true
}

interface PushPayload {
  title: string
  body: string
  tag?: string
  url?: string
}

interface Subscription {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPushNotification(
  subscription: Subscription,
  payload: PushPayload
): Promise<boolean> {
  ensureInitialized()
  if (!initialized) return false
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    )
    return true
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) {
      return false
    }
    console.error("Push notification error:", err)
    return false
  }
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  ensureInitialized()
  if (!initialized) return

  const { data: subscriptions } = await supabase
    .from("PushSubscription")
    .select("*")

  if (!subscriptions?.length) return

  for (const sub of subscriptions) {
    const alive = await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    )
    if (!alive) {
      await supabase.from("PushSubscription").delete().eq("id", sub.id)
    }
  }
}

export async function sendPushIfEnabled(
  settingKey: string,
  payload: PushPayload
): Promise<void> {
  ensureInitialized()
  if (!initialized) return

  const enabledRes = await supabase
    .from("Settings")
    .select("value")
    .eq("key", "setting:pushNotifications")
    .single()

  if (enabledRes.data?.value !== "true") return

  const settingRes = await supabase
    .from("Settings")
    .select("value")
    .eq("key", `setting:${settingKey}`)
    .single()

  if (settingRes.data?.value !== "true") return

  await sendPushToAll(payload)
}

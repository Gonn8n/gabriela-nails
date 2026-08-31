"use client"

import { useState, useCallback, useRef } from "react"

interface DashboardData {
  todayAppointments: {
    id: string
    identifier: string
    date: string
    startTime: string
    endTime: string
    status: string
    totalPrice: number
    paid: boolean
    deposit: number
    client: { id: string; firstName: string; lastName: string; phone: string | null; email: string | null } | null
    services: { serviceId: string; service: { id: string; name: string; color: string; price: number; duration: number } }[]
  }[]
  upcomingCount: number
  completedCount: number
  cancelledCount: number
  rescheduledCount: number
  totalClients: number
  revenue: number
  paidCount: number
  unpaidCompletedCount: number
}

const cache = new Map<string, DashboardData>()
const inflight = new Map<string, Promise<DashboardData>>()

export function useDashboardCache() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const currentRange = useRef("")

  const fetchData = useCallback(async (range: string, force = false) => {
    currentRange.current = range

    if (!force && cache.has(range)) {
      setData(cache.get(range)!)
      return
    }

    if (!force && inflight.has(range)) {
      setLoading(true)
      const result = await inflight.get(range)!
      if (currentRange.current === range) {
        setData(result)
        setLoading(false)
      }
      return
    }

    setLoading(true)
    const promise = fetch(`/api/dashboard?range=${range}`)
      .then((r) => r.json())
      .then((json: DashboardData) => {
        cache.set(range, json)
        inflight.delete(range)
        return json
      })
      .catch((err) => {
        inflight.delete(range)
        throw err
      })

    inflight.set(range, promise)

    try {
      const result = await promise
      if (currentRange.current === range) {
        setData(result)
      }
    } finally {
      if (currentRange.current === range) {
        setLoading(false)
      }
    }
  }, [])

  const invalidate = useCallback(() => {
    cache.clear()
    inflight.clear()
  }, [])

  return { data, loading, fetchData, invalidate }
}

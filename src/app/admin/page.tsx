"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Users, DollarSign, Clock, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/page-header"

interface DashboardData {
  todayAppointments: {
    id: string
    identifier: string
    date: string
    startTime: string
    endTime: string
    status: string
    totalPrice: number
    client: { firstName: string; lastName: string }
    services: { service: { name: string; color: string } }[]
  }[]
  upcomingCount: number
  completedCount: number
  cancelledCount: number
  rescheduledCount: number
  totalClients: number
  revenue: number
}

const RANGE_OPTIONS = [
  { value: "today", label: "Hoy" },
  { value: "7", label: "7 días" },
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
]

const STATUS_LABELS: Record<string, string> = {
  booked: "Reservado",
  confirmed: "Confirmado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
  rescheduled: "Reprogramado",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  booked: "default",
  confirmed: "secondary",
  in_progress: "outline",
  completed: "secondary",
  cancelled: "destructive",
  rescheduled: "outline",
}

export default function DashboardPage() {
  const [range, setRange] = useState("today")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const res = await fetch(`/api/dashboard?range=${range}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [range])

  if (loading || !data) {
    return <div className="text-center py-8">Cargando dashboard...</div>
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={range === "today" ? "Resumen del día" : `Próximos ${range} días`}
        actions={
          <div className="flex gap-1 border rounded-md p-0.5" role="group" aria-label="Rango de fechas">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={range === opt.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setRange(opt.value)}
                className="text-xs px-3"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Turnos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.upcomingCount + data.completedCount}</div>
            <p className="text-xs text-muted-foreground">{data.completedCount} completados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.upcomingCount}</div>
            <p className="text-xs text-muted-foreground">{data.cancelledCount} cancelados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalClients}</div>
            <p className="text-xs text-muted-foreground">registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Facturación</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.revenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats secundarias */}
      {(data.rescheduledCount > 0 || data.cancelledCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {data.rescheduledCount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-card border rounded-lg px-3 py-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Reprogramados:</span>
              <span className="font-semibold">{data.rescheduledCount}</span>
            </div>
          )}
          {data.cancelledCount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-card border rounded-lg px-3 py-2">
              <span className="text-muted-foreground">Cancelados:</span>
              <span className="font-semibold">{data.cancelledCount}</span>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {range === "today" ? "Turnos de Hoy" : "Turnos del Período"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.todayAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">No hay turnos en este período</p>
          ) : (
            <div className="space-y-3">
              {data.todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-center shrink-0 w-12">
                      <div className="text-sm font-bold">{apt.startTime}</div>
                      <div className="text-[10px] text-muted-foreground">{apt.endTime}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{apt.client.firstName} {apt.client.lastName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {apt.services.map((s) => s.service.name).join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANTS[apt.status] || "default"} className="text-[10px]">
                      {STATUS_LABELS[apt.status] || apt.status}
                    </Badge>
                    <span className="text-sm font-medium">${apt.totalPrice.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

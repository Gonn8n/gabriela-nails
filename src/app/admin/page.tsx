"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Users, DollarSign, Clock, RefreshCw, CircleDollarSign, AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useDashboardCache } from "@/hooks/use-dashboard-cache"

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
  const { data, loading, fetchData, invalidate } = useDashboardCache()

  useEffect(() => {
    invalidate()
    fetchData(range)
  }, [range, fetchData, invalidate])

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-")
    return `${d}/${m}`
  }

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

      {/* Row 1: Métricas principales */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Turnos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.upcomingCount + data.completedCount}</div>
            <p className="text-xs text-muted-foreground">{data.completedCount} finalizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Cobrado</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{data.paidCount}</div>
            <p className="text-xs text-muted-foreground">turnos cobrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Facturación</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">${data.revenue.toLocaleString("es-AR")}</div>
            <p className="text-xs text-muted-foreground">cobrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Métricas secundarias */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Reservados</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.upcomingCount}</div>
            <p className="text-xs text-muted-foreground">agendados, pendientes</p>
          </CardContent>
        </Card>
        <Card className={data.unpaidCompletedCount > 0 ? "border-amber-300 bg-amber-50/30" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pendiente de cobro</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data.unpaidCompletedCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.unpaidCompletedCount > 0 ? "text-amber-600" : ""}`}>
              {data.unpaidCompletedCount}
            </div>
            <p className="text-xs text-muted-foreground">finalizados sin cobrar</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalClients}</div>
            <p className="text-xs text-muted-foreground">registrados</p>
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
                    <div className="text-center shrink-0 w-16">
                      <div className="text-[10px] text-muted-foreground font-medium">{formatDate(apt.date)}</div>
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
                    {apt.status === "completed" && (
                      <CircleDollarSign className={`h-4 w-4 ${apt.paid ? "text-emerald-500" : "text-amber-400"}`} />
                    )}
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

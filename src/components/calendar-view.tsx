"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react"

interface Appointment {
  id: string
  identifier: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  client: { firstName: string; lastName: string; phone: string | null }
  services: { service: { name: string; color: string } }[]
}

type ViewMode = "day" | "week" | "month"

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const HOUR_HEIGHT = 64

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    booked: "bg-blue-500",
    confirmed: "bg-green-500",
    in_progress: "bg-yellow-500",
    completed: "bg-gray-500",
    cancelled: "bg-red-500",
  }
  return colors[status] || "bg-gray-500"
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    booked: "Reservado",
    confirmed: "Confirmado",
    in_progress: "En curso",
    completed: "Completado",
    cancelled: "Cancelado",
  }
  return labels[status] || status
}

function getWeekDays(date: Date): Date[] {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay() + 1) // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7 // Monday-based
  const totalDays = lastDay.getDate()
  const days: Date[] = []
  for (let i = -startPad; i < totalDays; i++) {
    days.push(new Date(year, month, i + 1))
  }
  return days
}

function isToday(d: Date) {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function isSameDay(a: string, b: Date) {
  const d = new Date(a)
  return d.getDate() === b.getDate() && d.getMonth() === b.getMonth() && d.getFullYear() === b.getFullYear()
}

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate, viewMode])

  async function fetchCalendarData() {
    setLoading(true)
    let start: string, end: string

    if (viewMode === "day") {
      start = currentDate.toISOString().split("T")[0]
      end = start
    } else if (viewMode === "week") {
      const days = getWeekDays(currentDate)
      start = days[0].toISOString().split("T")[0]
      end = days[6].toISOString().split("T")[0]
    } else {
      const days = getMonthDays(currentDate)
      start = days[0].toISOString().split("T")[0]
      end = days[days.length - 1].toISOString().split("T")[0]
    }

    const res = await fetch(`/api/calendar?start=${start}&end=${end}`)
    const data = await res.json()
    setAppointments(data.appointments || [])
    setLoading(false)
  }

  function shift(delta: number) {
    const d = new Date(currentDate)
    if (viewMode === "day") d.setDate(d.getDate() + delta)
    else if (viewMode === "week") d.setDate(d.getDate() + delta * 7)
    else d.setMonth(d.getMonth() + delta)
    setCurrentDate(d)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const dayStart = HOURS[0] * 60
  const totalMinutes = HOURS.length * 60
  const gridHeight = HOURS.length * HOUR_HEIGHT

  function renderDayColumn(day: Date, compact = false) {
    const dayApts = appointments.filter((a) => isSameDay(a.date, day))
    return (
      <div className="flex-1 relative min-w-0">
        {HOURS.map((hour) => (
          <div key={hour} className="border-b border-r" style={{ height: HOUR_HEIGHT }} />
        ))}
        {dayApts.map((apt) => {
          const startMin = timeToMinutes(apt.startTime) - dayStart
          const endMin = timeToMinutes(apt.endTime) - dayStart
          const top = (startMin / totalMinutes) * gridHeight
          const height = ((endMin - startMin) / totalMinutes) * gridHeight
          const serviceColor = apt.services[0]?.service.color || "#6b7280"
          return (
            <div
              key={apt.id}
              className={`absolute left-0.5 right-0.5 rounded border-l-3 shadow-sm z-20 cursor-pointer ${getStatusColor(apt.status)}`}
              style={{ top, height: Math.max(height, compact ? 24 : 40), borderLeftColor: serviceColor }}
            >
              {!compact && (
                <div className="p-1.5 text-white text-xs leading-tight">
                  <div className="font-medium truncate">{apt.client.firstName} {apt.client.lastName}</div>
                  <div className="opacity-90">{apt.startTime}-{apt.endTime}</div>
                  <div className="opacity-90 truncate">{apt.services.map((s) => s.service.name).join(", ")}</div>
                </div>
              )}
            </div>
          )
        })}
        {day.toDateString() === new Date().toDateString() && viewMode === "day" && (
          <div
            className="absolute left-0 right-0 border-t-2 border-red-500 z-30"
            style={{ top: `${((new Date().getHours() * 60 + new Date().getMinutes() - dayStart) / totalMinutes) * gridHeight}px` }}
          >
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        )}
      </div>
    )
  }

  // Mobile day view
  function renderMobileDay() {
    const dayApts = appointments.filter((a) => isSameDay(a.date, currentDate))
    return (
      <div className="space-y-2">
        {HOURS.map((hour) => {
          const hourApts = dayApts.filter((a) => {
            const h = parseInt(a.startTime.split(":")[0])
            return h === hour
          })
          return (
            <div key={hour} className="flex gap-3">
              <div className="w-14 text-xs text-muted-foreground text-right pt-1 shrink-0">{hour}:00</div>
              <div className="flex-1 min-h-[48px] border-l-2 border-border pl-3 relative">
                {hourApts.map((apt) => {
                  const serviceColor = apt.services[0]?.service.color || "#6b7280"
                  return (
                    <div key={apt.id} className="bg-white border rounded-lg p-2 mb-1 shadow-sm" style={{ borderLeftColor: serviceColor, borderLeftWidth: 4 }}>
                      <div className="font-medium text-sm">{apt.client.firstName} {apt.client.lastName}</div>
                      <div className="text-xs text-muted-foreground">{apt.startTime}-{apt.endTime} | {apt.services.map((s) => s.service.name).join(", ")}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border rounded-md">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <Button key={mode} variant={viewMode === mode ? "default" : "ghost"} size="sm" onClick={() => setViewMode(mode)} className="rounded-none first:rounded-l-md last:rounded-r-md text-xs px-3">
                {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "day" && (
        <div className="text-sm text-muted-foreground">
          {currentDate.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      )}
      {viewMode === "week" && (
        <div className="text-sm text-muted-foreground">
          Semana del {getWeekDays(currentDate)[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} al {getWeekDays(currentDate)[6].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      )}
      {viewMode === "month" && (
        <div className="text-sm text-muted-foreground">
          {currentDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Cargando turnos...</div>
      ) : viewMode === "day" ? (
        <>
          <div className="lg:hidden">{renderMobileDay()}</div>
          <div className="hidden lg:block border rounded-lg bg-white overflow-x-auto">
            <div className="flex min-w-[600px]">
              <div className="w-16 border-r shrink-0">
                {HOURS.map((hour) => (
                  <div key={hour} className="border-b text-xs text-muted-foreground text-right pr-2" style={{ height: HOUR_HEIGHT }}>
                    {hour}:00
                  </div>
                ))}
              </div>
              {renderDayColumn(currentDate)}
            </div>
          </div>
        </>
      ) : viewMode === "week" ? (
        /* Week view */
        <div className="border rounded-lg bg-white overflow-x-auto">
          <div className="flex min-w-[700px]">
            <div className="w-14 border-r shrink-0">
              {HOURS.map((hour) => (
                <div key={hour} className="border-b text-[10px] text-muted-foreground text-right pr-1" style={{ height: HOUR_HEIGHT }}>
                  {hour}:00
                </div>
              ))}
            </div>
            {getWeekDays(currentDate).map((day) => (
              <div key={day.toISOString()} className="flex-1 border-r last:border-r-0">
                <div className={`text-center py-2 border-b text-xs font-medium ${isToday(day) ? "bg-pink-50 text-pink-700" : ""}`}>
                  {day.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}
                </div>
                <div className="relative" style={{ height: gridHeight }}>
                  {HOURS.map((hour) => (
                    <div key={hour} className="border-b" style={{ height: HOUR_HEIGHT }} />
                  ))}
                  {appointments.filter((a) => isSameDay(a.date, day)).map((apt) => {
                    const startMin = timeToMinutes(apt.startTime) - dayStart
                    const endMin = timeToMinutes(apt.endTime) - dayStart
                    const top = (startMin / totalMinutes) * gridHeight
                    const height = ((endMin - startMin) / totalMinutes) * gridHeight
                    return (
                      <div
                        key={apt.id}
                        className={`absolute left-0.5 right-0.5 rounded border-l-3 text-white text-[10px] p-1 z-20 ${getStatusColor(apt.status)}`}
                        style={{ top, height: Math.max(height, 24), borderLeftColor: apt.services[0]?.service.color || "#6b7280" }}
                      >
                        <div className="font-medium truncate">{apt.client.firstName}</div>
                        {height > 30 && <div className="opacity-90">{apt.startTime}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Month view */
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="grid grid-cols-7">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center py-2 border-b text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getMonthDays(currentDate).map((day) => {
              const dayApts = appointments.filter((a) => isSameDay(a.date, day))
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] sm:min-h-[100px] border-b border-r p-1 last:border-r-0 ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""} ${isToday(day) ? "bg-pink-50" : ""}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday(day) ? "bg-pink-600 text-white w-5 h-5 rounded-full flex items-center justify-center" : ""}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayApts.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className="text-[10px] leading-tight rounded px-1 py-0.5 truncate text-white"
                        style={{ backgroundColor: apt.services[0]?.service.color || "#6b7280" }}
                      >
                        {apt.startTime} {apt.client.firstName}
                      </div>
                    ))}
                    {dayApts.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayApts.length - 3} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface BookingCalendarProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  minDate?: string
  maxDate?: string
  workingDays?: number[]
  disabledDates?: string[]
}

const DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"]
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const days: Date[] = []
  for (let i = -startPad; i < lastDay.getDate(); i++) {
    days.push(new Date(year, month, i + 1))
  }
  return days
}

function isToday(d: Date) {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function dateToStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function BookingCalendar({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  workingDays = [1, 2, 3, 4, 5, 6],
  disabledDates = [],
}: BookingCalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split("-").map(Number)
      return new Date(y, m - 1, 1)
    }
    return new Date()
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const days = getMonthDays(year, month)

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  function isDisabled(d: Date): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (d < today) return true
    if (minDate) {
      const min = new Date(minDate + "T00:00:00")
      if (d < min) return true
    }
    if (maxDate) {
      const max = new Date(maxDate + "T00:00:00")
      if (d > max) return true
    }
    const dayOfWeek = d.getDay()
    if (!workingDays.includes(dayOfWeek)) return true
    if (disabledDates.includes(dateToStr(d))) return true
    return false
  }

  function isCurrentMonth(d: Date): boolean {
    return d.getMonth() === month && d.getFullYear() === year
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
        </div>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {days.map((d) => {
          const str = dateToStr(d)
          const selected = str === selectedDate
          const disabled = isDisabled(d) || !isCurrentMonth(d)
          const today = isToday(d)

          return (
            <button
              key={str}
              type="button"
              disabled={disabled}
              onClick={() => onDateSelect(str)}
              className={`
                relative h-10 text-sm rounded-lg transition-colors
                ${selected
                  ? "bg-pink-500 text-white font-semibold shadow-sm"
                  : today
                    ? "border border-pink-300 text-pink-600 font-medium"
                    : disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-pink-50 cursor-pointer"
                }
                ${!isCurrentMonth(d) ? "text-gray-200" : ""}
              `}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

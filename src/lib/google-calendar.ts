/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCalendarClient } from "./google"

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary"

interface CalendarEventData {
  identifier: string
  date: string
  startTime: string
  endTime: string
  clientName: string
  clientEmail: string | null
  services: string
  totalPrice: number
  appointmentId: string
}

function buildDescription(apt: CalendarEventData): string {
  return [
    `Turno: ${apt.identifier}`,
    `Cliente: ${apt.clientName}`,
    `Servicios: ${apt.services}`,
    `Total: $${apt.totalPrice.toLocaleString("es-AR")}`,
    `ID: ${apt.appointmentId}`,
  ].join("\n")
}

export async function createCalendarEvent(
  data: CalendarEventData
): Promise<string | null> {
  try {
    const calendar = getCalendarClient()
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `${data.identifier} — ${data.clientName}`,
        description: buildDescription(data),
        start: {
          date: data.date,
          time: data.startTime,
          timeZone: "America/Argentina/Cordoba",
        },
        end: {
          date: data.date,
          time: data.endTime,
          timeZone: "America/Argentina/Cordoba",
        },
        attendees: data.clientEmail ? [{ email: data.clientEmail }] : undefined,
        extendedProperties: {
          private: {
            appointmentId: data.appointmentId,
          },
        },
      },
    })
    return response.data.id ?? null
  } catch (error) {
    console.error("Error creating calendar event:", error)
    return null
  }
}

export async function updateCalendarEvent(
  eventId: string,
  data: CalendarEventData
): Promise<boolean> {
  try {
    const calendar = getCalendarClient()
    await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId,
      requestBody: {
        summary: `${data.identifier} — ${data.clientName}`,
        description: buildDescription(data),
        start: {
          date: data.date,
          time: data.startTime,
          timeZone: "America/Argentina/Cordoba",
        },
        end: {
          date: data.date,
          time: data.endTime,
          timeZone: "America/Argentina/Cordoba",
        },
      },
    })
    return true
  } catch (error) {
    console.error("Error updating calendar event:", error)
    return false
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const calendar = getCalendarClient()
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
    })
    return true
  } catch (error) {
    console.error("Error deleting calendar event:", error)
    return false
  }
}

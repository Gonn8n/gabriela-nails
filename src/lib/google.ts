import { google } from "googleapis"
import nodemailer from "nodemailer"

const GOOGLE_CLIENT_ID = process.env.GMAIL_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!
const GOOGLE_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN!
const GMAIL_USER = "gabriela.nails026@gmail.com"

export function getOAuth2Client() {
  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })
  return client
}

export function getGmailTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      refreshToken: GOOGLE_REFRESH_TOKEN,
      user: GMAIL_USER,
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCalendarClient(): any {
  const authClient = getOAuth2Client()
  return google.calendar({ version: "v3", auth: authClient })
}

export { GMAIL_USER }

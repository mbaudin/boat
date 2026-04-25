import { google, type calendar_v3 } from 'googleapis'
import { env } from './env'

const getCalendarClient = (): calendar_v3.Calendar | null => {
  const serviceAccountJson = env.gcalServiceAccountJson()
  const refreshToken = env.gcalOauthRefreshToken()
  const calendarId = env.gcalCalendarId()
  if (!calendarId) {
    return null
  }
  if (serviceAccountJson) {
    const credentials = JSON.parse(serviceAccountJson)
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    return google.calendar({ version: 'v3', auth })
  }
  if (refreshToken) {
    const oAuth2Client = new google.auth.OAuth2(
      env.googleClientId(),
      env.googleClientSecret(),
    )
    oAuth2Client.setCredentials({ refresh_token: refreshToken })
    return google.calendar({ version: 'v3', auth: oAuth2Client })
  }
  return null
}

const toGcalDate = (d: Date): string => d.toISOString().slice(0, 10)

export interface GcalEventInput {
  summary: string
  description?: string
  startDate: Date
  endDateExclusive: Date
  colorHex?: string
}

const hexToColorId = (hex: string | undefined): string | undefined => {
  if (!hex) {
    return undefined
  }
  const map: Record<string, string> = {
    '#1976d2': '9',
    '#2e7d32': '10',
    '#c62828': '11',
    '#9e9e9e': '8',
  }
  return map[hex.toLowerCase()]
}

export const createGcalEvent = async (input: GcalEventInput): Promise<string | null> => {
  const client = getCalendarClient()
  if (!client) {
    console.warn('[gcal] calendar client not configured; skipping create')
    return null
  }
  try {
    const res = await client.events.insert({
      calendarId: env.gcalCalendarId(),
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { date: toGcalDate(input.startDate) },
        end: { date: toGcalDate(input.endDateExclusive) },
        colorId: hexToColorId(input.colorHex),
      },
    })
    return res.data.id ?? null
  } catch (err) {
    console.error('[gcal] create failed', err)
    return null
  }
}

export const deleteGcalEvent = async (eventId: string | null): Promise<void> => {
  if (!eventId) {
    return
  }
  const client = getCalendarClient()
  if (!client) {
    return
  }
  try {
    await client.events.delete({ calendarId: env.gcalCalendarId(), eventId })
  } catch (err) {
    console.error('[gcal] delete failed', err)
  }
}

const required = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

const optional = (key: string, fallback = ''): string => process.env[key] ?? fallback

export const env = {
  databaseUrl: (): string => required('DATABASE_URL'),
  appBaseUrl: (): string => optional('APP_BASE_URL', 'http://localhost:3000'),
  ownerEmails: (): string[] =>
    optional('OWNER_EMAILS').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  googleClientId: (): string => required('GOOGLE_CLIENT_ID'),
  googleClientSecret: (): string => required('GOOGLE_CLIENT_SECRET'),
  authSecret: (): string => required('NEXTAUTH_SECRET'),
  resendApiKey: (): string => optional('RESEND_API_KEY'),
  emailFrom: (): string => optional('EMAIL_FROM', 'Boat <onboarding@resend.dev>'),
  gcalCalendarId: (): string => optional('GCAL_CALENDAR_ID'),
  gcalServiceAccountJson: (): string => optional('GCAL_SERVICE_ACCOUNT_JSON'),
  gcalOauthRefreshToken: (): string => optional('GCAL_OAUTH_REFRESH_TOKEN'),
}

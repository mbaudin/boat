import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material'
import { signIn } from '@/lib/auth'
import { env } from '@/lib/env'

export default function SignInPage(): React.ReactNode {
  const isDev = process.env.NODE_ENV !== 'production'
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
  const owners = isDev ? env.ownerEmails() : []

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 420, width: '100%' }} elevation={2}>
        <Typography variant="h5" gutterBottom>Boat schedule</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in with your owner Google account.
        </Typography>

        {hasGoogle && (
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/' })
            }}
          >
            <Button type="submit" variant="contained" fullWidth>
              Sign in with Google
            </Button>
          </form>
        )}

        {isDev && owners.length > 0 && (
          <>
            <Divider sx={{ my: 3 }}>Dev login (local testing)</Divider>
            <Stack spacing={1}>
              {owners.map((email) => (
                <form
                  key={email}
                  action={async () => {
                    'use server'
                    await signIn('dev', { email, redirectTo: '/' })
                  }}
                >
                  <Button type="submit" variant="outlined" fullWidth>
                    Sign in as {email}
                  </Button>
                </form>
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Dev-only shortcut. Disabled in production builds.
              </Typography>
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  )
}

'use client'

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0b5394' },
  },
  shape: { borderRadius: 8 },
})

export const ThemeRegistry = ({ children }: { children: React.ReactNode }): React.ReactNode => {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}

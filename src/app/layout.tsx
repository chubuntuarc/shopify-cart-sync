import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '🏹 Arco Cart Sync',
  description: 'Arco Cart Sync by Jesus Arciniega',
  icons: {
    icon: [
      { url: '/favicon.ico' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 
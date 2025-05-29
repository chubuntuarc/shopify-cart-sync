import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Persistent Cart Middleware',
  description: 'Next.js middleware for Shopify persistent cart',
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
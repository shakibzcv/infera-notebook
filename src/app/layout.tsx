import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/sonner';
/**
 * Metadata configuration for the Infera Notebook application.
 * Defines the title, description, and various icon sizes for different platforms.
 */
export const metadata: Metadata = {
  title: 'Infera Notebook – AI-Powered Notes & Podcast Generator',
  description:
    'Infera Notebook lets you upload documents, chat with your files, and instantly generate insightful notes and engaging podcasts using cutting-edge LLM technology.',
  icons: {
    icon: [
      {
        url: '/favicon_io/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon_io/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      { url: '/favicon_io/favicon.ico', sizes: 'any' },
    ],
    apple: [
      {
        url: '/favicon_io/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    other: [
      {
        rel: 'manifest',
        url: '/favicon_io/site.webmanifest',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        url: '/favicon_io/android-chrome-192x192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        url: '/favicon_io/android-chrome-512x512.png',
      },
    ],
  },
};

/**
 * The RootLayout component serves as the top-level wrapper for the entire application.
 * It provides global providers, styling, and basic HTML structure.
 *
 * @param children - The page content to be rendered within the layout
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">
        {/* ThemeProvider manages dark/light mode across the application */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Toaster provides global notification support */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

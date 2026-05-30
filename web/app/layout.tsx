import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { AppProviders } from '../components/providers';
import { googleAnalyticsId, googleMapsApiKey } from '../lib/config';

export const metadata: Metadata = {
  metadataBase: new URL('https://drive.example.com'),
  title: {
    default: 'Drive Passenger Web',
    template: '%s · Drive Passenger Web',
  },
  description: 'Book rides, manage your account, track active trips, review receipts, and handle support from a responsive passenger web application.',
  keywords: ['ride booking', 'passenger web app', 'ride tracking', 'wallet', 'support', 'payments'],
  applicationName: 'Drive Passenger Web',
  openGraph: {
    title: 'Drive Passenger Web',
    description: 'Responsive ride booking and account management for passengers.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Drive Passenger Web',
    description: 'Ride booking, live trip tracking, wallet, support, and account management on the web.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-50">
        {googleMapsApiKey ? (
          <Script src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`} strategy="afterInteractive" />
        ) : null}
        {googleAnalyticsId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${googleAnalyticsId}');`}
            </Script>
          </>
        ) : null}
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

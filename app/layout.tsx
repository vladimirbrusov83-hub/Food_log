import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "FoodLog",
  description: "A food log for one person.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FoodLog" },
};

export const viewport: Viewport = {
  themeColor: "#f5f7f6",
  width: "device-width",
  initialScale: 1,
  // The app is used one-handed on a phone; a pinch-zoom here is always a slip.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Nav />
      </body>
    </html>
  );
}

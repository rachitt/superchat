import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/lib/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SuperChat",
  description: "Real-time chat with AI, games, and living messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased noise-overlay`}
      >
        <Providers>
          <TooltipProvider delay={300}>
            {children}
          </TooltipProvider>
        </Providers>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "oklch(0.17 0.005 285)",
              border: "1px solid oklch(0.24 0.008 285)",
              color: "oklch(0.88 0.005 285)",
            },
          }}
        />
      </body>
    </html>
  );
}

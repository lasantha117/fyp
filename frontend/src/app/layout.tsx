        // L4 FYP/frontend/src/app/layout.tsx
        import type { Metadata } from "next";
        import { Inter } from "next/font/google"; // Import Inter font
        import "./globals.css"; // Import the global CSS file
        import 'bootstrap/dist/css/bootstrap.min.css'; // ADD THIS LINE FOR BOOTSTRAP

        // Initialize Inter font
        const inter = Inter({
          subsets: ["latin"],
          // No need for 'variable' if not using Tailwind's font utilities
        });

        export const metadata: Metadata = {
          title: "Resume Matcher App",
          description: "A modern resume matching application.",
        };

        export default function RootLayout({
          children,
        }: Readonly<{
          children: React.ReactNode;
        }>) {
          return (
            <html lang="en">
              {/* Apply Inter font directly to body and rely on globals.css for background/text colors */}
              <body className={inter.className}>
                {children}
              </body>
            </html>
          );
        }
        
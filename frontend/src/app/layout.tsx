import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BrandProof — No citation, no flag.",
  description: "Intelligent enterprise brand-governance and content compliance verification platform.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="bg-[#F7FAFA] text-[#172C32] antialiased">
        {children}
      </body>
    </html>
  );
}


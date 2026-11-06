import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pantry Chef",
  description: "Tell it what's in your kitchen, get recipes you can cook right now.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoveMath — Dynamic Salary to Budget Planner",
  description: "Interactive personal finance sandbox: input your salary and instantly see a dynamic monthly budget with taxes, savings, retirement, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

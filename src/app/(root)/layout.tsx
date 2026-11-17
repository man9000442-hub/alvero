import type { ReactNode } from "react";
import "../globals.css";

export default function RootRedirectLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">{children}</body>
    </html>
  );
}

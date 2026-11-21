import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Vórtex PDF - Tus PDF, sin límites",
  description:
    "Vórtex PDF, de Vortex Company: une, divide, convierte, firma, comprime sin perder calidad y protege con contraseña tus documentos PDF. Gratis, sin anuncios y 100% local en tu navegador.",
  keywords: [
    "Vórtex PDF",
    "unir PDF",
    "dividir PDF",
    "convertir PDF",
    "firmar PDF",
    "comprimir PDF",
    "proteger PDF con contraseña",
    "gratis",
    "sin anuncios",
  ],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#7c3aed" stroke-width="3.5"/><path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#a78bfa" stroke-width="3.5" stroke-linecap="round"/><path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#a78bfa" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="24" r="3" fill="#a78bfa"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex PDF - Tus PDF, sin límites",
    description:
      "Unir, dividir, convertir, firmar, comprimir y proteger PDF. Gratis, sin anuncios y 100% local. De Vortex Company, la misma compañía de Vórtex Music.",
    siteName: "Vórtex PDF",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#161616",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#121212] text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

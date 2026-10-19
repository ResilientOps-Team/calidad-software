import React from 'react'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ResilientOps | Simulador de Continuidad Operativa ante Desastres',
  description:
    'Simulador de continuidad operativa ante desastres para modelar infraestructuras digitales, evaluar disponibilidad y planificar DRP.',
  // Permite verificar tras el despliegue qué versión y commit se están sirviendo
  other: {
    'app-version': process.env.NEXT_PUBLIC_APP_VERSION ?? '',
    'app-commit': process.env.NEXT_PUBLIC_APP_COMMIT ?? '',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-[#F8FAFC] text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  )
}

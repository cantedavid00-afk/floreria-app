import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Florería RoCé — Cotizador de arreglos florales',
  description: 'Sube una foto de tu arreglo favorito y recibe una cotización al instante. Flores frescas en Apizaco, Tlaxcala.',
  keywords:    ['florería', 'flores', 'arreglos florales', 'cotizador', 'Apizaco', 'Tlaxcala'],
  openGraph: {
    title:       'Florería RoCé',
    description: 'Cotiza tu arreglo floral en segundos con ayuda de IA',
    locale:      'es_MX',
    type:        'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* lang="es" — importante para accesibilidad y SEO */
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  )
}

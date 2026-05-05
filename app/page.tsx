// app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">

        {/* Hero */}
        <div className="text-8xl mb-6 select-none">💐</div>
        <h1 className="text-5xl font-bold text-rose-800 mb-3">
          Florería RoCé
        </h1>
        <p className="text-xl text-rose-600 mb-2">
          Cotizador inteligente de arreglos florales
        </p>
        <p className="text-gray-500 text-sm mb-10">
          Sube una foto de tu arreglo favorito y recibe una cotización al instante
        </p>

        {/* CTA */}
        <Link
          href="/cotizador"
          className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          🌸 Cotizar mi arreglo
        </Link>

        {/* Features */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          {[
            {
              emoji: '🤖',
              title: 'IA Inteligente',
              desc: 'Detecta automáticamente las flores desde tu foto de referencia',
            },
            {
              emoji: '✏️',
              title: 'Edición Fácil',
              desc: 'Ajusta cantidades, cambia colores y elige el papel de envoltura',
            },
            {
              emoji: '💬',
              title: 'Pedido por WhatsApp',
              desc: 'Envía tu pedido aprobado directamente al WhatsApp del negocio',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100"
            >
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Link admin */}
        <p className="mt-10 text-xs text-gray-400">
          ¿Eres el dueño?{' '}
          <Link href="/admin" className="text-rose-400 hover:text-rose-600 underline">
            Ir al panel de administración
          </Link>
        </p>
      </div>
    </main>
  )
}

// app/page.tsx  —  Landing hero · Florería RoCé
// Design system: UI/UX Pro Max → Florist / Organic Biophilic
// Paleta:   Primary #15803D · Accent #EC4899 · Bg #F0FDF4
// Tipog.:   Rubik (headings) + Nunito Sans (body)
// Checklist: SVG icons (no emojis), hover states, WCAG AA, responsive 375→1440

import Link from 'next/link'

/* ── Iconos SVG inline (sin dependencias externas) ──────────── */
function IconoIA() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V6a4 4 0 0 1 4-4z"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function IconoEditar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconoWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.11 1.523 5.836L0 24l6.335-1.498A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.003-1.37l-.36-.213-3.76.889.942-3.656-.235-.374A9.786 9.786 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
    </svg>
  )
}

function IconoFlor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7" aria-hidden="true">
      <path d="M12 22V12"/>
      <path d="M12 12C12 8 9 5 5 5c0 4 3 7 7 7z"/>
      <path d="M12 12C12 8 15 5 19 5c0 4-3 7-7 7z"/>
      <path d="M12 12C8 12 5 15 5 19c4 0 7-3 7-7z"/>
      <path d="M12 12C16 12 19 15 19 19c-4 0-7-3-7-7z"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    </svg>
  )
}

/* ── Tarjeta de feature ──────────────────────────────────── */
interface FeatureCardProps {
  icon:  React.ReactNode
  title: string
  desc:  string
  delay: string
  color: string
}

function FeatureCard({ icon, title, desc, delay, color }: FeatureCardProps) {
  return (
    <div
      className={`animate-fade-up ${delay} bg-white rounded-2xl p-6 shadow-sm border border-green-100
        hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)' }}
        className="font-semibold text-green-900 mb-2 text-[15px]">
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}

/* ── Decoración floral SVG (fondo orgánico) ──────────────── */
function DecoracionFondo() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-[0.06]"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 800 600"
    >
      {/* Círculos orgánicos decorativos */}
      <circle cx="100" cy="100" r="180" fill="#15803D"/>
      <circle cx="700" cy="500" r="220" fill="#22C55E"/>
      <circle cx="650" cy="80"  r="120" fill="#EC4899"/>
      <circle cx="50"  cy="520" r="100" fill="#EC4899"/>
    </svg>
  )
}

/* ── Página principal ────────────────────────────────────── */
export default function HomePage() {
  const features = [
    {
      icon:  <IconoIA />,
      title: 'IA Inteligente',
      desc:  'Detecta automáticamente las flores en tu foto de referencia y genera una cotización precisa al instante.',
      delay: 'delay-100',
      color: 'bg-green-50 text-green-700',
    },
    {
      icon:  <IconoEditar />,
      title: 'Edición Fácil',
      desc:  'Ajusta cantidades, cambia colores y elige el papel de envoltura. Todo con una interfaz clara y sin complicaciones.',
      delay: 'delay-200',
      color: 'bg-pink-50 text-pink-600',
    },
    {
      icon:  <IconoWhatsApp />,
      title: 'Pedido por WhatsApp',
      desc:  'Envía tu pedido aprobado directamente al WhatsApp de la florería con un solo toque.',
      delay: 'delay-300',
      color: 'bg-green-50 text-green-700',
    },
  ]

  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16"
      style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #FEFCE8 50%, #FFF1F2 100%)' }}
    >
      {/* Fondo decorativo */}
      <DecoracionFondo />

      <div className="relative z-10 max-w-2xl w-full text-center">

        {/* Badge superior */}
        <div className="animate-fade-up inline-flex items-center gap-2 bg-white border border-green-200
          text-green-700 text-xs font-semibold px-4 py-2 rounded-full shadow-sm mb-8">
          <IconoFlor />
          Florería RoCé — Apizaco, Tlaxcala
        </div>

        {/* Headline principal */}
        <h1
          className="animate-fade-up delay-100 text-green-900 mb-4 font-extrabold tracking-tight"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize:   'var(--headline-size)',
            lineHeight: '1.1',
          }}
        >
          Tu arreglo floral,<br />
          <span style={{ color: 'var(--color-accent)' }}>cotizado en segundos</span>
        </h1>

        {/* Subtítulo */}
        <p className="animate-fade-up delay-200 text-slate-600 text-lg mb-2 max-w-lg mx-auto leading-relaxed">
          Sube una foto de referencia y nuestra IA detecta las flores,
          calcula el precio y prepara tu pedido para WhatsApp.
        </p>
        <p className="animate-fade-up delay-300 text-slate-400 text-sm mb-10">
          Sin registro · Sin complicaciones · Resultado inmediato
        </p>

        {/* CTA principal */}
        <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/cotizador"
            className="animate-pulse-cta inline-flex items-center gap-2 font-bold text-white
              px-8 py-4 rounded-2xl shadow-lg transition-all duration-200
              hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02]
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500"
            style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)', fontSize: '1.05rem' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Cotizar mi arreglo
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>

        {/* Trust signals */}
        <div className="animate-fade-up delay-500 mt-12 flex flex-wrap justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Flores frescas garantizadas
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Dos sucursales en Apizaco
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Pago con BBVA o efectivo
          </span>
        </div>

        {/* Link admin — discreto */}
        <p className="mt-10 text-xs text-slate-300">
          ¿Eres el administrador?{' '}
          <Link href="/admin"
            className="text-green-400 hover:text-green-600 underline underline-offset-2 transition-colors">
            Panel de administración
          </Link>
        </p>
      </div>
    </main>
  )
}

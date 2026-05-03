// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Cliente público (navegador y rutas de usuario anónimo) ──
// Usa la anon key → respeta las políticas RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Cliente admin (solo en API routes del servidor) ──────────
// Usa la service_role key → BYPASEA las políticas RLS
// ⚠️ NUNCA importes supabaseAdmin en componentes del cliente
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
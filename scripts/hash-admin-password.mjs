// scripts/hash-admin-password.mjs
// Genera ADMIN_PASSWORD_HASH (PBKDF2-SHA256). La contraseña se lee de stdin, no de
// argumentos, para que no quede en el historial de la terminal.
//   npm run hash-admin-password

import { hashAdminPassword } from '../lib/admin-session.ts'

async function readPassword() {
  const stdin = process.stdin
  if (!stdin.isTTY) {
    let data = ''
    stdin.setEncoding('utf8')
    for await (const chunk of stdin) data += chunk
    return data.replace(/\r?\n$/, '')
  }
  process.stderr.write('Contraseña del panel (mín. 12 caracteres): ')
  stdin.setRawMode(true)
  stdin.setEncoding('utf8')
  return new Promise((resolve) => {
    let pw = ''
    stdin.on('data', (ch) => {
      if (ch === '\r' || ch === '\n') { stdin.setRawMode(false); stdin.pause(); process.stderr.write('\n'); resolve(pw) }
      else if (ch === '\u0003') process.exit(130)
      else if (ch === '\u007f' || ch === '\b') pw = pw.slice(0, -1)
      else pw += ch
    })
  })
}

const pw = await readPassword()
if (pw.length < 12) {
  console.error('La contraseña debe tener al menos 12 caracteres.')
  process.exit(1)
}
// Solo se imprime el hash (no reversible), nunca la contraseña.
console.log(await hashAdminPassword(pw))

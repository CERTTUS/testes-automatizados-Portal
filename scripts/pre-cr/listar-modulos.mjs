import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-modulos.json'), 'utf8'))

console.log(`# Modulos QA_PRE_CR — ${catalogo.produto}\n`)
for (const m of catalogo.modulos) {
  console.log(`- **${m.slug}** — ${m.label}`)
  console.log(`  npm: \`${m.npm || 'specs'}\`${m.npmTestServer ? ` | test-server: \`${m.npmTestServer}\`` : ''}`)
  console.log(`  docs: \`${m.docs}\``)
}

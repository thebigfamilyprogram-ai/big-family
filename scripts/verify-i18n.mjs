import { readFileSync } from 'fs'

const LOCALES = ['es', 'en', 'fr', 'pt', 'ar']
const PH = /\{(\w+)\}/g

function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v))
      Object.assign(out, flatten(v, key))
    else out[key] = String(v ?? '')
  }
  return out
}

const data = {}
for (const l of LOCALES) {
  const raw = JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'))
  data[l] = flatten(raw)
}

const esKeys = new Set(Object.keys(data.es).filter(k => !k.startsWith('_meta')))
let issues = 0

for (const lang of LOCALES.filter(l => l !== 'es')) {
  const langKeys = new Set(Object.keys(data[lang]).filter(k => !k.startsWith('_meta')))
  const missing = [...esKeys].filter(k => !langKeys.has(k))
  const orphans = [...langKeys].filter(k => !esKeys.has(k))

  if (missing.length) {
    console.log(`\n❌ [${lang}] MISSING (${missing.length}):`)
    missing.forEach(k => console.log(`  - ${k}`))
    issues++
  }
  if (orphans.length) {
    console.log(`\n⚠️  [${lang}] ORPHANS (${orphans.length}):`)
    orphans.forEach(k => console.log(`  + ${k}`))
  }
  if (!missing.length && !orphans.length) {
    console.log(`✅ [${lang}] keys match es`)
  }

  // Placeholder check
  const phIssues = []
  for (const k of esKeys) {
    const esVal = data.es[k] ?? ''
    const esTokens = [...esVal.matchAll(PH)].map(m => m[1])
    if (!esTokens.length) continue
    const trVal = data[lang][k] ?? ''
    const missingPh = esTokens.filter(t => !trVal.includes(`{${t}}`))
    if (missingPh.length) {
      phIssues.push(
        `  ${k}\n    → missing: {${missingPh.join('}, {')}}\n    es:   ${esVal}\n    ${lang}: ${trVal || '(key missing)'}`
      )
    }
  }
  if (phIssues.length) {
    console.log(`\n❌ [${lang}] PLACEHOLDER MISMATCHES (${phIssues.length}):`)
    phIssues.forEach(p => console.log(p))
    issues++
  } else {
    console.log(`✅ [${lang}] placeholders OK`)
  }
}

console.log(issues ? `\n❌ ${issues} issue group(s) found` : '\n✅ All checks passed')
process.exit(issues ? 1 : 0)

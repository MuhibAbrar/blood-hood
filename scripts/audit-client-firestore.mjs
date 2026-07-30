/**
 * Static audit for browser-side Firestore coupling.
 *
 * Usage:
 *   node scripts/audit-client-firestore.mjs
 *
 * This script reads source files only. It never connects to Firebase.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const sourceRoots = ['app', 'components']
const extensions = new Set(['.ts', '.tsx'])
const directFirestoreImport = /from\s+['"]firebase\/firestore['"]/
const writeCalls = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\s*\(/g

const walk = (directory) => readdirSync(directory)
  .flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const findings = sourceRoots
  .flatMap((directory) => walk(resolve(root, directory)))
  .filter((path) => extensions.has(extname(path)))
  .flatMap((path) => {
    const source = readFileSync(path, 'utf8')
    if (!directFirestoreImport.test(source)) return []
    return [{
      file: relative(root, path).replaceAll('\\', '/'),
      directFirestoreImport: true,
      directWritePrimitives: Array.from(source.matchAll(writeCalls), (match) => match[1]),
    }]
  })

const report = {
  generatedAt: new Date().toISOString(),
  scope: sourceRoots,
  directFirestoreFiles: findings.length,
  directWriteFiles: findings.filter((finding) => finding.directWritePrimitives.length > 0).length,
  findings,
}

console.log(JSON.stringify(report, null, 2))

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const distSrc = join(dist, 'src')

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
  for (const item of readdirSync(src)) {
    const srcPath = join(src, item)
    const destPath = join(dest, item)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// Move files from dist/src/* to dist/*
if (existsSync(distSrc)) {
  for (const item of readdirSync(distSrc)) {
    const srcPath = join(distSrc, item)
    const destPath = join(dist, item)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }

  // Remove dist/src directory
  const { rmSync } = await import('fs')
  rmSync(distSrc, { recursive: true, force: true })
}

console.log('[postbuild] Files reorganized to dist/')

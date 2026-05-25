import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'public/icon.svg'))

await sharp(svg).resize(192, 192).png().toFile(join(root, 'public/icon-192.png'))
console.log('✓ icon-192.png')

await sharp(svg).resize(512, 512).png().toFile(join(root, 'public/icon-512.png'))
console.log('✓ icon-512.png')

await sharp(svg).resize(180, 180).png().toFile(join(root, 'public/apple-touch-icon.png'))
console.log('✓ apple-touch-icon.png')

console.log('Icons generated.')

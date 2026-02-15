import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')
const svgPath = resolve(publicDir, 'favicon.svg')
const svgBuffer = readFileSync(svgPath)

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
]

async function generate() {
  // Generate PNGs
  for (const { name, size } of sizes) {
    await sharp(svgBuffer, { density: Math.max(300, size * 4) })
      .resize(size, size)
      .png()
      .toFile(resolve(publicDir, name))
    console.log(`  ✓ ${name} (${size}x${size})`)
  }

  // Generate .ico (contains 16x16 and 32x32)
  const ico16 = await sharp(svgBuffer, { density: 300 })
    .resize(16, 16)
    .png()
    .toBuffer()
  const ico32 = await sharp(svgBuffer, { density: 300 })
    .resize(32, 32)
    .png()
    .toBuffer()

  const icoBuffer = await pngToIco([ico16, ico32])
  writeFileSync(resolve(publicDir, 'favicon.ico'), icoBuffer)
  console.log('  ✓ favicon.ico (16+32)')

  console.log('\nDone! All favicons generated in public/')
}

generate().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})

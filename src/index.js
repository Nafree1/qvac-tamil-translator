#!/usr/bin/env node
// Offline English <-> Tamil translator.
// Runs entirely on-device via Tether's QVAC SDK: no API key, no server call,
// nothing you type ever leaves this machine.

import readline from 'node:readline'
import { loadModel, translate, unloadModel, BERGAMOT_EN_TA, BERGAMOT_TA_EN } from '@qvac/sdk'

const TAMIL_SCRIPT = /[஀-௿]/

const DIRECTIONS = {
  enTa: { modelSrc: BERGAMOT_EN_TA, from: 'en', to: 'ta', label: 'EN -> TA' },
  taEn: { modelSrc: BERGAMOT_TA_EN, from: 'ta', to: 'en', label: 'TA -> EN' }
}

// Models are loaded lazily, one per direction, and cached for the session so
// switching between English and Tamil input doesn't re-download anything.
const loadedModels = {}

function directionFor(text) {
  return TAMIL_SCRIPT.test(text) ? 'taEn' : 'enTa'
}

async function ensureModel(directionKey) {
  if (loadedModels[directionKey]) return loadedModels[directionKey]

  const { modelSrc, from, to } = DIRECTIONS[directionKey]
  process.stderr.write(`▸ Loading ${DIRECTIONS[directionKey].label} model (first run downloads it, then it's cached on disk)...\n`)

  const modelId = await loadModel({
    modelSrc,
    modelConfig: { engine: 'Bergamot', from, to },
    onProgress: (p) => {
      const line = `  ${p.percentage.toFixed(0)}%`
      process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`)
      if (p.percentage >= 100) process.stderr.write('\n')
    }
  })

  loadedModels[directionKey] = modelId
  return modelId
}

async function translateLine(text) {
  const directionKey = directionFor(text)
  const modelId = await ensureModel(directionKey)

  const result = translate({
    modelId,
    text,
    modelType: 'nmtcpp-translation',
    stream: false
  })

  return { text: await result.text, label: DIRECTIONS[directionKey].label }
}

async function cleanup() {
  for (const modelId of Object.values(loadedModels)) {
    await unloadModel({ modelId })
  }
}

async function runOnce(text) {
  try {
    const { text: translated, label } = await translateLine(text)
    console.log(`[${label}] ${text}`)
    console.log(`-> ${translated}`)
  } finally {
    await cleanup()
  }
}

async function runRepl() {
  console.log('Offline Tamil <-> English translator (QVAC SDK, on-device)')
  console.log('Type English or Tamil text and press Enter. Type ":quit" to exit.\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' })
  const showPrompt = () => { if (!rl.closed) rl.prompt() }
  showPrompt()

  // for-await processes one line at a time, so a translation in flight can't
  // race the next line the user (or a piped script) sends. A piped stdin can
  // hit EOF (closing rl) while the last line is still translating, so every
  // prompt call after that is guarded above.
  for await (const line of rl) {
    const text = line.trim()
    if (text === ':quit' || text === ':q') break
    if (text) {
      try {
        const { text: translated, label } = await translateLine(text)
        console.log(`[${label}] -> ${translated}\n`)
      } catch (error) {
        console.error('✖ translation failed:', error.message)
      }
    }
    showPrompt()
  }

  rl.close()
  await cleanup()
}

async function main() {
  const arg = process.argv.slice(2).join(' ').trim()
  if (arg) {
    await runOnce(arg)
  } else {
    await runRepl()
  }
}

main().catch((error) => {
  console.error('✖ Error:', error)
  process.exit(1)
})

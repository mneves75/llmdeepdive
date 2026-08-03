#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { CONTENT_ROOT, PUBLIC_ROOT, displayPath, finish, readLessons, walkFiles } from './content-utils.mjs'

const CONTENT_EXTENSIONS = new Set(['.md', '.mdx', '.json', '.yaml', '.yml'])
const ASSET_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp|mp3|mp4|ogg|wav|woff2?|glb|gltf|bin)(?:[?#].*)?$/iu

function references(source) {
  const found = new Set()
  const patterns = [
    /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu,
    /\b(?:src|poster)=["']([^"']+)["']/gu,
    /\burl\((?:["']?)([^)"']+)(?:["']?)\)/gu,
    /["']((?:\/|public\/)[^"']+\.(?:avif|gif|jpe?g|png|svg|webp|mp3|mp4|ogg|wav|woff2?|glb|gltf|bin)(?:[?#][^"']*)?)["']/giu,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const reference = match[1]
      if (reference && ASSET_EXTENSION.test(reference)) found.add(reference)
    }
  }
  return [...found]
}

try {
  // All content gates fail closed when the lesson corpus is missing or empty.
  readLessons()
  const files = walkFiles(CONTENT_ROOT, CONTENT_EXTENSIONS)
  const failures = []
  let checked = 0
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const reference of references(source)) {
      if (/^(?:https?:|data:|#)/iu.test(reference)) continue
      const clean = decodeURIComponent(reference.split(/[?#]/u)[0] ?? '')
        .replace(/^public\//u, '')
        .replace(/^\/+/u, '')
      const target = resolve(PUBLIC_ROOT, clean)
      checked += 1
      if (!target.startsWith(PUBLIC_ROOT + sep) || !existsSync(target)) {
        failures.push(displayPath(file) + ': asset "' + reference + '" does not exist under public/ (expected ' + displayPath(target) + ')')
      }
    }
  }
  finish('content:assets', failures, files.length + ' content files scanned; ' + checked + ' local asset reference(s) resolved')
} catch (error) {
  console.error('content:assets FAIL — ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}

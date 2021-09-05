#!/usr/bin/env node

import minimist from 'minimist'
import cliclopts from 'cliclopts'
import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import desm from 'desm'
import process from 'node:process'

import { SiteUp } from './index.js'

const __dirname = desm(import.meta.url)

async function getPkg () {
  const pkgPath = resolve(__dirname, './package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  return pkg
}

const clopts = cliclopts([
  {
    name: 'src',
    abbr: 's',
    help: 'path to source directory',
    default: 'src'
  },
  {
    name: 'dest',
    abbr: 'd',
    help: 'path to build destination directory',
    default: 'public'
  },
  {
    name: 'watch',
    abbr: 'w',
    help: 'build and watch the src folder for additional changes',
    Boolean: true
  },
  {
    name: 'help',
    abbr: 'h',
    help: 'show help',
    Boolean: true
  },
  {
    name: 'version',
    abbr: 'v',
    boolean: true,
    help: 'show version information'
  }
])

const argv = minimist(process.argv.slice(2), clopts.options())

async function run () {
  if (argv.version) {
    const pkg = await getPkg()
    console.log(pkg.version)
    process.exit(0)
  }

  if (argv.help) {
    const pkg = await getPkg()
    console.log(`siteUp (v${pkg.version})`)
    console.log('Usage: siteUp [options]\n')
    console.log('    Example: siteUp --src website --dest public\n')
    clopts.print()
    process.exit(0)
  }
  const cwd = process.cwd()
  const src = resolve(join(cwd, argv.src))
  const dest = resolve(join(cwd, argv.dest))

  // TODO validate input a little better

  const siteUp = new SiteUp(src, dest, cwd)

  process.once('SIGINT', quit)
  process.once('SIGTERM', quit)

  async function quit () {
    if (siteUp.watching) {
      const results = await siteUp.stopWatching()
      console.log(results)
      console.log('watching stopped')
    }
    console.log('quitting cleanly')
    process.exit(0)
  }

  if (!argv.watch) {
    const results = await siteUp.build()
    console.log(results)
    console.log('done')
  } else {
    const initialResults = await siteUp.watch()
    console.log(initialResults)
  }
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})

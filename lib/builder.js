import { mkdir } from 'fs/promises'
import { join } from 'path'
import AggregateError from 'aggregate-error-ponyfill'
import keyBy from 'lodash.keyby'

import { buildPages, pageBuilders } from './build-pages/index.js'
import { identifyPages } from './identify-pages.js'
import { buildStatic } from './build-static/index.js'
import { buildCss } from './build-css/index.js'
import { buildJs } from './build-js/index.js'

export function createBuilder (steps, pageBuilder) {
  async function builder (src, dest, opts = {}) {
    const siteData = await identifyPages(src, pageBuilders, opts)
    await ensureDest(src, dest, siteData)

    const reports = await Promise.all(
      steps.map(
        step => step(src, dest, siteData, opts)
      )
    )

    const outputMaps = {}

    for (const report of reports) {
      if (report.outputMap) {
        outputMaps[report.type] = report.outputMap
      }
    }

    // Add outputMaps to siteData
    siteData.outputMaps = outputMaps

    const pageBuildReport = await pageBuilder(src, dest, siteData, opts)

    const reportsAndSiteData = [siteData, pageBuildReport, ...reports]

    const errors = collectKeys('errors', reportsAndSiteData)
    const warnings = collectKeys('warnings', reportsAndSiteData)

    const results = {
      ...keyBy(reportsAndSiteData, result => result.type),
      warnings
    }

    if (errors.length > 0) {
      const buildError = new AggregateError(errors, 'Build finished but there were errors.')
      buildError.results = results
      throw buildError
    } else {
      return results
    }
  }

  return builder
}

/**
 * Build the site
 */
export const build = createBuilder([buildStatic, buildCss, buildJs], buildPages)

/**
 * Build the parts of the site that don't build themselves during watch
 */
export const watchBuild = createBuilder([buildCss, buildJs], buildPages)

/**
 * Create folders for each page
 */
async function ensureDest (src, dest, siteData) {
  await mkdir(dest, { recursive: true })

  for (const page of siteData.pages) {
    await mkdir(join(dest, page.path), { recursive: true })
  }
}

/**
 * Collect keys like errors and warnings and remove them from the result
 */
function collectKeys (key, arrayOfResults) {
  const collection = []

  for (const result of arrayOfResults) {
    const value = result[key]
    collection.push(value)
    delete result[key]
  }

  return collection.flat()
}

// filewatching brainstorming
//
// build everything
// start a cpx watcher
// start a esbuild watcher
// start a chokidar watcher
//   - if js, md, or html file changes, rebuild it
//   - if a a vars file changes, rebuild the page
//   - if a page css file change, rebuild all pages
//   - if a global or root layout changes, rebuild all pages
//   - if a page is deleted, unregister any js entry points
//   - if a page client is deleted, unregister
//   - TODO full register unregister lifecycle

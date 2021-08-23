import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import postcss from 'postcss'
import autoprefixer from 'autoprefixer'
import postcssImport from 'postcss-import'
import postcssUrl from 'postcss-url'

/**
 * Build all of the CSS for every page and global CSS
 * @param  {[type]} src      [description]
 * @param  {[type]} dest     [description]
 * @param  {[type]} siteData [description]
 * @return {[type]}          [description]
 */
export async function buildCss (src, dest, siteData) {
  const styles = [siteData.globalStyle]

  for (const page of siteData.pages) {
    if (page.pageStyle) styles.push(page.pageStyle)
  }

  const results = []
  for (const style of styles) {
    const css = await readFile(style.filepath)
    const targetPath = join(dest, style.relname)
    const result = await postcss([
      postcssImport,
      postcssUrl({
        url: 'copy',
        useHash: true,
        assetsPath: 'assets'
      }),
      autoprefixer
    ]).process(css, { from: style.relname, to: targetPath })
    await writeFile(targetPath, result.css)
    if (result.map) await writeFile(targetPath + '.map', result.map.toString())
    results.push(result)
  }
  return results
}
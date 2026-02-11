/**
 * QA validation script for benchmark poster SVGs.
 * Run: bun scripts/qa-posters.ts [./benchmarks]
 *
 * Validates SVG structure, star counts, and metadata.
 */
import fs from 'fs/promises'
import path from 'path'

const BENCHMARKS_DIR = process.argv[2] || path.join(import.meta.dir, '..', 'benchmarks')

interface TestResult {
  name: string
  passed: boolean
  checks: Array<{ label: string; passed: boolean; detail: string }>
}

async function main() {
  const manifestPath = path.join(BENCHMARKS_DIR, 'manifest.json')

  let manifest: { entries: Array<any> }
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
  } catch {
    console.error(`Could not read ${manifestPath}. Run benchmark-posters.ts first.`)
    process.exit(1)
  }

  const results: TestResult[] = []

  console.log(`\nQA Validation: ${manifest.entries.length} posters\n`)

  for (const entry of manifest.entries) {
    const svgPath = path.join(BENCHMARKS_DIR, entry.svgFile)
    const checks: TestResult['checks'] = []

    // Check SVG exists and has minimum size
    let svgContent = ''
    try {
      svgContent = await fs.readFile(svgPath, 'utf-8')
      const stat = await fs.stat(svgPath)
      const sizeOk = stat.size > 10_000
      checks.push({
        label: 'SVG file size > 10KB',
        passed: sizeOk,
        detail: `${(stat.size / 1024).toFixed(1)}KB`,
      })
    } catch {
      checks.push({ label: 'SVG file exists', passed: false, detail: 'File not found' })
      results.push({ name: entry.name, passed: false, checks })
      continue
    }

    // Check star count (nighttime should have >50 stars)
    const starCountOk = entry.starCount > 50
    checks.push({
      label: 'Star count > 50 (nighttime)',
      passed: starCountOk,
      detail: `${entry.starCount} stars`,
    })

    // Check at least 1 planet visible
    const planetOk = entry.planetsVisible.length >= 1
    checks.push({
      label: 'At least 1 planet visible',
      passed: planetOk,
      detail: entry.planetsVisible.join(', ') || 'none',
    })

    // Check moon phase is valid (0-360)
    const phaseOk = entry.moonPhase >= 0 && entry.moonPhase <= 360
    checks.push({
      label: 'Moon phase valid (0-360°)',
      passed: phaseOk,
      detail: `${entry.moonPhase}°`,
    })

    // SVG has <circle> elements (stars)
    const circleCount = (svgContent.match(/<circle /g) || []).length
    const hasCircles = circleCount > 10
    checks.push({
      label: 'SVG has <circle> elements',
      passed: hasCircles,
      detail: `${circleCount} circles`,
    })

    // SVG has <line> or <path> elements (constellation lines / ecliptic)
    const lineCount = (svgContent.match(/<line /g) || []).length
    const pathCount = (svgContent.match(/<path /g) || []).length
    const hasLines = lineCount + pathCount > 0
    checks.push({
      label: 'SVG has <line> or <path> elements',
      passed: hasLines,
      detail: `${lineCount} lines, ${pathCount} paths`,
    })

    // SVG has <text> elements (labels)
    const textCount = (svgContent.match(/<text /g) || []).length
    const hasText = textCount > 3
    checks.push({
      label: 'SVG has <text> elements (labels)',
      passed: hasText,
      detail: `${textCount} text elements`,
    })

    const allPassed = checks.every(c => c.passed)
    results.push({ name: entry.name, passed: allPassed, checks })
  }

  // Print results
  for (const result of results) {
    const status = result.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
    console.log(`  [${status}] ${result.name}`)
    for (const check of result.checks) {
      const icon = check.passed ? '  \x1b[32m✓\x1b[0m' : '  \x1b[31m✗\x1b[0m'
      console.log(`${icon} ${check.label}: ${check.detail}`)
    }
    console.log()
  }

  const passCount = results.filter(r => r.passed).length
  const failCount = results.filter(r => !r.passed).length

  console.log(`\nSummary: ${passCount} passed, ${failCount} failed out of ${results.length}\n`)

  if (failCount > 0) process.exit(1)
}

main().catch(console.error)

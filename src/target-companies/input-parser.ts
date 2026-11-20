/**
 * Unified input parser for Target Companies accepting both .csv and .md files.
 */

import { parseTargetCompanyCsv, type CsvPreview } from './csv'
import { parseTargetCompanyMarkdown } from './markdown'

export function isMarkdownFile(fileName?: string | null): boolean {
  if (!fileName) return false
  const lower = fileName.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown')
}

export function isCsvFile(fileName?: string | null): boolean {
  if (!fileName) return false
  const lower = fileName.toLowerCase()
  return lower.endsWith('.csv')
}

export function parseTargetCompanyInput(text: string, fileName?: string | null): CsvPreview {
  if (isMarkdownFile(fileName)) {
    return parseTargetCompanyMarkdown(text)
  }

  // If not explicitly marked as markdown by extension, check if content has obvious Markdown structure
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (trimmed.startsWith('---') || /^#{1,3}\s+/m.test(trimmed) || (/^\|.*\|$/m.test(trimmed) && trimmed.includes('---'))) {
    // Might be Markdown
    const mdResult = parseTargetCompanyMarkdown(text)
    if (mdResult.rowCount > 0 && mdResult.errors.length === 0) {
      return mdResult
    }
  }

  return parseTargetCompanyCsv(text)
}

/**
 * Dependency-free Markdown parser and extractor for target company profiles.
 *
 * Accepts .md files containing:
 * 1. Markdown tables (multi-column company lists)
 * 2. Executive Key-Value tables (2-column Attribute | Details tables, such as TVB Dossiers)
 * 3. YAML frontmatter profiles (Obsidian / Vault COMP-*.md format)
 * 4. Sectional / Heading & bullet-point company dossiers (# Company Name with key-value bullets)
 *
 * Emits a validated CsvPreview compatible with the target-companies data layer
 * and matching engine.
 */

import {
  TARGET_COMPANY_ROW_MAX,
  TARGET_COMPANY_ROW_MIN,
  type CsvPreview,
} from './csv'

export const TARGET_COMPANY_CANONICAL_HEADERS = [
  'Company Name',
  'Location / Country',
  'Sector / Industry',
  'Website / URL',
  'Capabilities / Tags',
  'Description / Profile',
] as const

export interface ExtractedTargetCompany {
  name: string
  country: string
  sector: string
  website: string
  capabilities: string
  description: string
}

/**
 * Strips markdown markup (bold, italics, code spans, links) to plain text.
 */
export function stripMarkdownFormatting(raw: string): string {
  if (!raw) return ''
  let text = raw.trim()

  // Replace <br/>, <br>, <br /> with comma or separator
  text = text.replace(/<br\s*\/?>/gi, ', ')

  // Strip markdown links: [text](url) -> if text is url or empty, use url, else if text is descriptive, keep text
  text = text.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_match, label, url) => {
    const l = (label || '').trim()
    const u = (url || '').trim()
    if (!l) return u
    if (/^https?:\/\//i.test(l)) return l
    if (/^https?:\/\//i.test(u) && !l.includes(' ')) return u
    return l
  })

  // Strip bold and italics
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/___([^_]+)___/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')

  // Strip inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1')

  // Strip bullet symbols (•, -, *, +) at start or following commas/breaks
  text = text.replace(/(?:^|,\s*)\s*[•\-\*\+]\s+/g, (match) => (match.includes(',') ? ', ' : ''))
  text = text.replace(/^[•\-\*\+]\s+/, '')

  // Clean double quotes if wrapped
  text = text.replace(/^"|"$/g, '').replace(/^'|'$/g, '')

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

/**
 * Extracts URL from a markdown link or raw text if present.
 */
export function extractUrlFromMarkdown(raw: string): string {
  if (!raw) return ''
  const linkMatch = raw.match(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/i)
  if (linkMatch?.[2]) return linkMatch[2].trim()

  const rawUrlMatch = raw.match(/https?:\/\/[^\s),">]+/i)
  if (rawUrlMatch?.[0]) return rawUrlMatch[0].trim()

  return stripMarkdownFormatting(raw)
}

/**
 * Parses YAML frontmatter if present at the top of a Markdown document.
 */
function parseYamlFrontmatter(text: string): { data: Record<string, string | string[]>; body: string } | null {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed.startsWith('---')) return null

  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null

  const yamlContent = match[1]
  const body = match[2] ?? ''
  const data: Record<string, string | string[]> = {}

  const lines = yamlContent.split(/\r?\n/)
  let currentKey: string | null = null
  let currentList: string[] | null = null

  for (const line of lines) {
    const listMatch = line.match(/^\s*-\s+(.*)$/)
    if (listMatch && currentKey && currentList) {
      const itemVal = stripMarkdownFormatting(listMatch[1])
      if (itemVal) currentList.push(itemVal)
      continue
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/)
    if (kvMatch) {
      if (currentKey && currentList && currentList.length > 0) {
        data[currentKey] = currentList
      }
      currentKey = kvMatch[1].toLowerCase().replace(/[-_]+/g, '_').trim()
      const val = kvMatch[2].trim()
      if (val === '' || val === '[]') {
        currentList = []
        data[currentKey] = currentList
      } else {
        currentList = null
        data[currentKey] = stripMarkdownFormatting(val)
      }
    }
  }

  if (currentKey && currentList && currentList.length > 0) {
    data[currentKey] = currentList
  }

  return { data, body }
}

/**
 * Extracts a company profile from frontmatter data.
 */
function companyFromFrontmatter(
  data: Record<string, string | string[]>,
  body: string,
): ExtractedTargetCompany | null {
  const getVal = (...keys: string[]): string => {
    for (const key of keys) {
      const v = data[key]
      if (Array.isArray(v)) {
        if (v.length > 0) return v.join(', ')
      } else if (typeof v === 'string' && v.trim() !== '') {
        return v.trim()
      }
    }
    return ''
  }

  const rawName = getVal('company_name', 'company', 'name', 'legal_name', 'title')
  if (!rawName) return null

  const cleanName = rawName
    .replace(/^DEMO\s*[—–-]\s*/i, '')
    .replace(/^companies\//i, '')
    .trim()

  const country = getVal('country', 'operating_regions', 'operating_countries', 'location', 'hq', 'geography')
  const sector = getVal('industry', 'sector', 'domain', 'category')
  const website = getVal('website', 'url', 'domain')
  const capabilities = getVal('technology_focus', 'capabilities', 'project_focus', 'tags', 'skills', 'keywords')
  let description = getVal('business_description', 'description', 'overview', 'summary', 'notes')

  // If description is missing, extract narrative text from the markdown body
  if (!description && body.trim()) {
    const overviewMatch = body.match(/##\s*Overview\s*\r?\n([\s\S]*?)(?=\r?\n##|$)/i)
    if (overviewMatch?.[1]) {
      description = stripMarkdownFormatting(overviewMatch[1])
    } else {
      // First clean paragraph
      const paras = body.split(/\r?\n\r?\n/).map(stripMarkdownFormatting).filter((p) => p.length > 20 && !p.startsWith('#'))
      if (paras[0]) description = paras[0]
    }
  }

  return {
    name: cleanName,
    country,
    sector,
    website,
    capabilities,
    description,
  }
}

/**
 * Detects and parses all markdown tables in a document.
 */
interface ParsedMarkdownTable {
  headers: string[]
  rows: string[][]
}

function parseMarkdownTables(text: string): ParsedMarkdownTable[] {
  const tables: ParsedMarkdownTable[] = []
  const lines = text.split(/\r?\n/)
  let inTable = false
  let currentHeaders: string[] = []
  let currentRows: string[][] = []

  const isTableRow = (line: string): boolean => {
    const trimmed = line.trim()
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2
  }

  const isSeparatorRow = (cells: string[]): boolean => {
    return cells.every((c) => /^:?-+:?$/.test(c.trim()))
  }

  const splitCells = (line: string): string[] => {
    const trimmed = line.trim()
    // Remove outer pipes
    const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '')
    return inner.split('|').map((c) => c.trim())
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isTableRow(line)) {
      const cells = splitCells(line)
      if (!inTable) {
        // Look ahead for separator
        if (i + 1 < lines.length && isTableRow(lines[i + 1])) {
          const nextCells = splitCells(lines[i + 1])
          if (isSeparatorRow(nextCells)) {
            inTable = true
            currentHeaders = cells
            currentRows = []
            i++ // skip separator row
            continue
          }
        }
      } else {
        if (!isSeparatorRow(cells)) {
          currentRows.push(cells)
        }
      }
    } else {
      if (inTable) {
        if (currentHeaders.length > 0 && currentRows.length > 0) {
          tables.push({ headers: currentHeaders, rows: currentRows })
        }
        inTable = false
        currentHeaders = []
        currentRows = []
      }
    }
  }

  if (inTable && currentHeaders.length > 0 && currentRows.length > 0) {
    tables.push({ headers: currentHeaders, rows: currentRows })
  }

  return tables
}

/**
 * Extracts company profile from a 2-column Executive Dossier Attribute table.
 * (e.g. | Attribute | Details |)
 */
function extractFromExecutiveDossierTable(
  table: ParsedMarkdownTable,
  fullText: string,
): ExtractedTargetCompany | null {
  if (table.headers.length !== 2) return null

  const h0 = table.headers[0].toLowerCase()
  const h1 = table.headers[1].toLowerCase()
  const isAttrTable =
    (h0.includes('attribute') || h0.includes('field') || h0.includes('property') || h0.includes('key')) &&
    (h1.includes('detail') || h1.includes('value') || h1.includes('info'))

  // Also check if first column values look like attributes
  const firstColKeys = table.rows.map((r) => stripMarkdownFormatting(r[0] ?? '').toLowerCase())
  const hasKeyIndicators = firstColKeys.some((k) =>
    k.includes('company') || k.includes('name') || k.includes('jurisdiction') || k.includes('sector') || k.includes('website'),
  )

  if (!isAttrTable && !hasKeyIndicators) return null

  const kv = new Map<string, string>()
  for (const row of table.rows) {
    if (row.length < 2) continue
    const key = stripMarkdownFormatting(row[0] ?? '').toLowerCase()
    const val = row[1] ?? ''
    kv.set(key, val)
  }

  const findVal = (...patterns: RegExp[]): string => {
    for (const pat of patterns) {
      for (const [k, v] of kv) {
        if (pat.test(k)) return v
      }
    }
    return ''
  }

  let rawName = findVal(/company.*name|^name$|entity.*name|client/i)
  let cleanName = stripMarkdownFormatting(rawName)

  // If company name not in table, check document title heading
  if (!cleanName) {
    const titleMatch = fullText.match(/^#\s*([^—–\r\n]+?)(?:\s*[—–-]\s*Opportunity Intelligence Dossier|\r?\n|$)/im)
    if (titleMatch?.[1]) {
      cleanName = stripMarkdownFormatting(titleMatch[1])
    }
  }

  if (!cleanName) return null

  const country = stripMarkdownFormatting(findVal(/jurisdiction|country|location|hq|region/i))
  const sector = stripMarkdownFormatting(findVal(/sector|industry|domain/i))
  const website = extractUrlFromMarkdown(findVal(/website|url|portal|domain/i))

  // Verified capabilities: formatted with bullet points or breaks
  const rawCaps = findVal(/capabilities|competenc|tags|focus|services/i)
  const capabilities = rawCaps
    .split(/<br\s*\/?>|[\r\n•]+/)
    .map(stripMarkdownFormatting)
    .filter(Boolean)
    .join(', ')

  // Description from text following the table
  let description = ''
  const descMatch = fullText.match(/###?\s*(?:Company\s*)?Description\s*\r?\n([\s\S]*?)(?=\r?\n##|$)/i)
  if (descMatch?.[1]) {
    description = stripMarkdownFormatting(descMatch[1])
  }

  return {
    name: cleanName,
    country,
    sector,
    website,
    capabilities,
    description,
  }
}

/**
 * Extracts company profiles from a multi-column company list table.
 */
function extractFromMultiColumnTable(table: ParsedMarkdownTable): ExtractedTargetCompany[] {
  if (table.headers.length < 2) return []

  const cleanHeaders = table.headers.map((h) => stripMarkdownFormatting(h).toLowerCase())
  const nameIndex = cleanHeaders.findIndex((h) => /company.*name|^name$|legal name|client/i.test(h))
  if (nameIndex < 0) return []

  const countryIndex = cleanHeaders.findIndex((h) => /country|location|hq|region|geography|jurisdiction/i.test(h))
  const sectorIndex = cleanHeaders.findIndex((h) => /sector|industry|domain|vertical/i.test(h))
  const urlIndex = cleanHeaders.findIndex((h) => /website|url|domain/i.test(h))
  const capsIndex = cleanHeaders.findIndex((h) => /capabilities|tags|keywords|focus|competenc/i.test(h))
  const descIndex = cleanHeaders.findIndex((h) => /description|overview|profile|summary|notes/i.test(h))

  const companies: ExtractedTargetCompany[] = []

  for (const row of table.rows) {
    const rawName = row[nameIndex] ?? ''
    const cleanName = stripMarkdownFormatting(rawName).replace(/^companies\//i, '').trim()
    if (!cleanName) continue

    const country = countryIndex >= 0 ? stripMarkdownFormatting(row[countryIndex] ?? '') : ''
    const sector = sectorIndex >= 0 ? stripMarkdownFormatting(row[sectorIndex] ?? '') : ''
    const website = urlIndex >= 0 ? extractUrlFromMarkdown(row[urlIndex] ?? '') : ''
    const capabilities = capsIndex >= 0 ? stripMarkdownFormatting(row[capsIndex] ?? '') : ''
    const description = descIndex >= 0 ? stripMarkdownFormatting(row[descIndex] ?? '') : ''

    companies.push({
      name: cleanName,
      country,
      sector,
      website,
      capabilities,
      description,
    })
  }

  return companies
}

/**
 * Extracts company profiles from section headings and bullet points.
 * e.g.:
 * # Company Name
 * - **Location**: India
 * - **Sector**: Fintech
 * - **Website**: https://...
 */
function extractFromHeadingsAndBullets(text: string): ExtractedTargetCompany[] {
  // Split on H1 or H2 headings
  const sections = text.split(/(?=^#{1,2}\s+[^\r\n]+)/m).filter((s) => s.trim().startsWith('#'))
  if (sections.length === 0) return []

  const companies: ExtractedTargetCompany[] = []

  for (const section of sections) {
    const lines = section.split(/\r?\n/)
    const headingLine = lines[0] ?? ''
    const headingTitle = headingLine.replace(/^#{1,2}\s+/, '').trim()

    // Skip generic document title headings
    if (/^(target\s+(?:companies|portfolio|list)|company\s+profiles|overview|introduction|table\s+of\s+contents|leads|summary|portfolio)/i.test(headingTitle)) {
      continue
    }

    const cleanName = stripMarkdownFormatting(headingTitle)
      .replace(/^DEMO\s*[—–-]\s*/i, '')
      .replace(/^Company\s*:\s*/i, '')
      .replace(/\s*[—–-]\s*Opportunity Intelligence Dossier.*$/i, '')
      .trim()

    if (!cleanName) continue

    let country = ''
    let sector = ''
    let website = ''
    let capabilities = ''
    const descParts: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const bulletMatch = line.match(/^[•\-\*\+]\s*(?:\*\*([^*:]+)\*\*|([^*:]+))\s*:\s*(.*)$/)
      if (bulletMatch) {
        const key = (bulletMatch[1] || bulletMatch[2] || '').trim().toLowerCase()
        const val = (bulletMatch[3] || '').trim()

        if (/country|location|hq|region|geography|jurisdiction/i.test(key)) {
          country = stripMarkdownFormatting(val)
        } else if (/sector|industry|domain|vertical/i.test(key)) {
          sector = stripMarkdownFormatting(val)
        } else if (/website|url|domain/i.test(key)) {
          website = extractUrlFromMarkdown(val)
        } else if (/capabilities|tags|keywords|focus|competenc|services/i.test(key)) {
          capabilities = stripMarkdownFormatting(val)
        } else if (/description|overview|profile|summary|notes/i.test(key)) {
          descParts.push(stripMarkdownFormatting(val))
        }
        continue
      }

      // Check plain key-value lines without bullets (e.g. Website: https://...)
      const kvMatch = line.match(/^([a-zA-Z\s]{3,25})\s*:\s*(.*)$/)
      if (kvMatch && !line.startsWith('#')) {
        const key = kvMatch[1].trim().toLowerCase()
        const val = kvMatch[2].trim()
        if (/^website|url$/i.test(key)) {
          website = extractUrlFromMarkdown(val)
          continue
        } else if (/^country|location|hq$/i.test(key)) {
          country = stripMarkdownFormatting(val)
          continue
        } else if (/^sector|industry$/i.test(key)) {
          sector = stripMarkdownFormatting(val)
          continue
        }
      }

      // Narrative text
      if (!line.startsWith('#') && !line.startsWith('|') && line.length > 15) {
        descParts.push(stripMarkdownFormatting(line))
      }
    }

    const hasAttributes = Boolean(country || sector || website || capabilities)
    if (cleanName && (hasAttributes || sections.length === 1)) {
      companies.push({
        name: cleanName,
        country,
        sector,
        website,
        capabilities,
        description: descParts.join(' ').trim(),
      })
    }
  }

  return companies
}

/**
 * Main parser entry point: parses Markdown text into a CsvPreview shape.
 */
export function parseTargetCompanyMarkdown(text: string): CsvPreview {
  const errors: string[] = []

  if (text.trim() === '') {
    return {
      headers: [...TARGET_COMPANY_CANONICAL_HEADERS],
      rows: [],
      rowCount: 0,
      errors: ['The Markdown file is empty.'],
    }
  }

  let extracted: ExtractedTargetCompany[] = []

  // 1. Try YAML frontmatter (Obsidian / Vault COMP-*.md)
  const frontmatter = parseYamlFrontmatter(text)
  if (frontmatter) {
    const single = companyFromFrontmatter(frontmatter.data, frontmatter.body)
    if (single) {
      extracted.push(single)
    }
  }

  // 2. Try Markdown Tables if frontmatter didn't find a company
  if (extracted.length === 0) {
    const tables = parseMarkdownTables(text)
    for (const table of tables) {
      // 2a. Executive 2-column Attribute table (Dossier format)
      const dossierCompany = extractFromExecutiveDossierTable(table, text)
      if (dossierCompany) {
        extracted.push(dossierCompany)
        break // Dossier represents one company
      }

      // 2b. Multi-column company table
      const multi = extractFromMultiColumnTable(table)
      if (multi.length > 0) {
        extracted.push(...multi)
      }
    }
  }

  // 3. Try Sectional Headings & Bullets if still empty
  if (extracted.length === 0) {
    extracted = extractFromHeadingsAndBullets(text)
  }

  // 4. Validate findings
  if (extracted.length === 0) {
    errors.push(
      'No target company profiles could be extracted from the Markdown file. Ensure the file contains company details in a Markdown table, YAML frontmatter, or structured headings (# Company Name with - **Location**: ... bullets).',
    )
    return {
      headers: [...TARGET_COMPANY_CANONICAL_HEADERS],
      rows: [],
      rowCount: 0,
      errors,
    }
  }

  // Deduplicate identical companies by normalized name
  const seenNames = new Map<string, number>()
  extracted.forEach((c, idx) => {
    const key = c.name.toLowerCase().trim()
    if (seenNames.has(key)) {
      errors.push(
        `Possible duplicate company "${c.name}" detected (entries ${seenNames.get(key)} and ${idx + 1}).`,
      )
    } else {
      seenNames.set(key, idx + 1)
    }
  })

  // Check row count boundaries
  if (extracted.length < TARGET_COMPANY_ROW_MIN || extracted.length > TARGET_COMPANY_ROW_MAX) {
    errors.push(
      `Expected ${TARGET_COMPANY_ROW_MIN}–${TARGET_COMPANY_ROW_MAX} company records, but found ${extracted.length}.`,
    )
  }

  // Convert to rows matching canonical headers
  const rows: string[][] = extracted.map((c) => [
    c.name,
    c.country,
    c.sector,
    c.website,
    c.capabilities,
    c.description,
  ])

  return {
    headers: [...TARGET_COMPANY_CANONICAL_HEADERS],
    rows,
    rowCount: rows.length,
    errors,
  }
}

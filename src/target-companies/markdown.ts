/**
 * Dependency-free Markdown parser and extractor for target company profiles.
 *
 * Accepts .md files containing:
 * 1. Markdown tables (multi-column company lists, with or without outer pipes)
 * 2. Executive Key-Value tables (2-column Attribute | Details tables, such as TVB Dossiers)
 * 3. YAML frontmatter profiles (Obsidian / Vault COMP-*.md format)
 * 4. Sectional / Heading & bullet-point company dossiers (# Company Name with key-value bullets)
 * 5. Plain key-value lines (**Company Name:** ..., Website: ...) without headings
 * 6. Freeform company briefs & single-company intelligence dossiers
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

  // Clean residual unclosed asterisks, underscores, or backticks at string boundaries
  text = text.replace(/^[*_`~]+|[*_`~]+$/g, '').trim()

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

  const match = trimmed.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)([\s\S]*)$/)
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
 * Detects and parses all markdown tables in a document (with or without outer pipes).
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
    if (!trimmed.includes('|')) return false
    const cells = splitCells(line)
    return cells.length >= 2
  }

  const isSeparatorRow = (cells: string[]): boolean => {
    if (cells.length < 2) return false
    return cells.every((c) => /^:?-{1,}:?$/.test(c.trim()))
  }

  const splitCells = (line: string): string[] => {
    const trimmed = line.trim()
    const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '')
    return inner.split('|').map((c) => c.trim())
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isTableRow(line)) {
      const cells = splitCells(line)
      if (!inTable) {
        // Look ahead for separator row
        if (i + 1 < lines.length && isTableRow(lines[i + 1])) {
          const nextCells = splitCells(lines[i + 1])
          if (isSeparatorRow(nextCells)) {
            inTable = true
            currentHeaders = cells
            currentRows = []
            i++ // skip separator
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
    (h1.includes('detail') || h1.includes('value') || h1.includes('info') || h1.includes('company'))

  const firstColKeys = table.rows.map((r) => stripMarkdownFormatting(r[0] ?? '').toLowerCase())
  const hasKeyIndicators = firstColKeys.some((k) =>
    k.includes('company') || k.includes('name') || k.includes('jurisdiction') || k.includes('sector') || k.includes('website') || k.includes('entity'),
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

  let rawName = findVal(/company.*name|^name$|entity.*name|client|target/i)
  let cleanName = stripMarkdownFormatting(rawName)

  // If company name not in table, check document title heading
  if (!cleanName) {
    const titleMatch = fullText.match(/^#{1,3}\s*([^—–\r\n]+?)(?:\s*[—–-]\s*Opportunity Intelligence Dossier|\r?\n|$)/im)
    if (titleMatch?.[1]) {
      const candidate = stripMarkdownFormatting(titleMatch[1])
      if (!/^(target|company|companies|portfolio|overview|lead)/i.test(candidate)) {
        cleanName = candidate
      }
    }
  }

  if (!cleanName) return null

  const country = stripMarkdownFormatting(findVal(/jurisdiction|country|location|hq|region|geography/i))
  const sector = stripMarkdownFormatting(findVal(/sector|industry|domain|vertical/i))
  const website = extractUrlFromMarkdown(findVal(/website|url|portal|domain|link/i))

  // Verified capabilities: formatted with bullet points, breaks, or commas
  let capabilities = ''
  const rawCaps = findVal(/capabilities|competenc|tags|focus|services|products/i)
  if (rawCaps) {
    capabilities = rawCaps
      .split(/<br\s*\/?>|[\r\n•]+/)
      .map(stripMarkdownFormatting)
      .filter(Boolean)
      .join(', ')
  }

  // Also scan for capabilities in ### Core Capabilities & Verified Services section
  if (!capabilities) {
    const capsSectionMatch = fullText.match(/###\s*(?:Core\s*)?Capabilities[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n###?|---|$)/i)
    if (capsSectionMatch?.[1]) {
      capabilities = capsSectionMatch[1]
        .split(/\r?\n/)
        .map((l) => stripMarkdownFormatting(l.replace(/^[•\-\*\+]\s*/, '')))
        .filter((l) => l.length > 2)
        .join(', ')
    }
  }

  // Description from text following the table
  let description = ''
  const descMatch = fullText.match(/###?\s*(?:Published\s*Service\s*Scope\s*&?\s*Profile\s*Description|Company\s*Description|Description|Overview)\s*\r?\n([\s\S]*?)(?=\r?\n##|---|(?:\r?\n\r?\n\r?\n)|$)/i)
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

  // Broad name regex matching 'Company', 'Company Name', 'Name', 'Organization', 'Entity', 'Business', 'Firm', 'Client', 'Target'
  const nameIndex = cleanHeaders.findIndex((h) =>
    /^(?:company|org|organization|entity|business|firm|vendor|client|target)(?:\s*(?:name)?)?$|^name$/i.test(h) ||
    /company.*name|legal.*name/i.test(h),
  )
  if (nameIndex < 0) return []

  const countryIndex = cleanHeaders.findIndex((h) =>
    /country|location|hq|region|geography|jurisdiction|address|city|state/i.test(h),
  )
  const sectorIndex = cleanHeaders.findIndex((h) =>
    /sector|industry|domain|vertical|category|market/i.test(h),
  )
  const urlIndex = cleanHeaders.findIndex((h) =>
    /website|url|domain|link|site|web|portal/i.test(h),
  )
  const capsIndex = cleanHeaders.findIndex((h) =>
    /capabilities|tags|keywords|focus|competenc|services|products|solutions|skills|technolog/i.test(h),
  )
  const descIndex = cleanHeaders.findIndex((h) =>
    /description|overview|profile|summary|notes|about|details|scope/i.test(h),
  )

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
 * Extracts company profiles from headings, bullet points, and key-value lines.
 */
function extractFromHeadingsAndKeyValues(text: string): ExtractedTargetCompany[] {
  // Check if text has sections marked by H1, H2, H3 or horizontal rules
  const hasHeadings = /^#{1,3}\s+[^\r\n]+/m.test(text)
  const rawSections = hasHeadings
    ? text.split(/(?=^#{1,3}\s+[^\r\n]+)/m).filter((s) => s.trim().length > 0)
    : text.split(/(?=^---\s*$(?!\r?\n---))/m).filter((s) => s.trim().length > 0)

  const sections = rawSections.length > 0 ? rawSections : [text]
  const companies: ExtractedTargetCompany[] = []

  for (const section of sections) {
    const lines = section.split(/\r?\n/)
    const firstLine = lines[0]?.trim() ?? ''
    let sectionHeading = ''
    if (/^#{1,3}\s+/.test(firstLine)) {
      sectionHeading = firstLine.replace(/^#{1,3}\s+/, '').trim()
    }

    // Skip generic document title headings
    if (/^(target\s+(?:companies|portfolio|list)|company\s+profiles|overview|introduction|table\s+of\s+contents|leads|summary|portfolio)/i.test(sectionHeading)) {
      continue
    }

    let detectedName = ''
    if (sectionHeading) {
      detectedName = stripMarkdownFormatting(sectionHeading)
        .replace(/^DEMO\s*[—–-]\s*/i, '')
        .replace(/^Company\s*:\s*/i, '')
        .replace(/\s*[—–-]\s*Opportunity Intelligence Dossier.*$/i, '')
        .trim()
    }

    let country = ''
    let sector = ''
    let website = ''
    let capabilities = ''
    const descParts: string[] = []

    for (let i = (sectionHeading ? 1 : 0); i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Look for key-value by colon delimiter (e.g. **Company Name:** ..., - Location: ..., HQ: ...)
      const rawLine = line.replace(/^[•\-\*\+]\s*/, '').trim()
      const colonIdx = rawLine.indexOf(':')
      if (colonIdx > 0 && colonIdx < 50) {
        const rawKey = rawLine.slice(0, colonIdx)
        const rawVal = rawLine.slice(colonIdx + 1)
        const key = rawKey.replace(/[*_~`#]/g, '').trim().toLowerCase()
        const cleanRawVal = rawVal.replace(/^[*_~`\s]+|[*_~`\s]+$/g, '').trim()
        const val = stripMarkdownFormatting(cleanRawVal)

        if (/^(?:company\s*name|company|client|organization|entity|name)$/i.test(key)) {
          detectedName = val
          continue
        } else if (/country|location|hq|headquarter|region|geography|jurisdiction|address|city|state/i.test(key)) {
          country = val
          continue
        } else if (/sector|industry|domain|vertical|category|market/i.test(key)) {
          sector = val
          continue
        } else if (/website|url|domain|portal|link|site|web/i.test(key)) {
          website = extractUrlFromMarkdown(val)
          continue
        } else if (/capabilities|tags|keywords|focus|competenc|services|products|skills/i.test(key)) {
          capabilities = val
          continue
        } else if (/description|overview|profile|summary|notes|about/i.test(key)) {
          descParts.push(val)
          continue
        }
      }

      // Check sub-bullet capability lines
      if (/^[•\-\*\+]\s+/.test(line)) {
        const bulletText = stripMarkdownFormatting(line)
        if (bulletText.length > 3 && bulletText.length < 100) {
          if (!capabilities) capabilities = bulletText
          else capabilities += `, ${bulletText}`
          continue
        }
      }

      // Narrative text
      if (!line.startsWith('#') && !line.startsWith('|') && line.length > 15) {
        descParts.push(stripMarkdownFormatting(line))
      }
    }

    const hasAttributes = Boolean(country || sector || website || capabilities)
    if (detectedName && (hasAttributes || sections.length === 1)) {
      companies.push({
        name: detectedName,
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
 * Freeform single-company fallback for plain text or narrative markdown notes.
 */
function fallbackSingleCompanyDocument(text: string): ExtractedTargetCompany | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // 1. Look for a heading or first line containing the company name
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  let name = ''
  const firstLine = lines[0]
  if (/^#{1,3}\s+/.test(firstLine)) {
    name = stripMarkdownFormatting(firstLine.replace(/^#{1,3}\s+/, ''))
      .replace(/\s*[—–-]\s*Opportunity Intelligence Dossier.*$/i, '')
      .replace(/^DEMO\s*[—–-]\s*/i, '')
      .trim()
  } else if (!firstLine.includes(':') && firstLine.length < 60) {
    name = stripMarkdownFormatting(firstLine)
  }

  // 2. Scan for website URL
  const website = extractUrlFromMarkdown(trimmed)

  // 3. Scan for common locations
  let country = ''
  const locationMatch = trimmed.match(/(?:headquarters|hq|location|based in|offices in|operating in)\s*[:—–-]?\s*([A-Za-z\s,]+?)(?:\.|\r?\n|$)/i)
  if (locationMatch?.[1]) {
    country = stripMarkdownFormatting(locationMatch[1]).slice(0, 80)
  }

  // 4. Scan for sector
  let sector = ''
  const sectorMatch = trimmed.match(/(?:sector|industry|domain|vertical|focus)\s*[:—–-]?\s*([A-Za-z\s,&]+?)(?:\.|\r?\n|$)/i)
  if (sectorMatch?.[1]) {
    sector = stripMarkdownFormatting(sectorMatch[1]).slice(0, 80)
  }

  // If we have at least a name and some data
  if (name && (website || country || sector || lines.length > 1)) {
    const paras = trimmed.split(/\r?\n\r?\n/).map(stripMarkdownFormatting).filter((p) => p.length > 20 && !p.startsWith('#'))
    return {
      name,
      country,
      sector,
      website,
      capabilities: '',
      description: paras.slice(0, 2).join(' '),
    }
  }

  return null
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

  // 3. Try Sectional Headings & Key-Value bullets
  if (extracted.length === 0) {
    extracted = extractFromHeadingsAndKeyValues(text)
  }

  // 4. Try Freeform single-company document fallback
  if (extracted.length === 0) {
    const fallback = fallbackSingleCompanyDocument(text)
    if (fallback) {
      extracted.push(fallback)
    }
  }

  // 5. Validate findings
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

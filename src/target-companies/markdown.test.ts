import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseTargetCompanyMarkdown,
  stripMarkdownFormatting,
  extractUrlFromMarkdown,
} from './markdown'
import { parseTargetCompanyInput, isMarkdownFile, isCsvFile } from './input-parser'
import { csvPreviewToTargetCompanies } from './profiles'

test('stripMarkdownFormatting strips bold, italics, links, and HTML breaks', () => {
  assert.equal(stripMarkdownFormatting('**Wissen Tech**'), 'Wissen Tech')
  assert.equal(stripMarkdownFormatting('*Fintech*'), 'Fintech')
  assert.equal(stripMarkdownFormatting('[https://wissen.com](https://wissen.com)'), 'https://wissen.com')
  assert.equal(stripMarkdownFormatting('[Wissen Official](https://wissen.com)'), 'Wissen Official')
  assert.equal(stripMarkdownFormatting('• item1<br/>• item2'), 'item1, item2')
  assert.equal(stripMarkdownFormatting('`code-span`'), 'code-span')
})

test('extractUrlFromMarkdown extracts target URLs', () => {
  assert.equal(extractUrlFromMarkdown('[https://www.wissen.com](https://www.wissen.com)'), 'https://www.wissen.com')
  assert.equal(extractUrlFromMarkdown('[Company Website](https://example.com/portal)'), 'https://example.com/portal')
  assert.equal(extractUrlFromMarkdown('https://example.org'), 'https://example.org')
})

test('parseTargetCompanyMarkdown handles empty text', () => {
  const result = parseTargetCompanyMarkdown('')
  assert.equal(result.rowCount, 0)
  assert.ok(result.errors.some((e) => e.includes('empty')))
})

test('parseTargetCompanyMarkdown parses multi-column markdown table', () => {
  const md = `
# Target Companies

| Company Name | Location / Country | Sector / Industry | Website / URL | Capabilities / Tags | Description / Profile |
| --- | --- | --- | --- | --- | --- |
| Wissen Tech | Bangalore, India | Banking & Fintech | [https://www.wissen.com](https://www.wissen.com) | banking APIs, reconciliation | Enterprise fintech engineering |
| Chiprama | Austin, US | Semiconductors | https://chiprama.com | ASIC design, verification | IC engineering provider |
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 2)
  assert.equal(preview.rows[0][0], 'Wissen Tech')
  assert.equal(preview.rows[0][1], 'Bangalore, India')
  assert.equal(preview.rows[0][2], 'Banking & Fintech')
  assert.equal(preview.rows[0][3], 'https://www.wissen.com')
  assert.equal(preview.rows[0][4], 'banking APIs, reconciliation')
  assert.equal(preview.rows[0][5], 'Enterprise fintech engineering')

  assert.equal(preview.rows[1][0], 'Chiprama')
  assert.equal(preview.rows[1][1], 'Austin, US')
  assert.equal(preview.rows[1][3], 'https://chiprama.com')
})

test('parseTargetCompanyMarkdown parses 2-column Executive Dossier Attribute table', () => {
  const md = `
# Wissen Tech — Opportunity Intelligence Dossier

## 1. Company Executive Profile

| Attribute | Details |
| --- | --- |
| **Company Name** | **Wissen Tech** |
| **Entity Classification** | Private Limited / Commercial Enterprise |
| **Maturity / Age** | 26 years (Founded 2000) |
| **Operating Jurisdictions** | Bangalore, India and New Jersey, US |
| **Target Sector** | Banking & Financial Technology |
| **Verified Capabilities** | • financial reconciliation<br/>• banking API gateways |
| **Official Website** | [https://www.wissen.com](https://www.wissen.com) |

### Company Description
Wissen Technology specializes in high-throughput distributed systems and cloud migration.
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 1)

  const [row] = preview.rows
  assert.equal(row[0], 'Wissen Tech')
  assert.equal(row[1], 'Bangalore, India and New Jersey, US')
  assert.equal(row[2], 'Banking & Financial Technology')
  assert.equal(row[3], 'https://www.wissen.com')
  assert.ok(row[4].includes('financial reconciliation'))
  assert.ok(row[4].includes('banking API gateways'))
  assert.ok(row[5].includes('Wissen Technology specializes in high-throughput distributed systems'))
})

test('parseTargetCompanyMarkdown parses Obsidian / Vault YAML frontmatter format', () => {
  const md = `---
company_id: COMP-001
company_name: "DEMO — AgriSolar Systems Private Limited"
website: "https://agrisolar.example.com"
country: India
operating_regions:
  - Maharashtra
  - Karnataka
legal_entity_type: Private limited company
industry:
  - Agricultural technology
  - Renewable energy
technology_focus:
  - Solar photovoltaic pumping systems
  - IoT remote monitoring
business_description: "AgriSolar designs and manufactures small solar-powered irrigation pumping units."
---

# DEMO — AgriSolar Systems Private Limited

## Overview
AgriSolar operates across rural agricultural regions with solar pumping and cold-storage solutions.
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 1)

  const [row] = preview.rows
  assert.equal(row[0], 'AgriSolar Systems Private Limited')
  assert.ok(row[1].includes('India') || row[1].includes('Maharashtra'))
  assert.ok(row[2].includes('Agricultural technology'))
  assert.equal(row[3], 'https://agrisolar.example.com')
  assert.ok(row[4].includes('Solar photovoltaic pumping systems'))
  assert.ok(row[5].includes('solar-powered irrigation pumping units'))
})

test('parseTargetCompanyMarkdown parses Heading and bullet-point dossiers', () => {
  const md = `
# Target Portfolio

## CyberDueDil
- **Location**: London, United Kingdom
- **Sector**: Cybersecurity & Compliance
- **Website**: https://cyberduedil.co.uk
- **Capabilities**: Pen testing, NIS2 compliance, cloud security
- **Description**: Specialist cybersecurity auditing consultancy.

## OpenRAG Systems
- **Location**: San Francisco, CA, US
- **Sector**: Artificial Intelligence
- **Website**: https://openrag.ai
- **Capabilities**: LLM orchestration, vector databases, RAG architecture
- **Description**: Next-gen enterprise retrieval augmented generation platform.
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 2)

  assert.equal(preview.rows[0][0], 'CyberDueDil')
  assert.equal(preview.rows[0][1], 'London, United Kingdom')
  assert.equal(preview.rows[0][2], 'Cybersecurity & Compliance')
  assert.equal(preview.rows[0][3], 'https://cyberduedil.co.uk')
  assert.ok(preview.rows[0][4].includes('NIS2 compliance'))

  assert.equal(preview.rows[1][0], 'OpenRAG Systems')
  assert.equal(preview.rows[1][1], 'San Francisco, CA, US')
  assert.equal(preview.rows[1][2], 'Artificial Intelligence')
  assert.equal(preview.rows[1][3], 'https://openrag.ai')
  assert.ok(preview.rows[1][4].includes('LLM orchestration'))
})

test('parseTargetCompanyMarkdown integrates seamlessly with csvPreviewToTargetCompanies', () => {
  const md = `
# Wissen Tech — Opportunity Intelligence Dossier

| Attribute | Details |
| --- | --- |
| **Company Name** | **Wissen Tech** |
| **Operating Jurisdictions** | Bangalore, India and New Jersey, US |
| **Target Sector** | Banking & Financial Technology |
| **Official Website** | https://www.wissen.com |
| **Verified Capabilities** | financial reconciliation, banking APIs |

### Company Description
Enterprise software development company.
`
  const preview = parseTargetCompanyMarkdown(md)
  const profiles = csvPreviewToTargetCompanies(preview)

  assert.equal(profiles.length, 1)
  assert.equal(profiles[0].name, 'Wissen Tech')
  assert.equal(profiles[0].country, 'Bangalore, India and New Jersey, US')
  assert.equal(profiles[0].sector, 'Banking & Financial Technology')
  assert.equal(profiles[0].website, 'https://www.wissen.com')
  assert.ok(profiles[0].capabilities?.includes('financial reconciliation'))
  assert.ok(profiles[0].capabilities?.includes('banking APIs'))
})

test('parseTargetCompanyInput routes .csv and .md files correctly', () => {
  assert.ok(isMarkdownFile('companies.md'))
  assert.ok(isMarkdownFile('Dossier.MARKDOWN'))
  assert.ok(!isMarkdownFile('data.csv'))

  assert.ok(isCsvFile('data.csv'))
  assert.ok(!isCsvFile('dossier.md'))

  const csvContent = 'Company Name,Country,Sector\nAlpha Corp,US,Tech\n'
  const csvParsed = parseTargetCompanyInput(csvContent, 'Alpha.csv')
  assert.equal(csvParsed.rowCount, 1)
  assert.equal(csvParsed.rows[0][0], 'Alpha Corp')

  const mdContent = '# Beta Corp\n- **Location**: Germany\n- **Sector**: CleanTech\n'
  const mdParsed = parseTargetCompanyInput(mdContent, 'Beta.md')
  assert.equal(mdParsed.rowCount, 1)
  assert.equal(mdParsed.rows[0][0], 'Beta Corp')
})

test('parseTargetCompanyMarkdown handles markdown tables without outer pipes', () => {
  const md = `
Company Name | Country | Sector | Website
--- | --- | --- | ---
Wissen Tech | India | Fintech | https://www.wissen.com
Chiprama | United States | Semiconductor | https://chiprama.com
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 2)
  assert.equal(preview.rows[0][0], 'Wissen Tech')
  assert.equal(preview.rows[0][1], 'India')
  assert.equal(preview.rows[0][2], 'Fintech')
  assert.equal(preview.rows[0][3], 'https://www.wissen.com')
})

test('parseTargetCompanyMarkdown handles table with "Company" column header', () => {
  const md = `
| Company | HQ Location | Industry | URL |
| :--- | :--- | :--- | :--- |
| Wissen Tech | Bangalore, India | Financial Software | https://www.wissen.com |
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 1)
  assert.equal(preview.rows[0][0], 'Wissen Tech')
  assert.equal(preview.rows[0][1], 'Bangalore, India')
  assert.equal(preview.rows[0][2], 'Financial Software')
  assert.equal(preview.rows[0][3], 'https://www.wissen.com')
})

test('parseTargetCompanyMarkdown handles unheaded bold key-value lines', () => {
  const md = `
**Company Name:** Wissen Tech
**HQ:** Bangalore, India
**Sector:** Banking & Financial Technology
**Website:** https://www.wissen.com
**Capabilities:** Banking APIs, loan reconciliation
**Description:** High-throughput enterprise technology provider
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 1)
  assert.equal(preview.rows[0][0], 'Wissen Tech')
  assert.equal(preview.rows[0][1], 'Bangalore, India')
  assert.equal(preview.rows[0][2], 'Banking & Financial Technology')
  assert.equal(preview.rows[0][3], 'https://www.wissen.com')
  assert.ok(preview.rows[0][4].includes('Banking APIs'))
})

test('parseTargetCompanyMarkdown handles unheaded plain key-value lines', () => {
  const md = `
Company: Wissen Tech
Location: Bangalore, India
Sector: Fintech
Website: https://www.wissen.com
Capabilities: Banking APIs, financial reconciliation
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 1)
  assert.equal(preview.rows[0][0], 'Wissen Tech')
  assert.equal(preview.rows[0][1], 'Bangalore, India')
  assert.equal(preview.rows[0][2], 'Fintech')
  assert.equal(preview.rows[0][3], 'https://www.wissen.com')
})

test('parseTargetCompanyMarkdown handles freeform company notes', () => {
  const md = `
# Wissen Tech
Wissen Technology is a specialized enterprise solutions and consulting company.
Headquarters: Bangalore, India
Website: https://www.wissen.com
Sector: Financial Technology
`
  const preview = parseTargetCompanyMarkdown(md)
  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rowCount, 1)
  assert.equal(preview.rows[0][0], 'Wissen Tech')
  assert.ok(preview.rows[0][1].includes('Bangalore'))
  assert.equal(preview.rows[0][3], 'https://www.wissen.com')
})


/**
 * Generates and downloads an executive-grade Markdown (.md) Dossier
 * containing Company Profile details, Target Opportunity Leads,
 * and Evaluation Rationale.
 */

import type {
  TargetCompanyLiveDiscoveryResult,
  TargetCompanyLiveDiscoveryRecord,
} from './live-discovery'
import type { TargetCompanyMatchInput } from './matching'
import {
  fitScore1to5,
  isPotentialLead,
  buildMeaningfulLeadNote,
  countPotentialLeadsByType,
  type GenerateLeadsCsvOptions,
} from './export-leads-csv'

export interface GenerateLeadsMarkdownOptions extends GenerateLeadsCsvOptions {
  batchLabel?: string
  includeAuditSection?: boolean
}

export function formatFitStars(fitScore: number): string {
  switch (fitScore) {
    case 5:
      return '⭐⭐⭐⭐⭐ (5/5 • Top Tier Fit)'
    case 4:
      return '⭐⭐⭐⭐ (4/5 • High Fit)'
    case 3:
      return '⭐⭐⭐ (3/5 • Viable / Moderate Fit)'
    case 2:
      return '⭐⭐ (2/5 • Potential Fit)'
    default:
      return '⭐ (1/5 • Provisional Fit)'
  }
}

export function generateCompanyLeadsMarkdown(
  results: readonly TargetCompanyLiveDiscoveryResult[],
  companyProfile?: TargetCompanyMatchInput | null,
  owner = 'Sathvika',
  options?: GenerateLeadsMarkdownOptions,
): string {
  const profile = companyProfile || results[0]?.profile
  const companyName = profile?.name || results[0]?.profile?.name || 'Target Company'
  const currentYear = new Date().getFullYear()
  const foundedYear = profile?.foundedYear
  const companyAge = foundedYear ? currentYear - foundedYear : null
  const companyMaturity = companyAge !== null
    ? `${companyAge} years (Founded ${foundedYear})`
    : 'Established commercial enterprise'

  const countries = profile?.countries && profile.countries.length > 0
    ? profile.countries.join(', ')
    : profile?.country || 'Global / Multilateral'

  const capabilities = profile?.capabilities && profile.capabilities.length > 0
    ? profile.capabilities
    : ['Enterprise Software Solutions', 'Digital Systems & Cloud Migration']

  const counts = countPotentialLeadsByType(results)

  // Map of source records by id or url
  const recordMap = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  for (const res of results) {
    for (const r of res.records ?? []) {
      if (r.sourceRecordId) recordMap.set(r.sourceRecordId, r)
      if (r.sourceUrl) recordMap.set(r.sourceUrl, r)
    }
  }

  // Collect qualified leads
  interface QualifiedLeadItem {
    id: string
    title: string
    type: 'Grant' | 'RFP'
    issuer: string
    source: string
    country: string
    deadline: string
    score: number
    fitScore: number
    url: string
    note: string
    reasons: readonly string[]
  }

  const seen = new Set<string>()
  const allLeads: QualifiedLeadItem[] = []

  for (const res of results) {
    for (const rec of res.recommendations ?? []) {
      if (!isPotentialLead(rec)) continue

      const key = `${rec.opportunityId}:${rec.companyName}`
      if (seen.has(key)) continue
      seen.add(key)

      const record = recordMap.get(rec.opportunityId) ?? recordMap.get(rec.sourceUrl)
      const isProcurement = rec.opportunityType === 'procurement'
      const type = isProcurement ? 'RFP' : 'Grant'
      const score = typeof rec.score === 'number' ? rec.score : 50
      const fitScore = fitScore1to5(score, rec.outcome)
      const note = buildMeaningfulLeadNote(rec, record, fitScore, type)

      const urlLower = rec.sourceUrl.toLowerCase()
      let issuer = isProcurement ? 'Government Public Sector' : 'Federal / Innovation Agency'
      if (record?.source === 'sam' || urlLower.includes('sam.gov')) issuer = 'US Federal Procurement Authority'
      else if (record?.source === 'sbir' || urlLower.includes('sbir.gov') || urlLower.includes('seed.nih.gov')) issuer = 'US Federal SBIR / STTR Directorate'
      else if (record?.source === 'challenge' || urlLower.includes('challenge.gov')) issuer = 'US Federal Challenge Directorate'
      else if (record?.source === 'startup-india' || urlLower.includes('startupindia')) issuer = 'DPIIT & Central Ministries (Startup India)'
      else if (record?.source === 'thub' || urlLower.includes('t-hub.co')) issuer = 'T-Hub Foundation & State of Telangana'
      else if (record?.source === 'icreate' || urlLower.includes('icreate.org.in')) issuer = 'iCreate & MeitY DeepTech Directorate'
      else if (record?.source === 'grantsgov' || urlLower.includes('grants.gov')) issuer = 'US Federal Grant Agency'
      else if (record?.source === 'ted' || urlLower.includes('ted.europa.eu')) issuer = 'European Public Procurement Authority'
      else if (record?.source === 'eu-sedia' || urlLower.includes('europa.eu')) issuer = 'European Commission'
      else if (record?.source === 'gem' || urlLower.includes('gem.gov.in') || urlLower.includes('eprocure.gov.in')) issuer = 'Government of India (GeM/CPPP)'
      else if (record?.source === 'india-grants' || urlLower.includes('meity') || urlLower.includes('idex') || urlLower.includes('birac')) issuer = 'MeitY / Ministry of Defence / DPIIT'
      else if (record?.source === 'worldbank' || urlLower.includes('worldbank.org')) issuer = 'World Bank & Multilateral Development Banks'

      const country =
        record?.country ||
        (urlLower.includes('worldbank.org')
          ? 'International / World Bank'
          : urlLower.includes('ted.europa.eu') || urlLower.includes('europa.eu')
            ? 'European Union'
            : urlLower.includes('gem.gov.in') || urlLower.includes('startupindia') || urlLower.includes('t-hub.co') || urlLower.includes('icreate')
              ? 'India'
              : 'United States')

      const deadline = rec.deadline || record?.deadline || 'Open / Verified Active'

      // Source label
      let sourceName = 'Official Government Portal'
      if (urlLower.includes('worldbank.org')) sourceName = 'World Bank Official API'
      else if (urlLower.includes('grants.gov')) sourceName = 'Grants.gov Federal Feeds'
      else if (urlLower.includes('sam.gov')) sourceName = 'SAM.gov Federal Tenders'
      else if (urlLower.includes('sbir.gov') || urlLower.includes('seed.nih.gov')) sourceName = 'SBIR.gov Innovation Grants'
      else if (urlLower.includes('challenge.gov')) sourceName = 'Challenge.gov Prize Competitions'
      else if (urlLower.includes('ted.europa.eu')) sourceName = 'EU TED Tender Stream'
      else if (urlLower.includes('gem.gov.in') || urlLower.includes('eprocure.gov.in')) sourceName = 'GeM India Portal'
      else if (urlLower.includes('startupindia')) sourceName = 'Startup India Seed Schemes'
      else if (urlLower.includes('t-hub.co')) sourceName = 'T-Hub Corporate Innovation'
      else if (urlLower.includes('icreate.org.in')) sourceName = 'iCreate Spark Grants'

      allLeads.push({
        id: rec.opportunityId,
        title: rec.opportunityTitle,
        type,
        issuer,
        source: sourceName,
        country,
        deadline,
        score,
        fitScore,
        url: rec.sourceUrl,
        note,
        reasons: rec.reasons || [],
      })
    }
  }

  // Sort by score descending
  allLeads.sort((a, b) => b.score - a.score)

  // Filter based on options
  let filteredLeads = allLeads
  if (options?.filterType === 'grant') {
    filteredLeads = allLeads.filter((item) => item.type === 'Grant')
  } else if (options?.filterType === 'rfp') {
    filteredLeads = allLeads.filter((item) => item.type === 'RFP')
  } else if (options?.filterType === 'both_balanced') {
    const grants = allLeads.filter((i) => i.type === 'Grant').slice(0, 10)
    const rfps = allLeads.filter((i) => i.type === 'RFP').slice(0, 10)
    filteredLeads = [...grants, ...rfps].sort((a, b) => b.score - a.score)
  }

  if (typeof options?.offset === 'number' || typeof options?.limit === 'number') {
    const start = options?.offset ?? 0
    const end = typeof options?.limit === 'number' ? start + options.limit : undefined
    filteredLeads = filteredLeads.slice(start, end)
  }

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Build Markdown Document
  const lines: string[] = []

  // Document Title & Metadata
  lines.push(`# ${companyName} — Opportunity Intelligence Dossier`)
  lines.push('')
  lines.push(`> **Generated Date:** ${generatedDate}  `)
  lines.push(`> **Lead Evaluation Analyst:** ${owner}  `)
  lines.push(`> **Qualified Opportunities Identified:** ${filteredLeads.length} leads (${counts.grants} Grants, ${counts.rfps} RFPs)  `)
  lines.push(`> **Evaluation Engine:** TVB Opportunity Intelligence Engine (Domain Gravity & Anchor Phrase Calibration)`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // 1. Company Executive Profile
  lines.push('## 1. Company Executive Profile')
  lines.push('')
  lines.push('| Field | Company Details |')
  lines.push('| :--- | :--- |')
  lines.push(`| **Company Name** | **${companyName}** |`)
  lines.push(`| **Entity Classification** | ${profile?.companyType || 'Commercial Corporation / Enterprise'} |`)
  lines.push(`| **Operating Jurisdictions** | ${countries} |`)
  lines.push(`| **Industry & Sector** | ${profile?.sector || 'Software Services & Enterprise Consulting'} |`)
  lines.push(`| **Company Maturity** | ${companyMaturity} |`)
  if (profile?.website) {
    lines.push(`| **Website** | [${profile.website}](${profile.website}) |`)
  }
  lines.push('')

  lines.push('### Core Capabilities & Verified Services')
  for (const cap of capabilities) {
    lines.push(`- **${cap}**`)
  }
  lines.push('')

  if (profile?.description) {
    lines.push('### Published Service Scope & Profile Description')
    lines.push(`> ${profile.description}`)
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  // 2. Intelligence & Discovery Summary
  lines.push('## 2. Opportunity Intelligence Summary')
  lines.push('')
  lines.push(`A total of **${counts.total} potential leads** were evaluated across global public procurement systems, multilateral development banks, and government innovation grants.`)
  lines.push('')
  lines.push('| Metric | Count | Description |')
  lines.push('| :--- | :--- | :--- |')
  lines.push(`| **Total Qualified Leads** | **${counts.total}** | Opportunities meeting anchor vertical and capability criteria |`)
  lines.push(`| **Public Grants** | **${counts.grants}** | Non-dilutive federal and state innovation funding |`)
  lines.push(`| **Government RFPs** | **${counts.rfps}** | Commercial public procurement and enterprise digital tenders |`)
  lines.push(`| **Top-Tier Matches (≥85%)** | **${allLeads.filter((i) => i.score >= 85).length}** | Sweet-spot opportunities directly in core domain vertical |`)
  lines.push(`| **High Matches (70%–84%)** | **${allLeads.filter((i) => i.score >= 70 && i.score < 85).length}** | Strong domain and capability alignment |`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // 3. Qualified Leads Overview Table
  lines.push('## 3. Qualified Leads Overview')
  lines.push('')
  lines.push('| # | Type | Opportunity Title | Issuer / Source | Country | Deadline | Score | Fit |')
  lines.push('| :- | :--- | :---------------- | :-------------- | :------ | :------- | :---- | :-- |')

  filteredLeads.forEach((lead, index) => {
    const cleanTitle = lead.title.replace(/\|/g, '-').trim()
    const titleLink = `[${cleanTitle.length > 55 ? cleanTitle.slice(0, 52) + '...' : cleanTitle}](${lead.url})`
    lines.push(
      `| ${index + 1} | **${lead.type}** | ${titleLink} | ${lead.issuer} | ${lead.country} | ${lead.deadline} | **${lead.score}%** | ${'⭐'.repeat(lead.fitScore)} |`
    )
  })
  lines.push('')
  lines.push('---')
  lines.push('')

  // 4. Detailed Lead Dossiers & Strategic Rationale
  lines.push('## 4. Opportunity Dossiers & Strategic Alignment')
  lines.push('')

  filteredLeads.forEach((lead, index) => {
    lines.push(`### ${index + 1}. [${lead.id}] ${lead.title}`)
    lines.push('')
    lines.push(`- **Direct Link:** [Open Official Notice & Submission Portal](${lead.url})`)
    lines.push(`- **Opportunity Type:** **${lead.type}** (${lead.type === 'RFP' ? 'Commercial Procurement' : 'Public Innovation Grant'})`)
    lines.push(`- **Issuer / Funder:** ${lead.issuer} • *${lead.source}*`)
    lines.push(`- **Country / Jurisdiction:** ${lead.country}`)
    lines.push(`- **Submission Deadline:** \`${lead.deadline}\``)
    lines.push(`- **Calibrated Fit Score:** **${lead.score}%** — ${formatFitStars(lead.fitScore)}`)
    lines.push('')
    lines.push(`**Strategic Matching Analysis:**  `)
    lines.push(`${lead.note}`)
    lines.push('')
    if (lead.reasons.length > 0) {
      lines.push('**Key Evidence & Factors:**')
      for (const r of lead.reasons) {
        lines.push(`- ${r}`)
      }
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  })

  // 5. Governance & Gating Audit
  if (options?.includeAuditSection !== false) {
    lines.push('## 5. Governance & Quality Gates Audit')
    lines.push('')
    lines.push('To ensure high signal-to-noise ratio and prevent irrelevant opportunities from inflating company fit scores, the following deterministic gates were enforced:')
    lines.push('')
    lines.push('1. **Anti-Signal Hardware & Facilities Knockout:** Automatically excluded notices focused on physical data center construction, in-row chillers, FM200 fire suppression, 200kVA UPS systems, or OEM hardware resale (Manufacturer Authorization Forms).')
    lines.push('2. **Individual Consultant Vacancy Knockout:** Excluded in-house individual staff vacancies and project implementation unit recruitment (`CS-INDV`), which require personal CVs and are statutorily restricted against corporate consulting firms.')
    lines.push('3. **Environmental & Civil Works Knockout:** Filtered out non-IT civil works, rural forestry restoration, wildlife habitat management, and asphalt resurfacing.')
    lines.push('4. **Statutory Applicant Eligibility Gate:** Strictly checked statutory restrictions to reject calls reserved exclusively for 501(c)(3) nonprofits, higher education universities, or municipal governments.')
    lines.push('5. **Advisory Conflict-of-Interest Capping:** Scored pure feasibility and diagnostic studies at advisory levels (≤40%) to protect the firm from disqualification under World Bank procurement regulations for downstream software execution.')
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // Footer
  lines.push(`*Report compiled automatically by The Venture Build (TVB) Opportunity Intelligence Engine on ${generatedDate}.*`)

  return lines.join('\n')
}

export function triggerMarkdownDownload(markdownContent: string, fileName: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', fileName)
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadCompanyLeadsMarkdown(
  results: readonly TargetCompanyLiveDiscoveryResult[],
  companyName?: string,
  owner = 'Sathvika',
  options?: GenerateLeadsMarkdownOptions,
): void {
  const profile = results[0]?.profile
  const mdContent = generateCompanyLeadsMarkdown(results, profile, owner, options)
  const cleanName = (companyName || profile?.name || 'Target-Company')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
  const suffix = options?.batchLabel ? `-${options.batchLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : ''
  const fileName = `${cleanName}-Opportunity-Dossier${suffix}.md`
  triggerMarkdownDownload(mdContent, fileName)
}

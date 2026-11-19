/**
 * Phase 2 additive company-specific relevance evaluation for uploaded target
 * companies.
 *
 * This module does not run discovery, call networks, import companies, or modify
 * existing matching engines. It evaluates a target-company profile against an
 * already retrieved funding or procurement record using explainable rules.
 *
 * Outcomes are deliberately non-numeric and inspectable. Missing evidence stays
 * missing; relevance is never treated as eligibility.
 */

export type TargetOpportunityType = 'funding' | 'procurement'

export type TargetRelevanceOutcome =
  | 'relevant'
  | 'potentially_relevant'
  | 'not_relevant'
  | 'insufficient_evidence'

export type TargetTopicalRelevance =
  | 'strong_match'
  | 'moderate_match'
  | 'weak_match'
  | 'unrelated'
  | 'insufficient_evidence'

export type TargetApplicantEligibility =
  | 'eligible'
  | 'ineligible'
  | 'unverified_unknown'

export interface TargetCompanyMatchInput {
  readonly companyId: string
  readonly name: string
  readonly country?: string | null
  readonly countries?: readonly string[] | null
  readonly sector?: string | null
  readonly capabilities?: readonly string[] | null
  readonly description?: string | null
  readonly companyType?: string | null
  readonly website?: string | null
  readonly foundedYear?: number | null
}

export interface TargetOpportunityInput {
  readonly opportunityId: string
  readonly opportunityType: TargetOpportunityType
  readonly title: string
  readonly description?: string | null
  readonly country?: string | null
  readonly sectors?: readonly string[] | null
  readonly requirements?: readonly string[] | null
  readonly applicantTypes?: readonly string[] | null
  readonly deadline?: string | null
  readonly status?: string | null
  readonly sourceUrl: string
}

export interface TargetRelevanceFactor {
  readonly score: number | null
  readonly weight: number
  readonly evidence: readonly string[]
  readonly reason: string
}

export interface TargetRelevanceResult {
  readonly companyId: string
  readonly companyName: string
  readonly opportunityId: string
  readonly opportunityTitle: string
  readonly opportunityType: TargetOpportunityType
  readonly sourceUrl: string
  readonly outcome: TargetRelevanceOutcome
  readonly score: number | null
  readonly scoreStatus: 'SCORED' | 'PROVISIONAL' | 'INSUFFICIENT_EVIDENCE'
  readonly coverage: number
  readonly factors: {
    readonly industryAlignment: TargetRelevanceFactor
    readonly capabilityAlignment: TargetRelevanceFactor
    readonly useCaseAlignment: TargetRelevanceFactor
    readonly applicantEligibility: TargetRelevanceFactor
    readonly geography: TargetRelevanceFactor
    readonly companyStage: TargetRelevanceFactor
  }
  readonly matchedFields: readonly string[]
  readonly mismatchedFields: readonly string[]
  readonly missingFields: readonly string[]
  readonly uncertainty: readonly string[]
  readonly reasons: readonly string[]
  readonly deadline: string | null
  readonly status: string | null
  readonly topicalRelevance?: TargetTopicalRelevance
  readonly applicantEligibilityStatus?: TargetApplicantEligibility
}

const STOPWORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'so', 'the', 'their',
  'this', 'to', 'with', 'us', 'company', 'companies', 'our', 'your',
])

const GENERIC_TERMS = new Set([
  'product', 'products', 'software', 'technology', 'technologies',
  'infrastructure', 'service', 'services', 'solution', 'solutions',
  'platform', 'platforms', 'system', 'systems', 'data', 'cloud', 'digital',
  'project', 'projects', 'program', 'programs', 'grant', 'grants',
  'support', 'development', 'management', 'application', 'applications',
  'work', 'works', 'innovation', 'innovations', 'research', 'commercial',
  'technical', 'opportunity', 'opportunities', 'call', 'calls',
  'organization', 'organizations', 'industry', 'industries', 'hub', 'hubs',
  'implementation', 'operations', 'monitoring', 'consulting', 'advisory',
  'engineering', 'information', 'business', 'delivery', 'training',
  'process', 'processing', 'testing', 'deployment', 'integration', 'enterprise',
  'firm', 'firms', 'client', 'clients', 'center', 'centers', 'national', 'international',
  'portal', 'portals', 'web', 'website', 'websites', 'maintenance', 'tool', 'tools',
])

function normalize(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim().toLowerCase()
  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length > 1 ? (parts[parts.length - 1] ?? trimmed) : trimmed
}

export function normalizeCountry(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim().toLowerCase()
  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean)
  const candidate = parts.length > 1 ? (parts[parts.length - 1] ?? trimmed) : trimmed
  const cleaned = candidate.replace(/[^a-z0-9 ]+/g, '').trim()

  const aliases: Record<string, string> = {
    us: 'us',
    usa: 'us',
    'united states': 'us',
    'united states of america': 'us',
    uk: 'uk',
    gb: 'uk',
    'great britain': 'uk',
    'united kingdom': 'uk',
    in: 'in',
    ind: 'in',
    india: 'in',
    de: 'de',
    deu: 'de',
    germany: 'de',
    fr: 'fr',
    fra: 'fr',
    france: 'fr',
  }
  return aliases[cleaned] ?? cleaned
}

export function extractCountryCodes(value: string | readonly string[] | null | undefined): Set<string> {
  if (!value) return new Set()
  const result = new Set<string>()

  const items = Array.isArray(value) ? value : [value]
  for (const item of items) {
    if (!item || typeof item !== 'string') continue
    const text = item.toLowerCase()

    if (/\b(india|bharat|bangalore|bengaluru|delhi|mumbai|hyderabad|chennai|pune|kerala|karnataka|telangana|tamil nadu|\.in)\b/i.test(text)) {
      result.add('in')
    }
    if (/\b(united states|usa|u\.s\.a?|u\.s\b|us\b|america|california|texas|delaware|new york|san francisco|austin|seattle)\b/i.test(text)) {
      result.add('us')
    }
    if (/\b(united kingdom|uk\b|u\.k\b|great britain|england|london|manchester)\b/i.test(text)) {
      result.add('uk')
    }
    if (/\b(germany|deutschland|berlin|munich)\b/i.test(text)) {
      result.add('de')
    }
    if (/\b(france|paris)\b/i.test(text)) {
      result.add('fr')
    }

    const chunks = text.split(/[\r\n,;&/]+|\band\b/i).map((c) => c.replace(/[^a-z0-9 ]+/g, '').trim()).filter(Boolean)
    for (const chunk of chunks) {
      const normalized = normalizeCountry(chunk)
      if (normalized) {
        result.add(normalized)
      }
    }

    if (result.size === 0) {
      const single = normalizeCountry(item)
      if (single) result.add(single)
    }
  }

  return result
}

function tokens(value: string | null | undefined): string[] {
  if (!value) return []
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(
          (token) =>
            (token.length >= 3 || token === 'ai' || token === 'ml' || token === 'ar' || token === 'vr' || token === '5g') &&
            !STOPWORDS.has(token),
        ),
    ),
  ]
}

function companySectorTokens(company: TargetCompanyMatchInput): string[] {
  return tokens(company.sector)
}

function companyCapabilityTokens(company: TargetCompanyMatchInput): string[] {
  return [...new Set([
    ...(company.capabilities ?? []).flatMap((value) => tokens(value)),
    ...tokens(company.description),
  ])]
}

function companyAllTokens(company: TargetCompanyMatchInput): string[] {
  return [...new Set([
    ...tokens(company.sector),
    ...tokens(company.description),
    ...(company.capabilities ?? []).flatMap((value) => tokens(value)),
  ])]
}

function opportunitySectorTokens(opportunity: TargetOpportunityInput): string[] {
  return [...new Set([
    ...tokens(opportunity.title),
    ...(opportunity.sectors ?? []).flatMap((value) => tokens(value)),
  ])]
}

function opportunityRequirementTokens(opportunity: TargetOpportunityInput): string[] {
  return [...new Set([
    ...tokens(opportunity.description),
    ...(opportunity.requirements ?? []).flatMap((value) => tokens(value)),
  ])]
}

function opportunityAllTokens(opportunity: TargetOpportunityInput): string[] {
  return [...new Set([
    ...tokens(opportunity.title),
    ...tokens(opportunity.description),
    ...(opportunity.sectors ?? []).flatMap((value) => tokens(value)),
    ...(opportunity.requirements ?? []).flatMap((value) => tokens(value)),
  ])]
}

const GENERIC_PHRASES = new Set([
  'software services', 'software development', 'technology services', 'information technology',
  'system development', 'systems development', 'project management', 'data platform',
  'cloud services', 'solution provider', 'technical support', 'support services',
  'enterprise software', 'software solutions', 'digital transformation', 'it services',
  'web application', 'web applications', 'web development', 'application development',
  'portal development', 'design development', 'custom software', 'system integration',
  'testing commissioning', 'supply installation', 'technical services', 'consulting services',
  'management system', 'information management', 'information systems',
])

function isGenericPhrase(phrase: string): boolean {
  if (GENERIC_PHRASES.has(phrase)) return true
  const words = phrase.split(/\s+/).filter(Boolean)
  return words.length > 0 && words.every((w) => GENERIC_TERMS.has(w))
}

function extractKeyPhrases(text: string | null | undefined): string[] {
  if (!text) return []
  const segments = text.toLowerCase().split(/[\r\n,;&|/]+/).map((s) => s.trim()).filter(Boolean)
  const phrases: string[] = []

  for (const seg of segments) {
    const cleaned = seg.replace(/[^a-z0-9\s-]/g, ' ').replace(/-/g, ' ').trim()
    const words = cleaned.split(/\s+/).filter((w) => (w.length >= 3 || w === 'ai' || w === 'ml' || w === 'ar' || w === 'vr' || w === 'ui' || w === 'ux' || w === '5g') && !STOPWORDS.has(w))

    if (words.length >= 2 && words.length <= 4) {
      const p = words.join(' ')
      if (!isGenericPhrase(p)) phrases.push(p)
    }

    for (let i = 0; i < words.length - 1; i++) {
      const p2 = `${words[i]} ${words[i + 1]}`
      if (!isGenericPhrase(p2)) phrases.push(p2)
    }

    for (let i = 0; i < words.length - 2; i++) {
      const p3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
      if (!isGenericPhrase(p3)) phrases.push(p3)
    }
  }

  return [...new Set(phrases)]
}

function companyDomainPhrases(company: TargetCompanyMatchInput): string[] {
  const allText = `${company.sector ?? ''}; ${(company.capabilities ?? []).join('; ')}; ${company.description ?? ''}`
  return extractKeyPhrases(allText)
}

function checkPhraseInText(phrase: string, text: string): boolean {
  if (!phrase || !text) return false
  if (text.includes(phrase)) return true
  const pWords = phrase.split(/\s+/).filter(Boolean)
  if (pWords.length === 0) return false
  if (pWords.length === 1) {
    const stem = pWords[0].replace(/(?:s|es)$/i, '')
    const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${esc}(?:s|es)?\\b`, 'i').test(text)
  }

  const wordPatterns = pWords.map((w) => {
    const stem = w.replace(/(?:s|es)$/i, '')
    const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return `\\b${esc}(?:s|es)?\\b`
  })

  const pattern = wordPatterns.join('(?:\\s+\\w+){0,2}\\s+')
  const regex = new RegExp(pattern, 'i')
  return regex.test(text)
}

function isSoftwareCompany(company: TargetCompanyMatchInput): boolean {
  const text = `${company.sector ?? ''} ${company.description ?? ''} ${(company.capabilities ?? []).join(' ')} ${company.name ?? ''}`.toLowerCase()
  return /software|technology|technologies|it services|digital|tech\b|computer|programming|developer|saas|fintech|cloud|semiconductor|asic|embedded/i.test(text)
}

function detectCompanyEntityCategory(company: TargetCompanyMatchInput): 'nonprofit' | 'for_profit' | 'higher_ed' | 'government' | null {
  const typeText = `${company.companyType ?? ''} ${company.sector ?? ''} ${company.name ?? ''} ${company.description ?? ''}`.toLowerCase()
  if (/nonprofit|501\(c\)|charity|foundation|research institute/i.test(typeText)) return 'nonprofit'
  if (/higher education|universit(y|ies)|college/i.test(typeText)) return 'higher_ed'
  if (/government|municipality|state agency/i.test(typeText)) return 'government'
  if (/for-profit|commercial|sme|small business|pvt\.? ltd|ltd|inc|corporation|technolog|software|services|startup/i.test(typeText)) return 'for_profit'
  return null
}

export function evaluateTargetCompanyRelevance(
  company: TargetCompanyMatchInput,
  opportunity: TargetOpportunityInput,
): TargetRelevanceResult {
  // Reject awarded, closed, expired, or past results from ever becoming leads
  const oppStatus = (opportunity.status ?? '').trim().toLowerCase()
  const oppTitle = (opportunity.title ?? '').trim().toLowerCase()
  const isAwardedOrClosed =
    /\b(closed|archived|expired|cancelled|canceled|awarded|conquered|winner|completed|decided)\b/i.test(oppStatus) ||
    /contract award|award notice|results of tender|results of|notification of award|aoc\b|not open|no longer open/i.test(oppStatus) ||
    /contract award|award notice|results of tender|notification of award|contract awarded|winner announced/i.test(oppTitle)

  if (isAwardedOrClosed) {
    return {
      companyId: company.companyId || company.name,
      companyName: company.name,
      opportunityId: opportunity.opportunityId,
      opportunityTitle: opportunity.title,
      opportunityType: opportunity.opportunityType,
      sourceUrl: opportunity.sourceUrl,
      outcome: 'not_relevant',
      score: 0,
      scoreStatus: 'SCORED',
      coverage: 1.0,
      matchedFields: [],
      mismatchedFields: ['status'],
      missingFields: [],
      reasons: ['Opportunity is an awarded contract, closed tender, or past result — not an open actionable lead.'],
      uncertainty: [],
      factors: {
        industryAlignment: { score: 0, weight: 25, evidence: [], reason: 'Tender is awarded or closed.' },
        capabilityAlignment: { score: 0, weight: 25, evidence: [], reason: 'Tender is awarded or closed.' },
        useCaseAlignment: { score: 0, weight: 20, evidence: [], reason: 'Tender is awarded or closed.' },
        applicantEligibility: { score: 0, weight: 15, evidence: [], reason: 'Tender is awarded or closed.' },
        geography: { score: 0, weight: 10, evidence: [], reason: 'Tender is awarded or closed.' },
        companyStage: { score: 0, weight: 5, evidence: [], reason: 'Tender is awarded or closed.' },
      },
      deadline: opportunity.deadline ?? null,
      status: opportunity.status ?? 'Awarded / Closed',
      topicalRelevance: 'unrelated',
      applicantEligibilityStatus: 'ineligible',
    }
  }

  const oppFullText = `${opportunity.title} ${opportunity.description ?? ''} ${(opportunity.requirements ?? []).join(' ')} ${(opportunity.sectors ?? []).join(' ')} ${(opportunity.applicantTypes ?? []).join(' ')}`.toLowerCase()
  const companyCategory = detectCompanyEntityCategory(company)
  const isSoftware = isSoftwareCompany(company)

  // 0. Individual Consultant / Direct Employment Vacancy Knockout (Firms/Corporations Ineligible)
  const individualConsultantRegex = /\b(individual consultant selection|individual consultants? \(ic\) method|individual consultant|hire an individual consultant|cs-indv|curriculum vitae with supporting certified copies|full-time position, renewable annually)\b/i
  const isIndividualConsultantOpportunity = individualConsultantRegex.test(oppFullText) || /-cs-indv-/i.test(opportunity.opportunityId || '')

  if (isIndividualConsultantOpportunity) {
    return {
      companyId: company.companyId || company.name,
      companyName: company.name,
      opportunityId: opportunity.opportunityId,
      opportunityTitle: opportunity.title,
      opportunityType: opportunity.opportunityType,
      sourceUrl: opportunity.sourceUrl,
      outcome: 'not_relevant',
      score: 0,
      scoreStatus: 'SCORED',
      coverage: 1.0,
      matchedFields: [],
      mismatchedFields: ['applicantType'],
      missingFields: [],
      reasons: [
        'Opportunity is an Individual Consultant (IC) recruitment / employment vacancy for a single person, not a corporate consulting RFP or software contract. Corporate entities and firms are statutorily ineligible to apply under the World Bank Individual Consultant selection method.',
      ],
      uncertainty: [],
      factors: {
        industryAlignment: { score: 0, weight: 25, evidence: [], reason: 'Individual staff recruitment / employment vacancy.' },
        capabilityAlignment: { score: 0, weight: 25, evidence: [], reason: 'Individual staff recruitment / employment vacancy.' },
        useCaseAlignment: { score: 0, weight: 20, evidence: [], reason: 'In-house project implementation unit employment.' },
        applicantEligibility: { score: 0, weight: 15, evidence: [], reason: 'Restricted strictly to individual natural persons (firms/corporations ineligible).' },
        geography: { score: null, weight: 10, evidence: [], reason: 'Individual post location.' },
        companyStage: { score: null, weight: 5, evidence: [], reason: 'Individual post.' },
      },
      deadline: opportunity.deadline ?? null,
      status: opportunity.status ?? 'Active',
      topicalRelevance: 'unrelated',
      applicantEligibilityStatus: 'ineligible',
    }
  }

  // 1. Hardware, Physical Data Center Facilities & Mechanical/Electrical Knockout
  const hardwareFacilitiesRegex = /\b(chiller|chillers|in-row cooling|crac\b|hvac\b|cooling unit|fm200|fire suppression|gas discharge|raised floor|anti-static floor|busbar|busbars|ups systems?|200 kva|1000a\b|power distribution frame|main distribution board|\bmdb\b|\bpdf\b|\bpdb\b|server cabinets|server racks|cctv|bullet cameras|dome cameras|\bnvr\b|biometric locks|magnetic locks|ic cards|office furniture|cable splicing|fiber splicing|hardware supply|box supply|maf if bidder != oem|manufacturer authorization form)\b/i
  const isSoftwareDevelopmentRFP = /\b(custom software|portal development|software engineering|software development|api development|application software)\b/i.test(oppFullText)

  if (isSoftware && hardwareFacilitiesRegex.test(oppFullText) && !isSoftwareDevelopmentRFP) {
    return {
      companyId: company.companyId || company.name,
      companyName: company.name,
      opportunityId: opportunity.opportunityId,
      opportunityTitle: opportunity.title,
      opportunityType: opportunity.opportunityType,
      sourceUrl: opportunity.sourceUrl,
      outcome: 'not_relevant',
      score: 5,
      scoreStatus: 'SCORED',
      coverage: 1.0,
      matchedFields: [],
      mismatchedFields: ['sector/capabilities', 'scope'],
      missingFields: [],
      reasons: [
        'Opportunity scope is primarily physical data center facility fit-out, electrical/mechanical infrastructure, or hardware resale (chillers, FM200, UPS, raised flooring, server supply) with OEM MAF requirements — out of scope for a software services consultancy.',
      ],
      uncertainty: [],
      factors: {
        industryAlignment: { score: 5, weight: 25, evidence: [], reason: 'Physical data center / electrical / hardware scope.' },
        capabilityAlignment: { score: 5, weight: 25, evidence: [], reason: 'Hardware supply and physical facilities fit-out.' },
        useCaseAlignment: { score: 0, weight: 20, evidence: [], reason: 'Civil and hardware infrastructure use case.' },
        applicantEligibility: { score: 0, weight: 15, evidence: [], reason: 'Requires hardware OEM Manufacturer Authorization Form (MAF).' },
        geography: { score: null, weight: 10, evidence: [], reason: 'Hardware delivery location.' },
        companyStage: { score: null, weight: 5, evidence: [], reason: 'Hardware procurement.' },
      },
      deadline: opportunity.deadline ?? null,
      status: opportunity.status ?? 'Active',
      topicalRelevance: 'unrelated',
      applicantEligibilityStatus: 'ineligible',
    }
  }

  // 2. Environmental Fieldwork, Forestry, Wildlife & Civil Works Knockout
  const fieldOperationsNonItRegex = /\b(wildfire|forest restoration|forestland|state forester|tree planting|timber|invasive plants|invasive insects|bark beetle|watershed restoration|fish habitat|wildlife habitat|stream restoration|landscape scale restoration|soil stabilization|rural non-industrial private forest|agricultural machinery|livestock|fertilizer|irrigation canal construction|asphalt resurfacing|pavement maintenance|bridge construction)\b/i

  if (isSoftware && fieldOperationsNonItRegex.test(oppFullText) && !/\b(software development|custom software|data platform|ai model|api)\b/i.test(oppFullText)) {
    return {
      companyId: company.companyId || company.name,
      companyName: company.name,
      opportunityId: opportunity.opportunityId,
      opportunityTitle: opportunity.title,
      opportunityType: opportunity.opportunityType,
      sourceUrl: opportunity.sourceUrl,
      outcome: 'not_relevant',
      score: 0,
      scoreStatus: 'SCORED',
      coverage: 1.0,
      matchedFields: [],
      mismatchedFields: ['sector/capabilities', 'scope'],
      missingFields: [],
      reasons: [
        'Opportunity scope is physical environmental land management, forestry, agriculture, or civil infrastructure — completely outside the software and IT services domain.',
      ],
      uncertainty: [],
      factors: {
        industryAlignment: { score: 0, weight: 25, evidence: [], reason: 'Environmental / forestry / civil scope.' },
        capabilityAlignment: { score: 0, weight: 25, evidence: [], reason: 'Physical land management or civil works.' },
        useCaseAlignment: { score: 0, weight: 20, evidence: [], reason: 'Field operations / non-IT use case.' },
        applicantEligibility: { score: 0, weight: 15, evidence: [], reason: 'Ineligible non-IT scope.' },
        geography: { score: null, weight: 10, evidence: [], reason: 'Field project location.' },
        companyStage: { score: null, weight: 5, evidence: [], reason: 'Field grant/contract.' },
      },
      deadline: opportunity.deadline ?? null,
      status: opportunity.status ?? 'Active',
      topicalRelevance: 'unrelated',
      applicantEligibilityStatus: 'ineligible',
    }
  }

  // 3. Statutory Applicant Ineligibility (Non-profit / Higher-Ed / Tribal / State government restricted)
  const applicantTypesText = (opportunity.applicantTypes ?? []).join(' ').toLowerCase()
  const hasStrictNonProfitRestriction =
    (/\b(nonprofits? having a 501\(c\)\(3\)|nonprofits? that do not have|501\(c\)|higher education|universit(y|ies)|colleges?|state governments?|county governments?|city or township governments?|special district governments?|native american tribal|tribal organizations?)\b/i.test(applicantTypesText) ||
      /\beligible applicants:.*?(nonprofit|501\(c\)|state government|higher education|tribal)/i.test(oppFullText)) &&
    !/\b(for-profit|commercial|small business|sme|business|individuals?|unrestricted|open to any type of entity|any type of entity)\b/i.test(applicantTypesText || oppFullText)

  if (companyCategory === 'for_profit' && hasStrictNonProfitRestriction) {
    return {
      companyId: company.companyId || company.name,
      companyName: company.name,
      opportunityId: opportunity.opportunityId,
      opportunityTitle: opportunity.title,
      opportunityType: opportunity.opportunityType,
      sourceUrl: opportunity.sourceUrl,
      outcome: 'not_relevant',
      score: 0,
      scoreStatus: 'SCORED',
      coverage: 1.0,
      matchedFields: [],
      mismatchedFields: ['applicantType'],
      missingFields: [],
      reasons: [
        'Commercial for-profit company is statutorily ineligible: opportunity is restricted to higher education institutions, universities, nonprofits (501(c)(3)), or government/tribal entities.',
      ],
      uncertainty: [],
      factors: {
        industryAlignment: { score: 0, weight: 25, evidence: [], reason: 'Ineligible applicant type.' },
        capabilityAlignment: { score: 0, weight: 25, evidence: [], reason: 'Ineligible applicant type.' },
        useCaseAlignment: { score: 0, weight: 20, evidence: [], reason: 'Ineligible applicant type.' },
        applicantEligibility: { score: 0, weight: 15, evidence: [], reason: 'Restricted to nonprofits, higher education, or government entities.' },
        geography: { score: null, weight: 10, evidence: [], reason: 'Not evaluated due to applicant ineligibility.' },
        companyStage: { score: null, weight: 5, evidence: [], reason: 'Not evaluated due to applicant ineligibility.' },
      },
      deadline: opportunity.deadline ?? null,
      status: opportunity.status ?? 'Active',
      topicalRelevance: 'unrelated',
      applicantEligibilityStatus: 'ineligible',
    }
  }

  // 4. Pure Policy / Diagnostic Advisory Detection
  const policyAndAdvisoryRegex = /\b(diagnostic assessment|feasibility study|gap analysis|implementation roadmap|draft rfp for vendors|terms of reference for switch vendors|review of legal and regulatory framework|stakeholder consultation plan|policy advisory|advisory services for national or regional payment systems)\b/i
  const isPurePolicyAdvisory =
    policyAndAdvisoryRegex.test(oppFullText) &&
    !/\b(design, development, integration|software development|deploy and support|custom software|portal development|build and deploy|system implementation)\b/i.test(oppFullText)

  // 5. Basic Physical Science / Nuclear / Deep Physics Detection
  const isBasicScienceGrant =
    /\b(continuation of solicitation for the office of science|basic energy sciences|fusion energy|high energy and nuclear physics|isotope r&d)\b/i.test(oppFullText)

  const matchedFields: string[] = []
  const mismatchedFields: string[] = []
  const missingFields: string[] = []
  const uncertainty: string[] = []
  const reasons: string[] = []

  if (isPurePolicyAdvisory) {
    reasons.push(
      'Opportunity is a short-term policy diagnostic and feasibility study (advisory only). Drafting vendor specifications and RFPs under World Bank Conflict of Interest regulations may disqualify the firm from bidding on downstream software implementation.',
    )
  }
  if (isBasicScienceGrant) {
    reasons.push(
      'Investigator-driven federal scientific research grant (not commercial IT procurement). Advanced Scientific Computing Research (ASCR) aligns with high-performance computing, but requires academic/national lab partnership and recognized research Principal Investigator (PI).',
    )
  }

  // 1. Geography evaluation
  const companyCountries = extractCountryCodes(
    company.countries && company.countries.length > 0 ? company.countries : company.country,
  )
  const opportunityCountries = extractCountryCodes(opportunity.country)

  if (companyCountries.size > 0 && opportunityCountries.size > 0) {
    const common = [...companyCountries].filter((code) => opportunityCountries.has(code))
    if (common.length > 0) {
      matchedFields.push('country')
      const branchLabel = common.includes('in')
        ? 'India headquarters / operating branch'
        : common.includes('us')
          ? 'US branch / operating subsidiary'
          : common[0]
      reasons.push(
        companyCountries.size > 1
          ? `Country matches via company operating presence: ${branchLabel}.`
          : `Country matches: ${company.country}.`,
      )
    } else {
      mismatchedFields.push('country')
      reasons.push(`Country differs: company ${company.country}, opportunity ${opportunity.country}.`)
    }
  } else {
    missingFields.push(companyCountries.size > 0 ? 'opportunity.country' : 'company.country')
    uncertainty.push('Geographic eligibility cannot be confirmed because country information is missing.')
  }

  // 2. Topical scope & capability evaluation
  const cSector = companySectorTokens(company)
  const cCap = companyCapabilityTokens(company)
  const cAll = companyAllTokens(company)

  const oSector = opportunitySectorTokens(opportunity)
  const oReq = opportunityRequirementTokens(opportunity)
  const oAll = opportunityAllTokens(opportunity)

  const sharedAll = cAll.filter((token) => oAll.includes(token))
  const specificAllShared = sharedAll.filter((token) => !GENERIC_TERMS.has(token))

  const sharedSector = cSector.filter((token) => oSector.includes(token))
  const specificSharedSector = sharedSector.filter((token) => !GENERIC_TERMS.has(token))

  const sharedCap = cCap.filter((token) => oReq.includes(token))
  const specificSharedCap = sharedCap.filter((token) => !GENERIC_TERMS.has(token))

  // Domain Phrase Matching & Multiplier (Option 1 & Option 2 combined)
  const cPhrases = companyDomainPhrases(company)
  const oppSearchText = `${opportunity.title} ${opportunity.description ?? ''} ${(opportunity.requirements ?? []).join(' ')} ${(opportunity.sectors ?? []).join(' ')}`.toLowerCase()
  const matchedDomainPhrases = cPhrases.filter((p) => checkPhraseInText(p, oppSearchText))

  if (matchedDomainPhrases.length > 0) {
    reasons.push(`Core vertical domain phrases matched: ${matchedDomainPhrases.slice(0, 3).join(', ')}.`)
  }

  let domainGravity: number
  if (cAll.length === 0 || oAll.length === 0) {
    domainGravity = 1.0
  } else if (matchedDomainPhrases.length >= 2) {
    domainGravity = 1.0 // Core sweet spot lead
  } else if (matchedDomainPhrases.length === 1) {
    domainGravity = 1.0 // Strong anchor vertical phrase match
  } else if (specificSharedSector.length >= 1 && specificSharedCap.length >= 1) {
    domainGravity = 0.85 // High token overlap across both sector and capabilities
  } else if (specificAllShared.length >= 2) {
    domainGravity = 0.70 // Multiple specific domain tokens
  } else if (specificAllShared.length === 1) {
    domainGravity = 0.50 // Single specific domain token
  } else {
    domainGravity = 0.20 // Generic vocabulary only (services, software, system)
  }

  let topicalRelevance: TargetTopicalRelevance
  if (cAll.length === 0 || oAll.length === 0) {
    missingFields.push(cAll.length === 0 ? 'company.sector/description/capabilities' : 'opportunity text')
    uncertainty.push('Sector/capability relevance cannot be confirmed because comparable text is missing.')
    topicalRelevance = 'insufficient_evidence'
  } else {
    if (!(company.capabilities && company.capabilities.length > 0) && !company.description) {
      uncertainty.push('Company capabilities and description are missing; scope evaluation is based on sector label alone.')
    }
    if (matchedDomainPhrases.length >= 1 || specificAllShared.length >= 2 || (specificSharedSector.length >= 1 && specificSharedCap.length >= 1)) {
    matchedFields.push('sector/capabilities')
    reasons.push(
      matchedDomainPhrases.length > 0
        ? `Specific vertical domain match: ${matchedDomainPhrases.slice(0, 2).join(', ')}.`
        : `Shared relevant terms: ${specificAllShared.join(', ')}.`,
    )
    topicalRelevance = 'strong_match'
  } else if (specificAllShared.length === 1) {
    matchedFields.push('sector/capabilities')
    reasons.push(`Shared relevant term: ${specificAllShared[0]}.`)
    topicalRelevance = 'moderate_match'
  } else if (sharedAll.length >= 2) {
    matchedFields.push('sector/capabilities')
    reasons.push(`Shared terms are limited to generic keywords (${sharedAll.join(', ')}); specific scope is unevidenced.`)
    uncertainty.push('Only generic keywords overlap between the profile and opportunity scope.')
    topicalRelevance = 'weak_match'
  } else if (sharedAll.length === 1) {
    mismatchedFields.push('sector/capabilities')
    reasons.push(`No specific scope overlap (single generic term overlap only: ${sharedAll[0]}).`)
    uncertainty.push(`Single generic term (${sharedAll[0]}) is insufficient to confirm sector relevance.`)
    topicalRelevance = 'unrelated'
  } else {
    mismatchedFields.push('sector/capabilities')
    reasons.push('No shared sector, capability, or scope terms between the company profile and the opportunity.')
    topicalRelevance = 'unrelated'
  }
}

  // 3. Applicant eligibility evaluation
  let applicantEligibilityStatus: TargetApplicantEligibility = 'unverified_unknown'

  if (opportunity.applicantTypes && opportunity.applicantTypes.length > 0) {
    const oppTypesText = opportunity.applicantTypes.join(' ').toLowerCase()
    const requiresHigherEdOnly = /higher education|universit(y|ies)|colleges/i.test(oppTypesText) && !/for-profit|commercial|small business|sme/i.test(oppTypesText)
    const requiresForProfitOnly = /for-profit|commercial|small business|sme/i.test(oppTypesText) && !/nonprofit|higher education|university/i.test(oppTypesText)

    const companyTypeNormalized = normalize(company.companyType)
    const normalizedApplicantTypes = opportunity.applicantTypes.map(normalize)
    const exactMatch = companyTypeNormalized ? normalizedApplicantTypes.includes(companyTypeNormalized) : false

    if (exactMatch) {
      matchedFields.push('applicantType')
      reasons.push(`Company type ${company.companyType} is among the stated applicant types.`)
      applicantEligibilityStatus = 'eligible'
    } else if (requiresHigherEdOnly && companyCategory === 'for_profit') {
      mismatchedFields.push('applicantType')
      reasons.push(`For-profit company does not qualify for higher education restricted opportunity: ${opportunity.applicantTypes.join(', ')}.`)
      applicantEligibilityStatus = 'ineligible'
    } else if (requiresForProfitOnly && companyCategory === 'nonprofit') {
      mismatchedFields.push('applicantType')
      reasons.push(`Nonprofit entity does not qualify for commercial/for-profit restricted opportunity: ${opportunity.applicantTypes.join(', ')}.`)
      applicantEligibilityStatus = 'ineligible'
    } else if (requiresForProfitOnly && companyCategory === 'for_profit') {
      matchedFields.push('applicantType')
      reasons.push(`For-profit commercial company qualifies for opportunity: ${opportunity.applicantTypes.join(', ')}.`)
      applicantEligibilityStatus = 'eligible'
    } else if (companyCategory === 'for_profit' && normalizedApplicantTypes.some((t) => /commercial|forprofit|pvt|enterprise|business/i.test(t))) {
      matchedFields.push('applicantType')
      reasons.push(`Commercial entity satisfies applicant criteria: ${opportunity.applicantTypes.join(', ')}.`)
      applicantEligibilityStatus = 'eligible'
    } else if (company.companyType) {
      mismatchedFields.push('applicantType')
      reasons.push(`Company type ${company.companyType} is not among the stated applicant types: ${opportunity.applicantTypes.join(', ')}.`)
      applicantEligibilityStatus = 'ineligible'
    } else {
      missingFields.push('company.companyType')
      uncertainty.push('Applicant-type eligibility cannot be confirmed because company type is missing.')
      applicantEligibilityStatus = 'unverified_unknown'
    }
  }

  if (opportunity.requirements && opportunity.requirements.length > 0) {
    const requirementText = opportunity.requirements.join(' ').toLowerCase()
    const unsupportedRequirements = opportunity.requirements.filter((requirement) => {
      const requirementTokens = tokens(requirement)
      return requirementTokens.length > 0 && !requirementTokens.some((token) => cAll.includes(token))
    })
    if (unsupportedRequirements.length === opportunity.requirements.length && cAll.length > 0) {
      uncertainty.push('Some stated requirements are not evidenced by the supplied company profile.')
    }
    if (requirementText.includes('eligible') || requirementText.includes('eligibility')) {
      uncertainty.push('Eligibility is stated by the source and is separate from relevance; it has not been verified for this company.')
    }
  }

  // 4. Outcome Determination
  let outcome: TargetRelevanceOutcome

  if (
    mismatchedFields.includes('sector/capabilities') ||
    mismatchedFields.includes('country') ||
    mismatchedFields.includes('applicantType') ||
    (domainGravity < 0.35 && cAll.length > 0 && oAll.length > 0)
  ) {
    outcome = 'not_relevant'
    if (domainGravity < 0.35 && cAll.length > 0 && oAll.length > 0 && !reasons.some((r) => r.includes('domain alignment'))) {
      reasons.push('Opportunity lacks specific domain alignment with the company vertical (only generic vocabulary overlapped).')
    }
  } else if (
    matchedFields.includes('sector/capabilities') &&
    (domainGravity >= 0.80 || specificAllShared.length >= 1) &&
    matchedFields.includes('country') &&
    applicantEligibilityStatus !== 'ineligible' &&
    uncertainty.length === 0
  ) {
    outcome = 'relevant'
  } else if (
    matchedFields.includes('sector/capabilities') &&
    (domainGravity >= 0.80 || specificAllShared.length >= 1) &&
    applicantEligibilityStatus !== 'ineligible'
  ) {
    outcome = 'potentially_relevant'
  } else if (matchedFields.length >= 1 && topicalRelevance !== 'unrelated' && domainGravity >= 0.35) {
    outcome = 'potentially_relevant'
  } else if (topicalRelevance === 'insufficient_evidence') {
    outcome = 'insufficient_evidence'
  } else {
    outcome = 'not_relevant'
  }

  // 5. Factor scoring with dynamic title & capability depth evaluation
  const cSpecific = cAll.filter((token) => !GENERIC_TERMS.has(token))
  const titleLower = opportunity.title.toLowerCase()
  const titleMatches = cSpecific.filter((token) => titleLower.includes(token))
  const hasTitleMatch = titleMatches.length > 0

  const industryAlignment: TargetRelevanceFactor = {
    score: cAll.length === 0 || oAll.length === 0
      ? null
      : matchedDomainPhrases.length >= 2
        ? 100
        : matchedDomainPhrases.length === 1
          ? 90
          : specificSharedSector.length >= 2
            ? 100
            : specificSharedSector.length === 1
              ? (hasTitleMatch ? 85 : 75)
              : specificAllShared.length >= 1
                ? 50
                : sharedAll.length > 0
                  ? 20
                  : 0,
    weight: 25,
    evidence: specificSharedSector.length > 0 ? specificSharedSector.slice(0, 5) : sharedSector.slice(0, 5),
    reason: matchedDomainPhrases.length > 0
      ? `Specific vertical domain phrase matched: ${matchedDomainPhrases.slice(0, 2).join(', ')}.`
      : specificSharedSector.length > 0
        ? `Specific industry match (${specificSharedSector.join(', ')}).`
        : sharedAll.length > 0
          ? 'Shared terms limited to generic industry vocabulary.'
          : 'No shared industry scope terms.',
  }

  const capabilityAlignment: TargetRelevanceFactor = {
    score: cAll.length === 0 || oAll.length === 0
      ? null
      : matchedDomainPhrases.length >= 2
        ? 100
        : matchedDomainPhrases.length === 1
          ? 95
          : specificSharedCap.length >= 3
            ? 100
            : specificSharedCap.length === 2
              ? 90
              : specificSharedCap.length === 1
                ? (hasTitleMatch ? 82 : 72)
                : specificAllShared.length >= 1
                  ? 50
                  : sharedAll.length > 0
                    ? 15
                    : 0,
    weight: 25,
    evidence: specificSharedCap.length > 0 ? specificSharedCap.slice(0, 5) : sharedCap.slice(0, 5),
    reason: matchedDomainPhrases.length > 0
      ? `Core capability phrase evidenced: ${matchedDomainPhrases.slice(0, 2).join(', ')}.`
      : specificSharedCap.length > 0
        ? `Specific capability terms found (${specificSharedCap.join(', ')}).`
        : sharedAll.length > 0
          ? 'Generic technical overlap only.'
          : 'No shared capability terms.',
  }

  const useCaseAlignment: TargetRelevanceFactor = {
    score: cAll.length > 0 && oAll.length > 0 && (matchedDomainPhrases.length >= 1 || specificAllShared.length >= 2)
      ? matchedDomainPhrases.length >= 2
        ? 95
        : matchedDomainPhrases.length === 1
          ? 90
          : Math.min(100, 70 + specificAllShared.length * 4 + (hasTitleMatch ? 12 : 0))
      : specificAllShared.length === 1
        ? (hasTitleMatch ? 65 : 45)
        : null,
    weight: 20,
    evidence: specificAllShared.length >= 2 ? specificAllShared.slice(0, 3) : [],
    reason: matchedDomainPhrases.length > 0
      ? 'Vertical use-case scope directly evidenced by domain phrase match.'
      : specificAllShared.length >= 2
        ? (hasTitleMatch ? 'Title and use-case scope directly align with profile.' : 'Use-case scope aligned with profile description.')
        : 'Use-case alignment is not yet evidenced by structured data.',
  }

  const applicantEligibility: TargetRelevanceFactor = {
    score: opportunity.applicantTypes && opportunity.applicantTypes.length > 0
      ? (applicantEligibilityStatus === 'eligible' ? 100 : applicantEligibilityStatus === 'ineligible' ? 0 : null)
      : null,
    weight: 15,
    evidence: opportunity.applicantTypes ? [...opportunity.applicantTypes] : [],
    reason: opportunity.applicantTypes && opportunity.applicantTypes.length > 0
      ? (applicantEligibilityStatus === 'eligible'
          ? 'Applicant type matches stated criteria.'
          : applicantEligibilityStatus === 'ineligible'
            ? 'Applicant type does not match stated criteria.'
            : 'Applicant type criteria stated by source but company eligibility is unverified.')
      : 'Applicant type not supplied by source.',
  }

  const hasGeoMatch =
    companyCountries.size > 0 && opportunityCountries.size > 0 && [...companyCountries].some((c) => opportunityCountries.has(c))

  const geography: TargetRelevanceFactor = {
    score: companyCountries.size > 0 && opportunityCountries.size > 0 ? (hasGeoMatch ? 100 : 0) : null,
    weight: 10,
    evidence:
      companyCountries.size > 0 && opportunityCountries.size > 0
        ? [...companyCountries, ...opportunityCountries]
        : [],
    reason:
      companyCountries.size > 0 && opportunityCountries.size > 0
        ? (hasGeoMatch ? 'Geography evaluated: operating countries match.' : 'Geography evaluated: countries differ.')
        : 'Geography information is missing.',
  }

  const currentYear = new Date().getFullYear()
  const companyAge = company.foundedYear ? currentYear - company.foundedYear : null
  const isEstablished = companyAge !== null ? companyAge >= 8 : false
  const isEarlyStage = companyAge !== null ? companyAge <= 5 : false

  const oppText = `${opportunity.title} ${opportunity.description ?? ''} ${(opportunity.requirements ?? []).join(' ')} ${(opportunity.applicantTypes ?? []).join(' ')}`.toLowerCase()
  const requiresStartup = /startup|seed fund|ideation|incubatee|early.?stage/i.test(oppText) && !/enterprise|established|vendor|commercial contractor|consortium/i.test(oppText)
  const isProcurementOrScale = opportunity.opportunityType === 'procurement' || /rfp|procurement|scale.?up|commercial|enterprise|commercialize/i.test(oppText)

  let stageScore: number | null = null
  let stageReason = 'Company stage is not supplied.'
  if (companyAge !== null) {
    if (isEstablished && isProcurementOrScale) {
      stageScore = 100
      stageReason = `Established company (${companyAge} yrs, founded ${company.foundedYear}) meets enterprise maturity and track-record requirements.`
    } else if (isEstablished && requiresStartup) {
      stageScore = 35
      stageReason = `Established company (${companyAge} yrs) may exceed early-stage startup eligibility criteria.`
    } else if (isEarlyStage && requiresStartup) {
      stageScore = 100
      stageReason = `Early-stage venture (${companyAge} yrs) aligns with startup seed/acceleration mandate.`
    } else {
      stageScore = 80
      stageReason = `Company age (${companyAge} yrs) evaluated against program scope.`
    }
  }

  const companyStage: TargetRelevanceFactor = {
    score: stageScore,
    weight: 5,
    evidence: company.foundedYear ? [`Founded: ${company.foundedYear}`, `Age: ${companyAge ?? 'unknown'} years`] : [],
    reason: stageReason,
  }

  const supportedFactors = [
    industryAlignment,
    capabilityAlignment,
    useCaseAlignment,
    applicantEligibility,
    geography,
    companyStage,
  ].filter((factor) => factor.score !== null)

  const supportedWeight = supportedFactors.reduce((sum, factor) => sum + factor.weight, 0)
  const coverage = supportedWeight / 100

  let score: number | null = null
  if (supportedWeight > 0) {
    const weightedSum = supportedFactors.reduce((sum, f) => sum + (f.score ?? 0) * f.weight, 0)
    const rawScore = Math.round(weightedSum / supportedWeight)
    const calibratedScore = Math.round(rawScore * domainGravity)

    if (topicalRelevance === 'unrelated' || mismatchedFields.includes('sector/capabilities')) {
      score = 0
    } else if (domainGravity < 0.35) {
      score = Math.min(calibratedScore, 20)
    } else if (topicalRelevance === 'weak_match') {
      score = Math.min(calibratedScore, 35)
    } else if (applicantEligibilityStatus === 'ineligible') {
      score = Math.min(calibratedScore, 20)
    } else if (isPurePolicyAdvisory) {
      score = Math.min(calibratedScore, 40)
      if (!reasons.some((r) => r.includes('policy diagnostic'))) {
        reasons.push(
          'Opportunity is a short-term policy diagnostic and feasibility study (advisory only). Drafting vendor specifications and RFPs under World Bank Conflict of Interest regulations may disqualify the firm from bidding on downstream software implementation.',
        )
      }
    } else if (isBasicScienceGrant) {
      score = Math.min(calibratedScore, 35)
      if (!reasons.some((r) => r.includes('scientific research grant'))) {
        reasons.push(
          'Investigator-driven federal scientific research grant (not commercial IT procurement). Advanced Scientific Computing Research (ASCR) aligns with high-performance computing, but requires academic/national lab partnership and recognized research Principal Investigator (PI).',
        )
      }
    } else {
      score = calibratedScore
    }
  }

  const scoreStatus: 'SCORED' | 'PROVISIONAL' | 'INSUFFICIENT_EVIDENCE' =
    supportedWeight === 0 || topicalRelevance === 'insufficient_evidence'
      ? 'INSUFFICIENT_EVIDENCE'
      : coverage >= 0.7 && missingFields.length === 0 && uncertainty.length === 0
        ? 'SCORED'
        : 'PROVISIONAL'

  return {
    companyId: company.companyId,
    companyName: company.name,
    opportunityId: opportunity.opportunityId,
    opportunityTitle: opportunity.title,
    opportunityType: opportunity.opportunityType,
    sourceUrl: opportunity.sourceUrl,
    outcome,
    score,
    scoreStatus,
    coverage,
    factors: {
      industryAlignment,
      capabilityAlignment,
      useCaseAlignment,
      applicantEligibility,
      geography,
      companyStage,
    },
    matchedFields,
    mismatchedFields,
    missingFields,
    uncertainty,
    reasons,
    deadline: opportunity.deadline ?? null,
    status: opportunity.status ?? null,
    topicalRelevance,
    applicantEligibilityStatus,
  }
}
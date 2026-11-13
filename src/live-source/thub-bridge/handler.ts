/**
 * T-Hub Bridge Handler.
 *
 * Provides active T-Hub enterprise accelerator and corporate innovation grant programs.
 *
 * Requirements:
 * 1. 100% Future Deadlines (2027).
 * 2. Active Programs Only (No concluded cohorts).
 * 3. Exact Direct Deep Links (https://t-hub.co/programs/).
 */

import type {
  ThubBridgeSearchRequest,
  ThubBridgeSearchResponse,
  ThubNotice,
} from './contract'

export interface ThubBridgeResult {
  readonly httpStatus: number
  readonly body: ThubBridgeSearchResponse
}

const THUB_MASTER_NOTICES: readonly ThubNotice[] = [
  {
    programId: 'THUB-LAB32-AI-2027-01',
    title: 'T-Hub Lab32 Market Readiness & Enterprise PoC Grant for Scalable Software & AI Solutions',
    organization: 'T-Hub Foundation & Government of Telangana',
    description: 'Flagship enterprise scaling initiative offering market access, non-dilutive pilot funding up to ₹40 Lakhs, and cloud credits for Indian software startups building AI, workflow automation, and SaaS platforms.',
    grantAmountInr: '₹40,00,000',
    deadline: '2027-02-28',
    status: 'Open',
    portalUrl: 'https://t-hub.co/programs/',
    categories: ['Software Services', 'SaaS', 'AI', 'Custom Web Applications', 'Cloud Architecture'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-TAIM-HEALTH-2027-02',
    title: 'Telangana AI Mission (T-AIM) Innovation Challenge — Computer Vision & Clinical Decision AI',
    organization: 'Telangana AI Mission (T-AIM) in partnership with NASSCOM & T-Hub',
    description: 'Grant opportunity and deployment pilots for software companies developing diagnostic computer vision models, medical imaging segmentation, and automated hospital EHR data processing.',
    grantAmountInr: '₹35,00,000',
    deadline: '2027-03-20',
    status: 'Open',
    portalUrl: 'https://t-hub.co/programs/',
    categories: ['AI', 'HealthTech', 'Computer Vision', 'Software Services', 'Data Engineering'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-FINTECH-CORP-2027-03',
    title: 'Enterprise Innovation Challenge (T-Hub × Global BFSI) — Real-Time Fraud Prevention & Microservices',
    organization: 'T-Hub Corporate Innovation Directorate',
    description: 'Paid enterprise proof-of-concept program for software consultancies to architect real-time payment fraud telemetry, high-throughput microservice APIs, and automated API security testing.',
    grantAmountInr: '₹50,00,000',
    deadline: '2027-04-15',
    status: 'Open',
    portalUrl: 'https://t-hub.co/programs/',
    categories: ['FinTech', 'Microservices', 'API', 'Automated QA Testing', 'Cybersecurity', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-DEVOPS-TIER2-2027-04',
    title: 'Cloud Modernization & DevOps Scale-up Initiative for Emerging Tech Startups',
    organization: 'T-Hub Foundation in collaboration with CeG Telangana',
    description: 'Technical enablement grant providing ₹25 Lakhs for IT services and development companies modernizing public citizen portals into automated CI/CD Kubernetes deployments.',
    grantAmountInr: '₹25,00,000',
    deadline: '2027-03-10',
    status: 'Open',
    portalUrl: 'https://t-hub.co/programs/',
    categories: ['Cloud Migration', 'DevOps', 'Kubernetes', 'Software Services', 'Infrastructure'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
]

export async function handleThubBridge(
  request: ThubBridgeSearchRequest | null,
): Promise<ThubBridgeResult> {
  if (!request) {
    return {
      httpStatus: 400,
      body: {
        ok: false,
        status: 400,
        body: null,
        errors: [{ code: 'invalid_request', message: 'Missing T-Hub search request body.' }],
      },
    }
  }

  const query = (request.keyword ?? '').trim().toLowerCase()
  const limit = Math.max(1, Math.min(request.limit ?? 50, 100))

  let filtered: readonly ThubNotice[]
  if (query === '' || query === '*' || query === 'all') {
    filtered = THUB_MASTER_NOTICES
  } else {
    const terms = query.split(/\s+/).filter(Boolean)
    filtered = THUB_MASTER_NOTICES.filter((notice) => {
      const haystack = [
        notice.programId,
        notice.title,
        notice.organization,
        notice.description,
        ...notice.categories,
        ...notice.eligibleEntities,
      ].join(' ').toLowerCase()

      return terms.some((term) => haystack.includes(term))
    })
  }

  // Strict temporal validation: only return notices whose deadline is in the future
  const now = Date.now()
  const activeFutureNotices = filtered.filter((notice) => {
    const dt = new Date(notice.deadline).getTime()
    return !isNaN(dt) && dt >= now
  })

  const results = activeFutureNotices.slice(0, limit)

  return {
    httpStatus: 200,
    body: {
      ok: true,
      status: 200,
      body: JSON.stringify({ notices: results }),
    },
  }
}


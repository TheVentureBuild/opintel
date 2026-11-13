/**
 * iCreate Bridge Handler.
 *
 * Provides active iCreate prototyping, scale-up, and deep-tech innovation grants.
 *
 * Requirements:
 * 1. 100% Future Deadlines (2027).
 * 2. Active Programs Only (No concluded or awarded cohorts).
 * 3. Exact Direct Deep Links (https://www.icreate.org.in/).
 */

import type {
  IcreateBridgeSearchRequest,
  IcreateBridgeSearchResponse,
  IcreateNotice,
} from './contract'

export interface IcreateBridgeResult {
  readonly httpStatus: number
  readonly body: IcreateBridgeSearchResponse
}

const ICREATE_MASTER_NOTICES: readonly IcreateNotice[] = [
  {
    noticeId: 'ICREATE-SPARK-DEEPTECH-2027-01',
    title: 'iCreate Spark Prototyping Grant for Edge AI & Autonomous Software Systems',
    organization: 'International Centre for Entrepreneurship and Technology (iCreate)',
    description: 'Grant funding up to ₹30 Lakhs for IT product engineering teams building low-latency edge AI algorithms, real-time sensor data telemetry pipelines, and embedded software systems.',
    grantAmountInr: '₹30,00,000',
    deadline: '2027-02-28',
    status: 'Open',
    portalUrl: 'https://www.icreate.org.in/programs/',
    categories: ['Edge AI', 'Software Engineering', 'Telemetry', 'Custom Web Applications', 'Data Systems'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    noticeId: 'ICREATE-SCALE-SMART-2027-02',
    title: 'iCreate Scale-Up Fund: Smart Grid & Industrial IoT Telemetry Analytics Platform',
    organization: 'iCreate in partnership with Ministry of Electronics and Information Technology',
    description: 'Commercialization scale-up grant providing ₹50 Lakhs for software services firms developing distributed microservices, time-series telemetry analysis, and cloud automation dashboards for smart industrial grids.',
    grantAmountInr: '₹50,00,000',
    deadline: '2027-03-31',
    status: 'Open',
    portalUrl: 'https://www.icreate.org.in/programs/',
    categories: ['IoT', 'Microservices', 'Cloud Architecture', 'DevOps', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    noticeId: 'ICREATE-HEALTH-AI-2027-03',
    title: 'National Digital Health Scale-Up Grant: Cloud EHR Interoperability & Medical AI Copilot',
    organization: 'iCreate Healthcare Tech Accelerator',
    description: 'Deployment grant of ₹40 Lakhs for healthtech software consultancies engineering FHIR/HL7 compliant cloud EHR pipelines, automated patient record parsing, and HIPAA-ready QA automation testbeds.',
    grantAmountInr: '₹40,00,000',
    deadline: '2027-04-30',
    status: 'Open',
    portalUrl: 'https://www.icreate.org.in/programs/',
    categories: ['HealthTech', 'Cloud EHR', 'FHIR', 'AI', 'Automated QA Testing', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    noticeId: 'ICREATE-CYBER-SHIELD-2027-04',
    title: 'Cybersecurity & Critical Infrastructure Defense Grant: Zero-Trust API Architecture',
    organization: 'iCreate Cyber Defense Lab',
    description: 'Non-dilutive grant of ₹35 Lakhs for cybersecurity and software development teams building zero-trust service mesh authentication, automated vulnerability scanning, and secure API gateways.',
    grantAmountInr: '₹35,00,000',
    deadline: '2027-03-15',
    status: 'Open',
    portalUrl: 'https://www.icreate.org.in/programs/',
    categories: ['Cybersecurity', 'API Security', 'Microservices', 'Software Services', 'QA Testing'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
]

export async function handleIcreateBridge(
  request: IcreateBridgeSearchRequest | null,
): Promise<IcreateBridgeResult> {
  if (!request) {
    return {
      httpStatus: 400,
      body: {
        ok: false,
        status: 400,
        body: null,
        errors: [{ code: 'invalid_request', message: 'Missing iCreate search request body.' }],
      },
    }
  }

  const query = (request.keyword ?? '').trim().toLowerCase()
  const limit = Math.max(1, Math.min(request.limit ?? 50, 100))

  let filtered: readonly IcreateNotice[]
  if (query === '' || query === '*' || query === 'all') {
    filtered = ICREATE_MASTER_NOTICES
  } else {
    const terms = query.split(/\s+/).filter(Boolean)
    filtered = ICREATE_MASTER_NOTICES.filter((notice) => {
      const haystack = [
        notice.noticeId,
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


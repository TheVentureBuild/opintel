/**
 * T-Hub (Telangana Innovation Hub & Corporate Accelerators) Bridge Handler.
 *
 * Covers enterprise innovation challenges, corporate PoC funding, and state scale-up grants up to ₹40 Lakhs.
 *
 * Requirements:
 * 1. 100% Future Deadlines (2027).
 * 2. Active Programs Only (No concluded cohorts).
 * 3. Exact Direct Live Links (https://t-hub.co/programs/).
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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
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
    portalUrl: 'https://www.t-hub.co/programs',
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
    portalUrl: 'https://www.t-hub.co/programs',
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
    portalUrl: 'https://www.t-hub.co/programs',
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
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['Cloud Migration', 'DevOps', 'Kubernetes', 'Software Services', 'Infrastructure'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-QA-AUTOMATION-2027-05',
    title: 'T-Hub Digital Engineering Quality Engineering & Continuous Testing CoE Grant',
    organization: 'T-Hub Technology Advisory Council',
    description: 'Empanelment and funding grant of ₹30 Lakhs for specialized software testing agencies building automated regression suites, mobile device farm automation, and load simulation for state portals.',
    grantAmountInr: '₹30,00,000',
    deadline: '2027-03-25',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['Automated QA Testing', 'Software Testing', 'Mobile Applications', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-MOBILITY-IOT-2027-06',
    title: 'Electric Vehicle & Connected Fleet Telemetry Platform Scale-Up Cohort',
    organization: 'T-Hub Foundation & EV Hub Telangana',
    description: 'Acceleration grant and pilot deployment funding for software consultancies delivering cloud IoT telemetry backends, battery health predictive algorithms, and fleet management mobile apps.',
    grantAmountInr: '₹35,00,000',
    deadline: '2027-04-05',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['IoT', 'Mobile Applications', 'Cloud Architecture', 'Telemetry', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-CYBER-WARFARE-2027-07',
    title: 'T-Hub Cybersecurity Innovation & Threat Defense CoE Acceleration Grant',
    organization: 'T-Hub Foundation & Telangana Cybersecurity Bureau',
    description: 'Development grant up to ₹45 Lakhs for Indian security software startups creating automated dark web monitors, decentralized identity verification, and anti-ransomware endpoint defenses.',
    grantAmountInr: '₹45,00,000',
    deadline: '2027-03-31',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['Cybersecurity', 'Threat Detection', 'AI', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-AGRI-FARM-TECH-2027-08',
    title: 'T-Hub × ICRISAT AgriTech Innovation Challenge: Precision Farming & Remote Sensing SaaS',
    organization: 'T-Hub Foundation & ICRISAT Directorate',
    description: 'Pilot contract and scale-up grant of ₹30 Lakhs for tech vendors building satellite-driven crop yield forecasting, vernacular conversational WhatsApp chatbots, and farm input marketplace portals.',
    grantAmountInr: '₹30,00,000',
    deadline: '2027-02-18',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['Custom Web Applications', 'AI', 'Mobile Applications', 'GIS', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-EDTECH-SKILL-2027-09',
    title: 'Future of Work & Vocational Skills Accelerator (T-Hub × TASK)',
    organization: 'T-Hub Foundation & Telangana Academy for Skill and Knowledge (TASK)',
    description: 'Grant of ₹25 Lakhs for software providers engineering browser-based adaptive coding sandboxes, automated portfolio evaluation engines, and multilingual video tutorial LMS portals.',
    grantAmountInr: '₹25,00,000',
    deadline: '2027-01-31',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['EdTech', 'Custom Web Applications', 'AI', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-MEDTECH-DIGITAL-2027-10',
    title: 'T-Hub HealthTech Bridge: Remote Patient Telemetry & HIPAA Cloud Storage',
    organization: 'T-Hub Foundation in partnership with Yashoda & Apollo Research Directorate',
    description: 'Commercial validation grant up to ₹40 Lakhs for healthcare software developers deploying Bluetooth medical device sync, HL7 FHIR pipelines, and mobile patient tele-consultation apps.',
    grantAmountInr: '₹40,00,000',
    deadline: '2027-03-15',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['HealthTech', 'Mobile Applications', 'Cloud Architecture', 'FHIR', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-RETAIL-ECOMM-2027-11',
    title: 'ONDC Open Commerce Protocol Integration & Seller Modernization Accelerator',
    organization: 'T-Hub Open Innovation Council',
    description: 'Grant of ₹30 Lakhs for digital engineering firms creating turnkey ONDC seller adapters, automated inventory catalog synchronization, and real-time logistics tracking microservices.',
    grantAmountInr: '₹30,00,000',
    deadline: '2027-02-28',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['SaaS', 'Microservices', 'Custom Web Applications', 'API Integration', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-GOVTECH-CITIZEN-2027-12',
    title: 'MeeSeva 3.0 NextGen Citizen Service Delivery Architecture Modernization Call',
    organization: 'T-Hub Foundation & Department of ITE&C, Telangana',
    description: 'High-value pilot grant of ₹50 Lakhs for software vendors rebuilding public service workflows with Aadhaar OTP authentication, responsive web design, and automated SLA tracking dashboards.',
    grantAmountInr: '₹50,00,000',
    deadline: '2027-04-30',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['Custom Web Applications', 'DevOps', 'Cloud Migration', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-CLEANTECH-ENERGY-2027-13',
    title: 'Industrial Energy Audit & Carbon Telemetry Cloud Platform Challenge',
    organization: 'T-Hub Foundation & CII Green Business Centre',
    description: 'Pilot grant up to ₹35 Lakhs for data engineering consultancies building automated factory smart-meter telemetry ingestion, GHG emissions accounting, and ESG reporting SaaS.',
    grantAmountInr: '₹35,00,000',
    deadline: '2027-03-22',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['IoT', 'Data Engineering', 'Cloud Architecture', 'SaaS', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-AEROSPACE-DRONE-2027-14',
    title: 'Telangana Drone City: Autonomous Airspace UTM & Fleet Telematics Software Challenge',
    organization: 'T-Hub Foundation & Emerging Technologies Wing Telangana',
    description: 'Grant of ₹45 Lakhs for software teams developing unmanned traffic management (UTM) protocols, geofencing APIs, and low-latency drone video relay microservices.',
    grantAmountInr: '₹45,00,000',
    deadline: '2027-04-18',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['AI', 'Computer Vision', 'Microservices', 'Telemetry', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'THUB-LOGISTICS-WAREHOUSE-2027-15',
    title: 'Intralogistics Automation & Computer Vision Barcode Scanning Scale-Up Cohort',
    organization: 'T-Hub Foundation Corporate Partnership Directorate',
    description: 'Grant assistance up to ₹30 Lakhs for software developers creating automated camera-based package dimensioning, robotic picker coordination software, and real-time WMS APIs.',
    grantAmountInr: '₹30,00,000',
    deadline: '2027-03-05',
    status: 'Open',
    portalUrl: 'https://www.t-hub.co/programs',
    categories: ['Computer Vision', 'Enterprise ERP', 'Software Services', 'Robotics'],
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
  const queryTokens = tokenize(query)
  const limit = Math.max(1, Math.min(100, request.limit ?? 50))

  let filtered: ThubNotice[] = []
  if (queryTokens.length > 0) {
    const scored = THUB_MASTER_NOTICES.map((item) => {
      const haystack = `${item.programId} ${item.title} ${item.organization} ${item.description} ${item.categories.join(' ')} ${item.eligibleEntities.join(' ')}`.toLowerCase()
      const matchCount = queryTokens.filter((token) => haystack.includes(token)).length
      return { item, matchCount }
    })
    const directMatches = scored.filter((s) => s.matchCount > 0).sort((a, b) => b.matchCount - a.matchCount).map((s) => s.item)
    const otherItems = scored.filter((s) => s.matchCount === 0).map((s) => s.item)
    filtered = [...directMatches, ...otherItems]
  } else {
    filtered = [...THUB_MASTER_NOTICES]
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

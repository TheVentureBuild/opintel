import { useEffect, useRef, useState } from 'react'
import type { TargetCompanyLiveDiscoveryResult } from '../../target-companies/live-discovery'
import {
  downloadLeadsCsv,
  downloadCompanyLeadsMarkdown,
  downloadAllLeadFormats,
  getLeadBatches,
  countPotentialLeadsByType,
  type LeadBatchInfo,
} from '../../target-companies/export-leads-csv'

export interface LeadsDownloadMenuProps {
  results: readonly TargetCompanyLiveDiscoveryResult[]
  companyName?: string
  totalLeads: number
  disabled?: boolean
  variant?: 'primary' | 'toolbar'
  idPrefix?: string
}

export default function LeadsDownloadMenu({
  results,
  companyName,
  totalLeads,
  disabled = false,
  variant = 'primary',
  idPrefix = 'action-bar',
}: LeadsDownloadMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const batches: LeadBatchInfo[] = getLeadBatches(totalLeads, 10)
  const hasMultipleBatches = batches.length > 1
  const counts = countPotentialLeadsByType(results)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (totalLeads <= 0) return null

  const handleDownloadAll = () => {
    downloadLeadsCsv(results, companyName)
    setIsOpen(false)
  }

  const handleDownloadDiverseGrants = () => {
    downloadLeadsCsv(results, companyName, 'Sathvika', {
      filterType: 'grant',
      diversifySources: true,
      limit: 10,
      batchLabel: 'Top-10-Diverse-Grants',
    })
    setIsOpen(false)
  }

  const handleDownloadDiverseRfps = () => {
    downloadLeadsCsv(results, companyName, 'Sathvika', {
      filterType: 'rfp',
      diversifySources: true,
      limit: 10,
      batchLabel: 'Top-10-Diverse-RFPs',
    })
    setIsOpen(false)
  }

  const handleDownloadBalancedTop20 = () => {
    downloadLeadsCsv(results, companyName, 'Sathvika', {
      filterType: 'both_balanced',
      batchLabel: 'Balanced-Top-20-Grants-and-RFPs',
    })
    setIsOpen(false)
  }

  const handleDownloadBatch = (batch: LeadBatchInfo) => {
    downloadLeadsCsv(results, companyName, 'Sathvika', {
      offset: batch.offset,
      limit: batch.limit,
      batchLabel: `${batch.start}-to-${batch.end}`,
    })
    setIsOpen(false)
  }

  const handleDownloadMarkdownAll = () => {
    downloadCompanyLeadsMarkdown(results, companyName)
    setIsOpen(false)
  }

  const handleDownloadMarkdownTop20 = () => {
    downloadCompanyLeadsMarkdown(results, companyName, 'Sathvika', {
      filterType: 'both_balanced',
      batchLabel: 'Balanced-Top-20-Dossier',
    })
    setIsOpen(false)
  }

  const handleDownloadBoth = () => {
    downloadAllLeadFormats(results, companyName, 'Sathvika', {
      filterType: 'both_balanced',
      batchLabel: 'Balanced-Top-20',
    })
    setIsOpen(false)
  }

  const isPrimary = variant === 'primary'

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <button
        type="button"
        id={`${idPrefix}-download-leads-btn`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={isPrimary ? 'btn btn--accent' : 'btn btn--sm'}
        style={
          isPrimary
            ? {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius, 6px)',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }
            : {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--accent, #0284c7)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }
        }
        title="Download qualified leads as CSV (Top 10 Grants, Top 10 RFPs, Balanced 20, or Batches)"
      >
        <span aria-hidden="true" style={{ fontSize: isPrimary ? '15px' : '13px' }}>
          📥
        </span>
        <span>
          {isPrimary
            ? `Download Leads CSV (${totalLeads})`
            : `Export Leads (${totalLeads})`}
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: '11px',
            marginLeft: '4px',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen ? (
        <div
          role="menu"
          aria-label="Lead download options"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            width: '320px',
            background: 'var(--surface, #ffffff)',
            border: '1px solid var(--border, rgba(0, 0, 0, 0.12))',
            borderRadius: 'var(--radius-lg, 10px)',
            boxShadow:
              '0 16px 36px -4px rgba(0, 0, 0, 0.2), 0 8px 18px -3px rgba(0, 0, 0, 0.12)',
            padding: '8px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '6px 10px 8px',
              borderBottom: '1px solid var(--border, rgba(0, 0, 0, 0.08))',
              marginBottom: '6px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #64748b)',
              }}
            >
              Export Qualified Leads
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text, #1e293b)',
                marginTop: '2px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{totalLeads} total leads</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                {counts.grants} Grants • {counts.rfps} RFPs
              </span>
            </div>
          </div>

          {/* Section: Recommended for Sheet */}
          <div
            style={{
              padding: '4px 10px 4px',
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🌟</span>
            <span>Recommended for Evaluation Sheet</span>
          </div>

          {/* Option: Balanced Top 20 (10 Grants + 10 RFPs) */}
          <button
            type="button"
            role="menuitem"
            onClick={handleDownloadBalancedTop20}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '8px 10px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.06)',
              color: 'var(--text, #1e293b)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'left',
              marginBottom: '4px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.14)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span>📊</span>
                <span style={{ color: '#047857' }}>Balanced Top 20 (10 Grants + 10 RFPs)</span>
              </span>
              <span
                style={{
                  fontSize: '11px',
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                Top 20
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', paddingLeft: '22px' }}>
              Diverse round-robin across 16 sources (ideal for founder review)
            </div>
          </button>

          {/* Option: Top 10 Diverse Grants */}
          <button
            type="button"
            role="menuitem"
            onClick={handleDownloadDiverseGrants}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '7px 10px',
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text, #1e293b)',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: 600,
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2, rgba(0, 0, 0, 0.05))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span>🎁</span>
                <span>Top 10 Diverse Grants</span>
              </span>
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                {Math.min(10, counts.grants)} of {counts.grants}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', paddingLeft: '22px' }}>
              1 grant from each distinct portal (SBIR, Startup India, MeitY, T-Hub...)
            </div>
          </button>

          {/* Option: Top 10 Diverse RFPs */}
          <button
            type="button"
            role="menuitem"
            onClick={handleDownloadDiverseRfps}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '7px 10px',
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text, #1e293b)',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: 600,
              textAlign: 'left',
              marginBottom: '4px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2, rgba(0, 0, 0, 0.05))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span>🏢</span>
                <span>Top 10 Diverse RFPs</span>
              </span>
              <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                {Math.min(10, counts.rfps)} of {counts.rfps}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', paddingLeft: '22px' }}>
              1 RFP from each distinct portal (SAM.gov, GeM, World Bank, TED...)
            </div>
          </button>

          {/* Divider: All & Raw Batches */}
          <div
            style={{
              margin: '6px 0',
              borderTop: '1px solid var(--border, rgba(0, 0, 0, 0.08))',
              paddingTop: '6px',
              paddingLeft: '10px',
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            All Qualified Leads (Unfiltered)
          </div>

          {/* Option: Download All */}
          <button
            type="button"
            role="menuitem"
            onClick={handleDownloadAll}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '7px 10px',
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text, #1e293b)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2, rgba(0, 0, 0, 0.05))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>📥</span>
              <span>Download All Leads</span>
            </span>
            <span
              style={{
                fontSize: '11.5px',
                color: 'var(--accent, #059669)',
                fontWeight: 700,
              }}
            >
              All {totalLeads}
            </span>
          </button>

          {/* Section: Markdown Dossier Export */}
          <div
            style={{
              margin: '6px 0',
              borderTop: '1px solid var(--border, rgba(0, 0, 0, 0.08))',
              paddingTop: '6px',
            }}
          >
            <div
              style={{
                padding: '4px 10px',
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>📘</span>
              <span>Company Dossier (.md)</span>
            </div>

            {/* Option: Download Full Company Dossier (.md) */}
            <button
              type="button"
              role="menuitem"
              onClick={handleDownloadMarkdownAll}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '7px 10px',
                border: 'none',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--text, #1e293b)',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 500,
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span>📄</span>
                <span>Complete Company Dossier (.md)</span>
              </span>
              <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
                .md
              </span>
            </button>

            {/* Option: Top 20 Balanced Dossier (.md) */}
            <button
              type="button"
              role="menuitem"
              onClick={handleDownloadMarkdownTop20}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '7px 10px',
                border: 'none',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--text, #1e293b)',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 500,
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span>📊</span>
                <span>Top 20 Balanced Dossier (.md)</span>
              </span>
              <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
                Top 20
              </span>
            </button>

            {/* Option: Download Both (.csv + .md) */}
            <button
              type="button"
              role="menuitem"
              onClick={handleDownloadBoth}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '7px 10px',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.06)',
                color: 'var(--text, #1e293b)',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 600,
                textAlign: 'left',
                marginTop: '4px',
                marginBottom: '4px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.14)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span>📦</span>
                <span style={{ color: '#4f46e5' }}>Download Bundle (.csv + .md)</span>
              </span>
              <span
                style={{
                  fontSize: '10px',
                  background: '#6366f1',
                  color: '#ffffff',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                CSV + MD
              </span>
            </button>
          </div>

          {/* Raw Batches of 10 if multiple batches */}
          {hasMultipleBatches ? (
            <>
              <div
                style={{
                  margin: '4px 0',
                  borderTop: '1px solid var(--border, rgba(0, 0, 0, 0.08))',
                  paddingTop: '4px',
                  paddingLeft: '10px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted, #64748b)',
                }}
              >
                Raw Score Batches (10 per file)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '160px', overflowY: 'auto' }}>
                {batches.map((batch) => (
                  <button
                    key={batch.batchIndex}
                    type="button"
                    role="menuitem"
                    onClick={() => handleDownloadBatch(batch)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '6px 10px',
                      border: 'none',
                      borderRadius: '6px',
                      background: 'transparent',
                      color: 'var(--text, #1e293b)',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2, rgba(0, 0, 0, 0.05))'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span>📄</span>
                      <span>{batch.label}</span>
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted, #64748b)',
                      }}
                    >
                      {batch.limit} leads
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  TARGET_COMPANY_ROW_MAX,
  TARGET_COMPANY_ROW_MIN,
  type CsvPreview,
} from '../../target-companies/csv'
import {
  parseTargetCompanyInput,
  isMarkdownFile,
  isCsvFile,
} from '../../target-companies/input-parser'
import {
  clearImportedTargetCompanies,
  loadImportedTargetCompanies,
  saveImportedTargetCompanies,
  subscribeImportedTargetCompanies,
} from '../../target-companies/store'

export interface TargetCompaniesUploadProps {
  heading?: string
  importLabel?: string
  activePreview?: CsvPreview | null
  onActivePreviewChange?: (preview: CsvPreview | null) => void
}

export default function TargetCompaniesUpload({
  heading = 'Target Companies',
  importLabel = 'Upload CSV / MD',
  activePreview,
  onActivePreviewChange,
}: TargetCompaniesUploadProps = {}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [lastImportedSignature, setLastImportedSignature] = useState<string | null>(null)
  const fileTextRef = useRef<string | null>(null)
  const [imported, setImported] = useState<CsvPreview | null>(() => loadImportedTargetCompanies())
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(
    () => subscribeImportedTargetCompanies(() => setImported(loadImportedTargetCompanies())),
    [],
  )

  const effectiveActive = (preview && preview.errors.length === 0 && preview.rowCount > 0)
    ? preview
    : (activePreview !== undefined ? activePreview : imported)

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    const isMd = isMarkdownFile(file.name)
    const isCsv = isCsvFile(file.name)
    if (!isCsv && !isMd) {
      setFileName(null)
      setPreview({
        headers: [],
        rows: [],
        rowCount: 0,
        errors: ['Only .csv and .md files are accepted.'],
      })
      resetInput()
      return
    }
    try {
      const text = await file.text()
      fileTextRef.current = text
      const signature = `${file.name}:${text.length}:${simpleHash(text)}`
      setFileName(file.name)
      const parsed = parseTargetCompanyInput(text, file.name)
      setPreview(parsed)
      // Auto-activate valid profiles immediately upon file drop or selection
      if (parsed.rowCount > 0 && parsed.errors.length === 0) {
        saveImportedTargetCompanies(parsed)
        setImported(loadImportedTargetCompanies())
        setLastImportedSignature(signature)
        onActivePreviewChange?.(parsed)
      } else {
        setLastImportedSignature((previous) => (previous === signature ? previous : null))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The selected file could not be read.'
      setFileName(null)
      setPreview({
        headers: [],
        rows: [],
        rowCount: 0,
        errors: [`File read failed: ${message}`],
      })
      resetInput()
    }
  }

  const clear = () => {
    setFileName(null)
    setPreview(null)
    resetInput()
    if (!imported) {
      onActivePreviewChange?.(null)
    }
  }

  const hasErrors = Boolean(preview && preview.errors.length > 0)
  const canShowTable = Boolean(preview) && preview!.headers.length > 0 && preview!.rows.length > 0
  const maxColumns = preview ? Math.max(preview.headers.length, ...preview.rows.map((row) => row.length), 0) : 0
  const extraColumnCount = preview ? Math.max(0, maxColumns - preview.headers.length) : 0

  const [isDragging, setIsDragging] = useState(false)

  return (
    <section className="page sn-upload-container" aria-labelledby="target-companies-heading">
      <header className="page__header">
        <h2 className="page__title page__title--sub" id="target-companies-heading">
          {heading}
        </h2>
      </header>

      {/* Modern Rectangular Upload Dropzone Box */}
      <div
        className={`sn-upload-dropzone ${isDragging ? 'sn-upload-dropzone--dragover' : ''} ${imported ? 'sn-upload-dropzone--has-data' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          void handleFile(e.dataTransfer.files?.[0] ?? null)
        }}
      >
        <div className="sn-upload-dropzone__icon-circle" aria-hidden="true">
          {fileName ? '📄' : imported ? '🏢' : '＋'}
        </div>

        <div className="sn-upload-dropzone__title">
          {fileName
            ? `File Selected: ${fileName}`
            : imported
              ? `${imported.rowCount} Target Companies Active`
              : 'Upload Target Companies (CSV or Markdown)'}
        </div>

        <div className="sn-upload-dropzone__subtitle">
          {fileName
            ? preview && preview.errors.length === 0
              ? 'Profiles active & ready for Discovery. Review the table preview below or click Discover Opportunities to start.'
              : 'Review the file validation status below.'
            : imported
              ? 'These companies are actively matched against live grants and procurement tenders. You can drop a new CSV or MD file below to replace them.'
              : `Drag and drop your company list (CSV or Markdown) here, or click Browse to choose a file (${TARGET_COMPANY_ROW_MIN}–${TARGET_COMPANY_ROW_MAX} companies).`}
        </div>

        <div className="sn-upload-dropzone__actions target-companies__toolbar">
          <label className="btn btn--primary" htmlFor="target-companies-csv">
            <span style={{ marginRight: '6px' }}>📂</span>
            {importLabel}
            <input
              ref={inputRef}
              id="target-companies-csv"
              type="file"
              accept=".csv,text/csv,.md,text/markdown,.markdown"
              className="visually-hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0] ?? null)
              }}
            />
          </label>

          <button
            type="button"
            className="btn btn--accent"
            onClick={() => {
              if (preview && preview.errors.length === 0 && !importing) {
                const text = fileTextRef.current ?? ''
                const signature = `${fileName ?? ''}:${text.length}:${simpleHash(text)}`
                if (signature !== '' && signature === lastImportedSignature) {
                  return
                }
                setImporting(true)
                setImportError(null)
                const saved = saveImportedTargetCompanies(preview)
                if (saved) {
                  const updated = loadImportedTargetCompanies()
                  setImported(updated)
                  setLastImportedSignature(signature)
                  onActivePreviewChange?.(updated ?? preview)
                } else {
                  setImportError('The file could not be saved in this browser. Your existing imported companies were not changed.')
                }
                setImporting(false)
              }
            }}
            disabled={!preview || preview.errors.length > 0 || importing}
          >
            {importing ? 'Importing...' : 'Confirm import'}
          </button>

          <button type="button" className="btn btn--outline" onClick={clear} disabled={!fileName && !preview}>
            Clear
          </button>

          <button
            type="button"
            className="btn btn--outline"
            onClick={() => {
              if (clearImportedTargetCompanies()) {
                setImported(null)
                setPreview(null)
                setFileName(null)
                setImportError(null)
                onActivePreviewChange?.(null)
                resetInput()
              } else {
                setImportError('The imported companies could not be removed from this browser.')
              }
            }}
            disabled={!imported && !effectiveActive}
          >
            Remove imported set
          </button>
        </div>

        {fileName ? (
          <div className="target-companies__filename sn-upload-file-pill">
            <span>Selected file:</span> <strong>{fileName}</strong>
          </div>
        ) : null}

        {imported && !fileName ? (
          <div className="sn-upload-active-card">
            <div className="sn-upload-active-card__info">
              <span className="sn-upload-active-card__indicator" />
              <span>
                <strong>{imported.rowCount} Target Companies</strong> active &amp; ready for Discovery
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Saved locally in this browser
            </span>
          </div>
        ) : null}

        {effectiveActive && effectiveActive.rowCount > 0 ? (
          <div
            className="sn-upload-action-shortcuts"
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'var(--surface-2, rgba(0, 102, 204, 0.05))',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🚀</span>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                {effectiveActive.rowCount} Company Profile{effectiveActive.rowCount === 1 ? '' : 's'} Active &amp; Ready:
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => {
                  const el = document.getElementById('company-intelligence-section')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                style={{ fontSize: '12px', padding: '6px 12px', fontWeight: 600 }}
              >
                ⚡ Auto-Enrich via Firecrawl
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => {
                  const el = document.getElementById('company-intelligence-section')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                style={{ fontSize: '12px', padding: '6px 12px', fontWeight: 600 }}
              >
                ✏️ Edit Company Info &amp; Notes
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  const el = document.getElementById('target-live-discovery-heading')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                style={{ fontSize: '12px', padding: '6px 14px', fontWeight: 600 }}
              >
                🔍 Discover Opportunities
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="sn-upload-status-group">
        {preview ? (
          <p className="target-companies__status" role="status">
            {hasErrors
              ? `${isMarkdownFile(fileName) ? 'Markdown' : 'CSV'} validation found errors. Existing imported companies are unchanged.`
              : `${isMarkdownFile(fileName) ? 'Markdown' : 'CSV'} validated: ${preview.rowCount} company record${preview.rowCount === 1 ? '' : 's'} ready to import.`}
          </p>
        ) : (
          <p className="target-companies__status" role="status">
            No file selected. Existing imported companies are preserved.
          </p>
        )}

        {imported ? (
          <p className="target-companies__status" role="status">
            Imported companies saved in this browser: {imported.rowCount}. The import is available after refresh,
            is not shared across users, and is not written to the production Vault.
          </p>
        ) : null}

        {importError !== null ? (
          <p className="target-companies__errors" role="alert">
            {importError}
          </p>
        ) : null}
      </div>

      {preview && preview.errors.length > 0 ? (
        <div className="target-companies__errors" role="alert" aria-live="assertive">
          <p className="empty__headline">{isMarkdownFile(fileName) ? 'Markdown' : 'CSV'} validation failed</p>
          <ul>
            {preview.errors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
          <p className="empty__body">
            Expected {TARGET_COMPANY_ROW_MIN}–{TARGET_COMPANY_ROW_MAX} company records. Existing
            imported records are left unchanged.
          </p>
        </div>
      ) : null}

      {canShowTable ? (
        <div className="tablewrap">
          <table className="table">
            <caption className="visually-hidden">Companies from the selected file</caption>
            <thead>
              <tr>
                <th scope="col">Source row</th>
                {preview!.headers.map((header, index) => {
                  const normalized = header.trim().replace(/\\s+/g, ' ').toLocaleLowerCase()
                  const occurrence =
                    preview!.headers
                      .slice(0, index)
                      .filter((item) => item.trim().replace(/\\s+/g, ' ').toLocaleLowerCase() === normalized).length + 1
                  const duplicate = preview!.headers.filter((item) => item.trim().replace(/\\s+/g, ' ').toLocaleLowerCase() === normalized).length > 1
                  const label = header.trim() === '' ? `Column ${index + 1}` : duplicate ? `${header} (${occurrence})` : header
                  return (
                    <th key={`h-${index}`} scope="col" title={header}>
                      {label}
                    </th>
                  )
                })}
                {Array.from({ length: extraColumnCount }, (_, index) => (
                  <th key={`extra-${index}`} scope="col">
                    Extra {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview!.rows.map((row, rowIndex) => {
                const isMalformed = row.length !== preview!.headers.length
                return (
                  <tr key={rowIndex} data-malformed={isMalformed ? 'true' : 'false'}>
                    <td data-label="Source row">{rowIndex + 2}</td>
                    {Array.from({ length: maxColumns }, (_, colIndex) => {
                      const value = row[colIndex]
                      const isMissing = value === undefined
                      const isEmpty = typeof value === 'string' && value.trim() === ''
                      const quality = isMalformed ? 'malformed' : isMissing || isEmpty ? 'missing' : 'supplied'
                      return (
                        <td
                          key={colIndex}
                          data-label={colIndex < preview!.headers.length ? preview!.headers[colIndex] : `Extra ${colIndex - preview!.headers.length + 1}`}
                          data-quality={quality}
                        >
                          {value ?? ''}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {canShowTable ? (
        <p className="target-companies__quality" role="note">
          Cell quality: supplied values are shown as entered; empty cells are missing/empty; rows with a
          different cell count than the header are marked malformed. Syntactic validation is not identity
          verification and does not establish company relevance.
        </p>
      ) : null}
    </section>
  )
}

function simpleHash(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return String(hash)
}

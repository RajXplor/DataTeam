'use client'

import React, { useEffect, useRef } from 'react'
import {
  ArrowRight, CheckCircle2, AlertTriangle, Download,
  RefreshCw, Users, UserCheck, UserX, Trash2,
  Scissors, FileDown, Zap, Shield, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Badge, Separator } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import FileDropzone from '@/components/FileDropzone'
import AuditReport from '@/components/AuditReport'
import DataPreviewTable from '@/components/DataPreviewTable'
import { useMigration } from '@/hooks/useMigration'
import { rowsToCSVBlob } from '@/lib/parser/sheetReader'
import { IMPORT_COLUMNS, PREVIEW_COLUMNS } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, variant = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const colors = {
    default: 'text-foreground',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger:  'text-red-400',
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/50">{icon}</span>
      </div>
      <div>
        <p className={cn('text-2xl font-bold tabular-nums tracking-tight', colors[variant])}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Step row in progress view ─────────────────────────────────────────────────
function StepRow({ msg, isLast }: { msg: string; isLast: boolean }) {
  return (
    <div className={cn('flex items-start gap-3 py-2', !isLast && 'border-b border-border/30')}>
      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
      <span className="text-sm text-foreground/80">{msg}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════════
export default function Page() {
  const {
    state, acceptFile, setServiceId, setServiceName,
    removeFile, clearError, run, reset, isReady,
  } = useMigration()

  const logEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll processing log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.steps])

  // Global drag-and-drop onto the window
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer?.files[0]
      if (f && state.appState === 'idle') acceptFile(f)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [acceptFile, state.appState])

  function downloadCSV() {
    if (!state.result) return
    const blob = rowsToCSVBlob(state.result.rows, IMPORT_COLUMNS)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = state.result.outputFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── IDLE / UPLOAD VIEW ─────────────────────────────────────────────────────
  if (state.appState === 'idle') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold">X2X Migration Portal</h1>
                <p className="text-xs text-muted-foreground">Xplor → PC Import</p>
              </div>
            </div>
            <Badge variant="secondary">v4</Badge>
          </div>
        </header>

        {/* Hero */}
        <div className="max-w-5xl mx-auto px-6 pt-14 pb-8 w-full">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs">
              <Shield className="w-3 h-3 mr-1.5 text-violet-400" />
              Client-side processing — your files never leave the browser
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Migrate childcare records<br />
              <span className="text-primary">in seconds, not hours</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
              Drop your Xplor exports below. The portal cleans every field, removes EC duplicates,
              auto-creates missing Parent 1 records, and produces a ready-to-import CSV with a full
              audit trail.
            </p>
          </div>

          {/* Error banner */}
          {state.error && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-lg border border-destructive/40 bg-destructive/10 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium">File error</p>
                <p className="text-xs text-muted-foreground mt-0.5">{state.error}</p>
              </div>
              <button onClick={clearError} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
          )}

          {/* File upload cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <FileDropzone
              role="children"
              file={state.childrenFile}
              onFile={acceptFile}
              onRemove={() => removeFile('children')}
            />
            <FileDropzone
              role="ec"
              file={state.ecFile}
              onFile={acceptFile}
              onRemove={() => removeFile('ec')}
            />
          </div>

          {/* Service config */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Destination Service Details</CardTitle>
              <CardDescription>
                These values populate <code className="text-xs font-mono">ServiceID</code> and{' '}
                <code className="text-xs font-mono">Service_Name</code> in every row of the output.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceId">New Service ID</Label>
                  <Input
                    id="serviceId"
                    placeholder="e.g. SVC_NEW_001"
                    value={state.serviceId}
                    onChange={e => setServiceId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceName">New Service Name</Label>
                  <Input
                    id="serviceName"
                    placeholder="e.g. Sunshine Early Learning"
                    value={state.serviceName}
                    onChange={e => setServiceName(e.target.value)}
                  />
                  {state.serviceName.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Output file:{' '}
                      <code className="font-mono text-violet-400">
                        {state.serviceName.trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '')}_PC_Import.csv
                      </code>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <Button
              size="xl"
              className="w-full sm:w-auto min-w-[240px] gap-2"
              disabled={!isReady}
              onClick={run}
            >
              <Zap className="w-4 h-4" />
              Run Migration
              <ArrowRight className="w-4 h-4" />
            </Button>
            {!isReady && (
              <p className="text-xs text-muted-foreground">
                {!state.childrenFile && !state.ecFile
                  ? 'Upload both files and enter service details to continue'
                  : !state.childrenFile
                  ? 'Children data file is missing'
                  : !state.ecFile
                  ? 'Emergency contacts file is missing'
                  : 'Enter Service ID and Service Name to continue'}
              </p>
            )}
          </div>

          {/* Feature pills */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '📞', label: 'Phone normalisation', desc: 'Leading 0, 10 digits, no specials' },
              { icon: '📮', label: 'Postcode enforcement', desc: 'Strict 4-digit format' },
              { icon: '🏥', label: 'Medicare cleaning', desc: 'Strips ref text, fixes expiry dates' },
              { icon: '👤', label: 'EC deduplication', desc: 'Full delete or field-level clear' },
            ].map(f => (
              <div key={f.label} className="rounded-lg border border-border bg-card/50 p-3 text-center">
                <div className="text-xl mb-1.5">{f.icon}</div>
                <p className="text-xs font-medium text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── PROCESSING VIEW ────────────────────────────────────────────────────────
  if (state.appState === 'processing') {
    const progress = Math.min(98, (state.steps.length / 12) * 100)

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Pulsing logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-2xl border border-primary/20 animate-ping opacity-30" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-center mb-1">Processing migration</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Transforming records for <strong className="text-foreground">{state.serviceName}</strong>
          </p>

          <Progress value={progress} className="mb-6 h-1" />

          <Card>
            <CardContent className="pt-4 max-h-72 overflow-y-auto">
              {state.steps.map((step, i) => (
                <StepRow key={i} msg={step} isLast={i === state.steps.length - 1} />
              ))}
              {/* Pending indicator */}
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                <span className="text-sm text-muted-foreground italic">Processing…</span>
              </div>
              <div ref={logEndRef} />
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground mt-6">
            <Clock className="w-3 h-3 inline mr-1" />
            Large files may take a few seconds — everything runs in your browser.
          </p>
        </div>
      </div>
    )
  }

  // ── ERROR VIEW ─────────────────────────────────────────────────────────────
  if (state.appState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Migration failed</h2>
          <p className="text-sm text-muted-foreground mb-6">
            An error occurred during processing. Check your input files match the expected format
            and try again.
          </p>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-left mb-6">
            <p className="text-xs font-mono text-destructive break-all">{state.error}</p>
          </div>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Start over
          </Button>
        </div>
      </div>
    )
  }

  // ── RESULTS VIEW ───────────────────────────────────────────────────────────
  const { result } = state
  if (!result) return null
  const { stats, audit } = result
  const auditTotal =
    audit.ecFullDeletes.length + audit.ecPartialClears.length +
    audit.parent1Created.length + audit.missingGender.length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky results header */}
      <header className="border-b border-border bg-card/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Migration complete</p>
              <p className="text-xs text-muted-foreground">{result.outputFilename}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> New migration
            </Button>
            <Button size="sm" onClick={downloadCSV} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
              <Download className="w-3.5 h-3.5" />
              Download {result.outputFilename}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 w-full space-y-8 animate-fade-in">

        {/* Alert if Parent 1 records need review */}
        {audit.parent1Created.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-400">
                Action Required — {audit.parent1Created.length} Parent 1 placeholder{audit.parent1Created.length > 1 ? 's' : ''} inserted
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                These children had no Parent 1 on record. Placeholder entries have been created.
                Open the Audit Report tab below and update every flagged row before importing.
              </p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Children"
            value={stats.childrenCount}
            sub="processed"
            variant="default"
          />
          <StatCard
            icon={<UserCheck className="w-4 h-4" />}
            label="Unique EC persons"
            value={stats.uniqueECPersons}
            sub="assigned legacy IDs"
          />
          <StatCard
            icon={<UserCheck className="w-4 h-4" />}
            label="Children with EC"
            value={stats.childrenWithEC}
            sub={`of ${stats.childrenCount}`}
            variant="success"
          />
          <StatCard
            icon={<Trash2 className="w-4 h-4" />}
            label="EC profiles deleted"
            value={stats.ecFullDeletes}
            sub="full duplicates"
            variant={stats.ecFullDeletes > 0 ? 'warning' : 'default'}
          />
          <StatCard
            icon={<Scissors className="w-4 h-4" />}
            label="EC fields cleared"
            value={stats.ecPartialClears}
            sub="partial duplicates"
            variant={stats.ecPartialClears > 0 ? 'warning' : 'default'}
          />
          <StatCard
            icon={<UserX className="w-4 h-4" />}
            label="Parent 1 created"
            value={stats.parent1Created}
            sub="placeholders"
            variant={stats.parent1Created > 0 ? 'danger' : 'default'}
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Missing gender"
            value={stats.missingGender}
            sub="need update"
            variant={stats.missingGender > 0 ? 'warning' : 'default'}
          />
        </div>

        <Separator />

        {/* Main tabbed content */}
        <Tabs defaultValue="preview">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
            <TabsList>
              <TabsTrigger value="preview">
                <FileDown className="w-3.5 h-3.5" />
                Data Preview
                <Badge variant="secondary" className="ml-1">{result.rows.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="audit">
                <Shield className="w-3.5 h-3.5" />
                Audit Report
                {auditTotal > 0 && (
                  <Badge variant="warning" className="ml-1">{auditTotal}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Download CTA in tabs bar */}
            <Button onClick={downloadCSV} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs px-3">
              <Download className="w-3.5 h-3.5" />
              {result.outputFilename}
            </Button>
          </div>

          <TabsContent value="preview">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Output Preview</CardTitle>
                <CardDescription className="text-xs">
                  Showing {PREVIEW_COLUMNS.length} of {IMPORT_COLUMNS.length} columns for readability.
                  The downloaded CSV contains all {IMPORT_COLUMNS.length} columns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataPreviewTable rows={result.rows} totalColumns={IMPORT_COLUMNS.length} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Audit Report</CardTitle>
                <CardDescription className="text-xs">
                  Every automated change is listed here. Review all flagged items before importing
                  into the new service.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditReport audit={audit} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Next steps checklist */}
        <Card className="border-border/50">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Next steps before importing
            </p>
            <ol className="space-y-2">
              {[
                audit.parent1Created.length > 0 &&
                  `Review and update ${audit.parent1Created.length} auto-created Parent 1 placeholder(s) — see Audit Report`,
                audit.missingGender.length > 0 &&
                  `Fill in Gender (Column G) for ${audit.missingGender.length} child record(s) — see Audit Report`,
                'Verify phone numbers look correct (10 digits, leading 0)',
                'Verify postcodes are 4 digits',
                'Save as CSV UTF-8 if re-opening in Excel before import',
                'Import into the new service',
              ]
                .filter(Boolean)
                .map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="flex-none w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className={cn(
                      i < 2 && (audit.parent1Created.length > 0 || audit.missingGender.length > 0)
                        ? 'text-amber-400'
                        : 'text-muted-foreground',
                    )}>
                      {step}
                    </span>
                  </li>
                ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

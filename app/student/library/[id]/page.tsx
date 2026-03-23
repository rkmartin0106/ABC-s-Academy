'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface ResourceData {
  id: string
  title: string
  file_url: string
  type: string
}

export default function PDFFlipbookPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [resource, setResource] = useState<ResourceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pdfError, setPdfError] = useState(false)
  const [scale, setScale] = useState(1.0)
  const [flipping, setFlipping] = useState<'left' | 'right' | null>(null)

  const fetchResource = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('resources')
      .select('id, title, file_url, type')
      .eq('id', id)
      .single()

    if (!data) { setError('Document not found.'); setLoading(false); return }
    setResource(data)
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchResource() }, [fetchResource])

  function goToPage(next: number) {
    if (next < 1 || next > numPages) return
    const dir = next > pageNumber ? 'right' : 'left'
    setFlipping(dir)
    setTimeout(() => {
      setPageNumber(next)
      setFlipping(null)
    }, 200)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (error || !resource) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-red-400 font-medium">{error ?? 'Not found'}</p>
        <button onClick={() => router.push('/student')} className="mt-4 text-blue-400 text-sm hover:underline">← Back</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/student')}
          className="text-gray-400 hover:text-white transition flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Back
        </button>
        <h1 className="flex-1 text-white font-semibold text-sm truncate">{resource.title}</h1>
        {numPages > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
              className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm flex items-center justify-center transition">−</button>
            <span className="text-gray-400 text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
              className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm flex items-center justify-center transition">+</button>
          </div>
        )}
      </div>

      {/* PDF viewer */}
      <div className="flex-1 flex flex-col items-center justify-start py-8 px-4 overflow-auto">
        <div className="relative">
          {/* Page flip animation wrapper */}
          <div
            className={`transition-all duration-200 ${
              flipping === 'right' ? 'translate-x-4 opacity-0' :
              flipping === 'left'  ? '-translate-x-4 opacity-0' : ''
            }`}
          >
            {/* Book shadow */}
            <div className="shadow-2xl rounded-lg overflow-hidden">
              {pdfError ? (
                <div className="bg-white w-64 h-96 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-gray-500 text-sm font-medium">Could not load PDF</p>
                  <p className="text-gray-400 text-xs">The URL may not be publicly accessible or CORS may be blocking it.</p>
                  <a href={resource.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 text-xs hover:underline">Open directly →</a>
                </div>
              ) : (
                <Document
                  file={resource.file_url}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={() => setPdfError(true)}
                  loading={
                    <div className="bg-white w-64 h-96 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    loading=""
                    renderTextLayer
                    renderAnnotationLayer
                  />
                </Document>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        {numPages > 0 && (
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Prev
            </button>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={e => {
                  const n = parseInt(e.target.value)
                  if (n >= 1 && n <= numPages) goToPage(n)
                }}
                className="w-14 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">/ {numPages}</span>
            </div>

            <button
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber >= numPages}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white text-sm font-medium transition"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}

        {/* Page dots for short PDFs */}
        {numPages > 1 && numPages <= 20 && (
          <div className="flex gap-1.5 mt-4 flex-wrap justify-center max-w-xs">
            {Array.from({ length: numPages }, (_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i + 1)}
                className={`w-2 h-2 rounded-full transition ${
                  i + 1 === pageNumber ? 'bg-white' : 'bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

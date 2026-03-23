'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Resource {
  id: string
  title: string
  type: string
  file_url: string
}

export default function LibraryPreview() {
  const [pdfs, setPdfs] = useState<Resource[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/library')
      .then(r => r.ok ? r.json() : { resources: [] })
      .then(d => {
        setPdfs((d.resources ?? []).filter((r: Resource) => r.type === 'pdf').slice(0, 4))
        setLoaded(true)
      })
  }, [])

  if (!loaded || pdfs.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Library</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pdfs.map(pdf => (
          <Link key={pdf.id} href={`/student/library/${pdf.id}`}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 p-4 hover:shadow-md hover:border-red-100 transition-all group">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="flex-1 font-semibold text-gray-900 text-sm group-hover:text-red-700 transition-colors leading-snug truncate">
              {pdf.title}
            </p>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  )
}

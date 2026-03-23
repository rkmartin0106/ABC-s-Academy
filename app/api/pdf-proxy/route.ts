import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/pdf-proxy?url=<encoded_url>
// Fetches the PDF server-side and streams it to the client,
// bypassing any CORS restrictions on the source host.
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let decoded: string
  try {
    decoded = decodeURIComponent(url)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const upstream = await fetch(decoded, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 502 })
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/pdf'
  const buffer = await upstream.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

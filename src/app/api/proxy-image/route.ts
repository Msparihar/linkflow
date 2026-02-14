import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "media.licdn.com") {
      return NextResponse.json({ error: "Only LinkedIn images allowed" }, { status: 403 })
    }

    const response = await fetch(url)
    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}

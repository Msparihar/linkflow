// Browser-side fetch for our own API routes. Throws ApiError with the server's
// message and status so React Query, toasts and error states can show the real reason.

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export async function apiFetch<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0)
  }

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      (body && typeof body.error === "string" && body.error) ||
      (res.status >= 500 ? "Something went wrong on our side. Try again." : "Request failed.")
    throw new ApiError(message, res.status, body?.code)
  }

  return body as T
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong."
}

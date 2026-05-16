import { authProxy } from './lib/authProxy'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)'],
}

export function proxy(request: Parameters<typeof authProxy>[0]) {
  return authProxy(request)
}

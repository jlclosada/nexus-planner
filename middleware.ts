export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/projects/:path*',
    '/my-work/:path*',
    '/notifications/:path*',
    '/settings/:path*',
  ],
}

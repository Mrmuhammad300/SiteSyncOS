export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/properties/:path*',
    '/design-services/:path*',
    '/rfis/:path*',
    '/submittals/:path*',
    '/daily-reports/:path*',
    '/documents/:path*',
    '/change-orders/:path*',
    '/punch-items/:path*',
    '/profile/:path*',
    '/gantt/:path*',
    '/budgeting/:path*',
    '/draw-requests/:path*',
    '/contractor-portal/:path*',
    '/lender-portal/:path*',
    '/tenant-management/:path*',
    '/maintenance/:path*',
    '/analytics/:path*',
  ],
};

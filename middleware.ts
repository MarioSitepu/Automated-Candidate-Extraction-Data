import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from './app/tokens/session'

export async function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        const sessionCookie = request.cookies.get('session')?.value;
        const isKarcisAsli = sessionCookie ? await decrypt(sessionCookie) : null;

        if (!isKarcisAsli) {
            return NextResponse.redirect(new URL('/login', request.url))
        }   
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api/upload|_next/static|_next/image|favicon.ico).*)'],
};
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from './app/tokens/session' // meminjam fungsi token untuk cek token


export async function middleware(request: NextRequest) {
    // mengecek user apakah sedang mencoba membuka page /dashboard

    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        // web mencari cookie user
        const sessionCookie = request.cookies.get('session')?.value;

        // web melihat keaslian token
        const isKarcisAsli = sessionCookie ? await decrypt(sessionCookie) : null;

        // jika user tidak memiliki token yg seusai / kadaluarsa
        if (!isKarcisAsli) {
            // paksa kembali ke login
            return NextResponse.redirect(new URL('/login', request.url))
        }   
    }

    // apapun halamannya, kalau aman dikasih akses
    return NextResponse.next()
}
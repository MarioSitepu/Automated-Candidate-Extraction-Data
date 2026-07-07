// logika token login , buat user agar tetap stay login terus brok

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// membuat session secret key , rahasia
const secretKey = "rahasia-negara-123";
const key = new TextEncoder().encode(secretKey);

// 1. membuat pengecekan token web
export async function decrypt(token : string) {
    try {
        const { payload } = await jwtVerify(token, key);
        return payload;
    } catch {
        return null;
    }
}

// 2. membuat token baru saat user login
export async function createSession(userId: number) {
    const expires = new Date(Date.now() + 60 * 60 * 1000); // token hangus dalam 1 jam

    // cetak token (jwt)
    const session = await new SignJWT({ userId})
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(expires)
        .sign(key);

    // menyimpan token ke cookies browser
    const cookieStore = await cookies ();
    cookieStore.set("session", session, {
        httpOnly: true, // token gabisa dicuri lewat javascipt (rllyimportant)
        secure: true,
        expires: expires,
        sameSite: "lax",
        path: "/",
    });
}

// 3. menghapus token saat logout
export async function deleteSession(){
    const cookieStore = await cookies();
    cookieStore.delete("session");
}
"use server"; // kode akan berjalan di backend atau server

import prisma from "../../lib/prisma";

export async function loginUser (emailKetik : string, passwordKetik : string) {
    // 1. cari user di db berdasarkan email
    const user = await prisma.user.findUnique ({
        where : {
            email: emailKetik
        }
    });

    // 2. jika email tidak ada dlm db
    if (!user) {
        return { success : false , message: "Email tidak ditemukan!"};
    }

    // 3. jika email ada, cocokkan password
    if (user.password !== passwordKetik) {
        return { success: false, message: "Password salah!"};
    }

    //4. Jika email password benar
    return { success : true, message: "Login Sukses!"};
}
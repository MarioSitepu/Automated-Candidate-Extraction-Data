"use server"; // kode akan berjalan di backend atau server

import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs"
import { createSession , deleteSession } from "@/app/tokens/session"

export async function loginUser (emailKetik : string, passwordKetik : string) {
    
    try {
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

        // 3. jika email ada, cocokkan password, sekarang ditambahkan dengan bcrypt
        const isPasswordBenar = await bcrypt.compare(passwordKetik, user.password)

        if (!isPasswordBenar) {
            return { success: false, message: "Password salah!" }
        }

        //4. Jika email password benar
        await createSession(user.id) // membuat token kalau benar
        return { success : true, message: "Login Sukses!" }
    } catch {
        return { success : false, message: "Terjadi kesalahan sistem"}
    }
}

// menghapus token saat logout
export async function logoutUser() {
    await deleteSession(); // memanggil fungsi logout
}

// fungsi baru untuk daftar akun
export async function registerUser(emailKetik: string, passwordKetik: string){
    try {
        // 1. Cek email apakah sudah ada atau belum
        const userSudahAda = await prisma.user.findUnique({
            where: { email: emailKetik }
        });

        if(userSudahAda) {
            return { success: false, message: "Email sudah terdaftar! Gunakan email lain"};
        }

        //2. aturan kekuatan password lewat bcrypt
        const costFactor = 10; //10x iterasi
        const passwordYangDiHash = await bcrypt.hash(passwordKetik, costFactor);

        //3. simpan data user baru ke db dengan password hasil hash
        await prisma.user.create({
            data: {
                email: emailKetik,
                password: passwordYangDiHash
            }
        });

        return { success: true, message: "Berhasil mendaftar! Silahkan Login."};
    } catch (error) {
        return { success: false, message: "Terjadi kesalahan sistem saat mendaftar"};
    }
}
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerUser } from "../actions/auth"; // memanggil fungsi logika register akun
import Link from "next/link" // memmbuat link ke halaman login;

export default function RegisterPage() {
    const router = useRouter();

    // menyimpan ketikan user dnegan usestate
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()

        // mengirim email dan password ke backend
        const hasil = await registerUser(email, password);

        if (hasil.success) {
            alert(hasil.message);
            // kalau berhasil daftar, arahkan user ke halaman login
            router.push("/login");
        } else {
            // kalau gagal , tampilkan error
            alert(hasil.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-green-600">Buat Akun Baru</h1>
                
                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            required
                        />
                    </div>
                    <button 
                        type="submit"
                        className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
                    >
                        Daftar Sekarang
                    </button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-600">
                    Sudah punya akun?{" "}
                    <Link href="/login" className="text-blue-500 hover:underline">
                        Masuk di sini
                    </Link>
                </div>
            </div>
        </div>
    );
}
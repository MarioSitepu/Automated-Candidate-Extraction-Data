// File: app/login/page.tsx

"use client"; // untuk interaksi klik

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser } from "../actions/auth"; //memanggil jembatan backend

export default function LoginPage() {
    const router = useRouter(); // alat untuk pindah halaman

    //1. menyimpan "memori sementara" ketikan user
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    //2. fungsi membutuhkan waktu (async) menunggu jawaban dari db
    //fungsi dijalankan saat tombol ditekan

    const handleLogin = async (e: React.FormEvent) =>{
        e.preventDefault(); // mencegah browser reaload halaman

        //3. Mengirim email dan password ke backend
        const hasil = await loginUser(email, password);

        //4. cek jawaban dari backend
        //kalau benar
        if (hasil.success === true){
        alert(hasil.message); //munculkan popup sesuai dari action/auth.ts
        router.push("/dashboard");
        //kalau salah
        } else {
            alert(hasil.message);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Login Dulu Yuk</h1>

                {/* penambahan onsubmit handle login */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Masukkan email"
                            required

                            // sambungkan isi ketikan ke "memori sementara" email
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Masukkan password"
                            required

                            // sambungkan isi ketikan ke "memori sementara" password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300"
                    >
                        Masuk
                    </button>
                </form>
            </div>
        </div>
    );
}

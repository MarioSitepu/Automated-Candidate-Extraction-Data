// File: app/login/page.tsx

"use client"; // untuk interaksi klik

import { useRouter } from "next/navigation";


export default function LoginPage() {
    const router = useRouter(); // alat untuk pindah halaman

    //logika ke halaman dahboard

    //fungsi dijalankan saat tombol ditekan
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault(); // mencegah browser reaload halaman
    

    alert("Login berhasil ! Sedang Menuju Ke Dashboard");//popup kecil
    router.push("/dashboard"); // ke dashboard

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
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Masukkan password"
                            required
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

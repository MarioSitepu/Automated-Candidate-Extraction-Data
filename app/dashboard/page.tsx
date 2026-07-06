// File: app/dashboard/page.tsx

"use client"; 

import {useRouter} from "next/navigation"; // panggil useRouter
import {logoutUser} from "../actions/auth";


export default function DashboardPage() {
    const router = useRouter(); // deklarasi router

    //fungsi dialankan pada saat klik tombol
    const handleLogout = async() => { // mengubah ke async karena menyerahkan tombol logout ke backend, jadi async menunggu
        await logoutUser();

        alert("Kamu berhasil logout !");

        router.push("/login"); // direct ke login 
    }

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <nav className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow">
                <h1 className="text-2xl font-bold text-blue-600">My Dashboard</h1>
                <button 
                    onClick={handleLogout} // panggil handle logout
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
                    Logout
                </button>
            </nav>

            <main className="bg-white p-6 rounded-lg shadow h-96">
                <h2 className="text-xl font-semibold mb-4">Selamat datang!</h2>
                <p className="text-gray-600">Ini adalah halaman dashboard rahasia kamu.</p>
            </main>
        </div>
    );
}

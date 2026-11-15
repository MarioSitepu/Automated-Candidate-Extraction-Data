"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerUser } from "../actions/auth"; // memanggil fungsi logika register akun
import Link from "next/link" // memmbuat link ke halaman login;
import toast from "react-hot-toast"

export default function RegisterPage() {
    const router = useRouter();

    // menyimpan ketikan user dnegan usestate
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (password !== confirmPassword){
            toast.error("Gagal mendaftar, Password dan Konfirmasi Password tidak sama!");
            return;
        }

        setLoading(true);
        try {
            // mengirim email dan password ke backend
            const hasil = await registerUser(email, password);

            if (hasil.success) {
                toast.success(hasil.message);
                // kalau berhasil daftar, arahkan user ke halaman login
                router.push("/login");
            } else {
                // kalau gagal , tampilkan error
                toast.error(hasil.message);
                setLoading(false);
            }
        } catch {
            toast.error("Terjadi kesalahan sistem saat mendaftar");
            setLoading(false);
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
                            disabled={loading}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:opacity-60 disabled:cursor-not-allowed"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input 
                            type="password"
                            value={password}
                            disabled={loading}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:opacity-60 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ulangi Password</label>
                        <input 
                            type="password"
                            value={confirmPassword}
                            disabled={loading}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:opacity-60 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                    >
                        {loading ? "Mendaftar..." : "Daftar Sekarang"}
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
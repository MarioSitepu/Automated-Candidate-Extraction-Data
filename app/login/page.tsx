// File: app/login/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser } from "../actions/auth";
import { Microscope, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false); // State untuk ingat perangkat

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mengirim email, password, dan rememberMe
        const hasil = await loginUser(email, password, rememberMe);

        if (hasil.success === true) {
            alert(hasil.message);
            router.push("/dashboard");
        } else {
            alert(hasil.message);
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
            <div className="bg-white p-10 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] w-full max-w-[420px]">
                
                {/* Logo and Title */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center space-x-2 mb-2">
                        <Microscope className="w-6 h-6 text-teal-600" />
                        <h1 className="text-2xl font-bold text-teal-800 tracking-tight">Karla Bionics</h1>
                    </div>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">Sistem Manajemen Prostetik</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Email Input */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1.5 tracking-wider uppercase">
                            Corporate Email
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                                placeholder="nama.dokter@karlabionics.co.id"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase">
                                Password
                            </label>
                            <a href="#" className="text-[10px] font-bold text-teal-600 hover:text-teal-700 tracking-wider">
                                LUPA SANDI?
                            </a>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                className={`w-full pl-10 pr-10 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors ${!showPassword && password.length > 0 ? "tracking-widest" : ""}`}
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Checkbox */}
                    <div className="flex items-center pt-1 pb-2">
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-3.5 w-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-600 cursor-pointer">
                            Ingat perangkat ini
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-[#0F766E] text-white py-2.5 px-4 rounded-lg hover:bg-teal-800 transition duration-300 flex justify-center items-center space-x-2 text-sm font-medium shadow-sm"
                    >
                        <span>Masuk ke Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center space-x-1.5 text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[9px] font-semibold tracking-widest uppercase">Sistem Internal Terenkripsi Karla Bionics</span>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate login delay
        setTimeout(() => {
            navigate('/dashboard');
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">

            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
            </div>

            <div className="z-10 w-full max-w-md p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
                        <span className="font-bold text-xl">P</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
                    <p className="text-slate-400 mt-2 text-sm">Sign in to your unified workspace</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <input
                                type="email"
                                placeholder="vivek@partners.com"
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-500">
                        Protected by enterprise-grade security.
                    </p>
                </div>
            </div>
        </div>
    );
}

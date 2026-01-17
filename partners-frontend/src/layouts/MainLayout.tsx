import { ReactNode, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Menu } from 'lucide-react';

export function MainLayout({ children }: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-screen bg-background overflow-hidden font-sans text-foreground">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950 border-b border-white/5 flex items-center px-4 z-40">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-slate-400 hover:text-white"
                >
                    <Menu size={24} />
                </button>
                <span className="ml-3 font-bold text-white tracking-wide">Platform</span>
            </div>

            {/* Sidebar with Mobile Drawer Logic */}
            <div className={`fixed inset-0 z-50 md:static md:z-auto transition-visibility duration-300 ${isSidebarOpen ? "visible" : "invisible md:visible"}`}>

                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-black/80 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
                    onClick={() => setIsSidebarOpen(false)}
                />

                {/* Sidebar Component */}
                <Sidebar
                    className={`absolute left-0 top-0 h-full shadow-2xl md:shadow-none transition-transform duration-300 md:transform-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </div>

            <main className="flex-1 overflow-auto bg-background/50 relative pt-16 md:pt-0">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}

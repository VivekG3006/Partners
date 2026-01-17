import { useState, useEffect } from 'react';
import { Settings, X, Server, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Timezone {
    label: string;
    iana: string;
}

const DEFAULT_PRIMARY: Timezone = { label: 'IST', iana: 'Asia/Kolkata' };
const DEFAULT_SECONDARY: Timezone = { label: 'Dubai', iana: 'Asia/Dubai' };

interface SidebarProps {
    className?: string;
    onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
    const [now, setNow] = useState(new Date());

    // State for timezones, initializing from localStorage if available
    const [primaryTz, setPrimaryTz] = useState<Timezone>(() => {
        const saved = localStorage.getItem('partners_primary_tz');
        return saved ? JSON.parse(saved) : DEFAULT_PRIMARY;
    });

    const [secondaryTz, setSecondaryTz] = useState<Timezone>(() => {
        const saved = localStorage.getItem('partners_secondary_tz');
        return saved ? JSON.parse(saved) : DEFAULT_SECONDARY;
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editPrimary, setEditPrimary] = useState(primaryTz.iana);
    const [editSecondary, setEditSecondary] = useState(secondaryTz.iana);
    const [editPrimaryLabel, setEditPrimaryLabel] = useState(primaryTz.label);
    const [editSecondaryLabel, setEditSecondaryLabel] = useState(secondaryTz.label);

    // Tick every second
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Persist Preferences
    useEffect(() => {
        localStorage.setItem('partners_primary_tz', JSON.stringify(primaryTz));
        localStorage.setItem('partners_secondary_tz', JSON.stringify(secondaryTz));
    }, [primaryTz, secondaryTz]);

    const handleSave = () => {
        setPrimaryTz({ label: editPrimaryLabel, iana: editPrimary });
        setSecondaryTz({ label: editSecondaryLabel, iana: editSecondary });
        setIsEditing(false);
    };

    const ClockDisplay = ({ tz, isPrimary = false }: { tz: Timezone, isPrimary?: boolean }) => {
        const timeString = new Intl.DateTimeFormat('en-US', {
            timeZone: tz.iana,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Military time for engineers
        }).format(now);

        const dateString = new Intl.DateTimeFormat('en-US', {
            timeZone: tz.iana,
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        }).format(now);

        return (
            <div className={cn("flex flex-col group/clock cursor-default")}>
                <div className="flex items-baseline justify-between">
                    <span className={cn("font-mono font-bold tracking-tight text-glow transition-all duration-300", isPrimary ? "text-3xl text-white" : "text-xl text-slate-300")}>
                        {timeString}
                    </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{tz.label}</span>
                    <span className="text-[10px] text-slate-600 font-mono">{dateString}</span>
                </div>
            </div>
        );
    };

    return (
        <div className={cn("h-screen w-72 bg-slate-950 border-r border-white/5 flex flex-col justify-between p-6 relative overflow-hidden transition-all duration-300", className)}>

            {/* Mobile Close Button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white md:hidden z-50"
                >
                    <X size={20} />
                </button>
            )}

            {/* Background Details */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-blue-500/5 blur-[100px] pointer-events-none" />

            {/* Top Section */}
            <div className="space-y-10 relative z-10">
                <div className="flex items-center space-x-3 text-white font-semibold text-lg tracking-wider">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 border border-white/10">
                        <span className="text-white font-bold font-mono">P</span>
                    </div>
                    <div className="flex flex-col">
                        <span>Platform</span>
                        <span className="text-[10px] text-slate-500 font-normal uppercase tracking-widest">Internal Tool</span>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-slate-900/50 rounded-lg border border-white/5 text-xs text-slate-400 font-mono">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span>US-EAST-1</span>
                    <span className="ml-auto text-slate-600">42ms</span>
                </div>

                {/* Timezones */}
                <div className="space-y-8">
                    <div className="group relative">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="absolute -top-3 -right-3 p-2 text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-20"
                            title="Edit Timezones"
                        >
                            <Settings size={14} />
                        </button>

                        {!isEditing ? (
                            <div className="space-y-8 p-4 bg-slate-900/20 rounded-xl border border-white/5">
                                <ClockDisplay tz={primaryTz} isPrimary />
                                <div className="w-full h-px bg-slate-800/50" />
                                <ClockDisplay tz={secondaryTz} />
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10 space-y-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500">Primary (IANA)</label>
                                    <input
                                        className="w-full bg-slate-900 text-slate-200 text-xs border border-slate-700 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
                                        value={editPrimary} onChange={e => setEditPrimary(e.target.value)}
                                    />
                                    <input
                                        className="w-full bg-slate-900 text-slate-200 text-xs border border-slate-700 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
                                        value={editPrimaryLabel} onChange={e => setEditPrimaryLabel(e.target.value)}
                                        placeholder="Label"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500">Secondary (IANA)</label>
                                    <input
                                        className="w-full bg-slate-900 text-slate-200 text-xs border border-slate-700 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
                                        value={editSecondary} onChange={e => setEditSecondary(e.target.value)}
                                    />
                                    <input
                                        className="w-full bg-slate-900 text-slate-200 text-xs border border-slate-700 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
                                        value={editSecondaryLabel} onChange={e => setEditSecondaryLabel(e.target.value)}
                                        placeholder="Label"
                                    />
                                </div>
                                <div className="flex space-x-2 pt-2">
                                    <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-xs font-bold transition-colors">
                                        SAVE
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 py-1.5 rounded text-xs transition-colors">
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="flex items-center justify-between text-slate-600 text-[10px] font-mono border-t border-white/5 pt-4">
                <div className="flex items-center space-x-1.5">
                    <Server size={10} />
                    <span>v1.2.0</span>
                </div>
                <div className="flex items-center space-x-1.5">
                    <Activity size={10} className="text-emerald-500" />
                    <span>Stable</span>
                </div>
            </div>
        </div>
    );
}

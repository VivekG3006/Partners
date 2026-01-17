import { MainLayout } from '@/layouts/MainLayout';
import { Bell, Briefcase, MessageSquare, Files, Activity, GitCommit, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Mock Data
const APPS = [
    {
        id: 'jira',
        name: 'Jira',
        description: 'Issues & Sprints',
        icon: Briefcase,
        color: 'from-blue-500/20 to-blue-600/20 text-blue-400',
        stats: [
            { label: 'Critical Bugs', value: '3', color: 'text-red-400' },
            { label: 'Assigned to me', value: '8', color: 'text-slate-200' }
        ],
        url: 'https://jira.atlassian.com'
    },
    {
        id: 'keka',
        name: 'Keka',
        description: 'HR & Docs',
        icon: Files,
        color: 'from-purple-500/20 to-purple-600/20 text-purple-400',
        stats: [
            { label: 'Leave Balance', value: '12d', color: 'text-emerald-400' },
            { label: 'Payslip', value: 'Ready', color: 'text-slate-200' }
        ],
        url: 'https://keka.com'
    },
    {
        id: 'teams',
        name: 'Teams',
        description: 'Comms',
        icon: MessageSquare,
        color: 'from-indigo-500/20 to-indigo-600/20 text-indigo-400',
        stats: [
            { label: 'Unread', value: '12', color: 'text-amber-400' },
            { label: 'Standup', value: '10m', color: 'text-slate-200' }
        ],
        url: '/teams'
    }
];

const ACTIVITY_LOG = [
    { id: 1, type: 'commit', message: 'feat: integrated auth service', time: '10m ago', author: 'Vivek' },
    { id: 2, type: 'alert', message: 'Production latency spike > 500ms', time: '2h ago', author: 'System' },
    { id: 3, type: 'deploy', message: 'Deployed v1.2.0 to Staging', time: '4h ago', author: 'CI/CD' },
]

export default function Dashboard() {
    return (
        <MainLayout>
            <div className="p-8 max-w-7xl mx-auto space-y-8">

                {/* Hero / Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-end"
                >
                    <div>
                        <div className="flex items-center space-x-2 text-primary mb-1">
                            <Activity size={16} className="animate-pulse" />
                            <span className="text-xs font-mono uppercase tracking-widest opacity-80">System Operational</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-white text-glow">
                            Dashboard
                        </h1>
                        <p className="text-slate-400 mt-2 font-light">
                            Engineering Overview • <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">Build #8921</span>
                        </p>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs text-slate-500">Next Standup</span>
                            <span className="font-mono text-xl text-white">10:30 AM</span>
                        </div>
                        <button className="p-3 relative rounded-full bg-slate-800/50 hover:bg-slate-700/50 transition-colors border border-white/5">
                            <Bell className="w-5 h-5 text-slate-400" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        </button>
                    </div>
                </motion.div>

                {/* App Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {APPS.map((app, idx) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group relative glass-card rounded-xl p-6 cursor-pointer overflow-hidden"
                            onClick={() => window.location.href = app.url}
                        >
                            {/* Background Glow */}
                            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", app.color)} />

                            <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className={cn("p-3 rounded-lg bg-slate-900/50 border border-white/5", app.color)}>
                                        <app.icon className="w-6 h-6" />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                                        {app.name}
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-wider">{app.description}</p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                                    {app.stats.map(stat => (
                                        <div key={stat.label}>
                                            <div className={cn("text-lg font-mono font-bold", stat.color)}>{stat.value}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Activity Stream */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 glass rounded-xl p-6 min-h-[300px]"
                >
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
                        <GitCommit size={16} className="mr-2" /> Activity Stream
                    </h2>

                    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
                        {ACTIVITY_LOG.map((log) => (
                            <div key={log.id} className="relative pl-12 flex flex-col md:flex-row md:items-center md:justify-between group">
                                <div className="absolute left-2.5 w-3 h-3 rounded-full bg-slate-800 border-2 border-slate-600 group-hover:border-primary group-hover:scale-125 transition-all top-1" />

                                <div className="flex-1">
                                    <p className="text-sm font-mono text-slate-300 group-hover:text-white transition-colors">
                                        <span className="text-secondary-foreground opacity-50 mr-2">[{log.type}]</span>
                                        {log.message}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">by <span className="text-slate-400">{log.author}</span></p>
                                </div>

                                <div className="text-xs font-mono text-slate-600 group-hover:text-slate-400 transition-colors mt-2 md:mt-0 items-center flex">
                                    <Clock size={12} className="mr-1" /> {log.time}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

            </div>
        </MainLayout>
    );
}

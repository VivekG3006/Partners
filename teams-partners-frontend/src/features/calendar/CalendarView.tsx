import { useState } from 'react';
import { ChevronLeft, ChevronRight, Video, Plus, ChevronDown } from 'lucide-react';
import WeekView from './WeekView';
import type { CalendarEvent } from './types';
import DayView from './DayView';
import MonthView from './MonthView';

type ViewMode = 'day' | 'week' | 'month';

const CalendarView = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [showViewMenu, setShowViewMenu] = useState(false);

    // Mock events
    const events: CalendarEvent[] = [
        {
            id: 1,
            title: 'Sprint Planning',
            startHour: 10,
            duration: 1.5,
            dayIndex: 0, // Mon
            color: 'bg-blue-100 border-blue-600'
        },
        {
            id: 2,
            title: 'Design Review',
            startHour: 14,
            duration: 1,
            dayIndex: 1, // Tue
            color: 'bg-purple-100 border-purple-600'
        },
        {
            id: 3,
            title: 'Client Meeting',
            startHour: 11,
            duration: 1,
            dayIndex: 2, // Wed
            color: 'bg-red-100 border-red-600'
        },
        {
            id: 4,
            title: 'Team Sync',
            startHour: 9.5,
            duration: 0.5,
            dayIndex: 3, // Thu
            color: 'bg-green-100 border-green-600'
        },
        {
            id: 5,
            title: 'Demo',
            startHour: 16,
            duration: 1,
            dayIndex: 4, // Fri
            color: 'bg-yellow-100 border-yellow-600'
        }
    ];

    const weekDays = ['Mon 5', 'Tue 6', 'Wed 7', 'Thu 8', 'Fri 9'];

    const getViewLabel = () => {
        switch (viewMode) {
            case 'day': return 'Day';
            case 'week': return 'Week';
            case 'month': return 'Month';
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white">
            {/* Header */}
            <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 z-20 relative">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800">January 2026</h2>
                    <div className="flex items-center bg-gray-100 rounded p-0.5">
                        <button className="p-1 hover:bg-gray-200 rounded"><ChevronLeft size={16} /></button>
                        <button className="px-2 text-sm font-semibold">Today</button>
                        <button className="p-1 hover:bg-gray-200 rounded"><ChevronRight size={16} /></button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    <div className="relative">
                        <button
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded text-sm font-semibold"
                            onClick={() => setShowViewMenu(!showViewMenu)}
                        >
                            {getViewLabel()}
                            <ChevronDown size={14} />
                        </button>
                        {showViewMenu && (
                            <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg py-1 z-30">
                                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100" onClick={() => { setViewMode('day'); setShowViewMenu(false); }}>Day</button>
                                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100" onClick={() => { setViewMode('week'); setShowViewMenu(false); }}>Week</button>
                                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100" onClick={() => { setViewMode('month'); setShowViewMenu(false); }}>Month</button>
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-2"></div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-sm font-semibold text-gray-700">
                            <Video size={16} />
                            Meet now
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#464775] text-white rounded hover:bg-[#3b3c66] text-sm font-semibold">
                            <Plus size={16} />
                            New meeting
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* For Week/Day views, we might pass specific header info if needed, but components handle it mostly */}
                {viewMode === 'day' && (
                    <div className="flex border-b border-gray-200">
                        <div className="w-16 border-r border-gray-200 bg-gray-50"></div>
                        <div className="flex-1 text-center py-2 border-r border-gray-200 text-gray-600 text-sm font-medium bg-gray-50">
                            Mon 5 {/* Static current day */}
                        </div>
                    </div>
                )}
                {viewMode === 'week' && (
                    <div className="flex border-b border-gray-200">
                        <div className="w-16 border-r border-gray-200 bg-gray-50"></div>
                        {weekDays.map((day, index) => (
                            <div key={index} className="flex-1 text-center py-2 border-r border-gray-200 text-gray-600 text-sm font-medium bg-gray-50">
                                {day}
                            </div>
                        ))}
                    </div>
                )}

                {viewMode === 'day' && <DayView events={events} />}
                {viewMode === 'week' && <WeekView events={events} />}
                {viewMode === 'month' && <MonthView events={events} />}
            </div>
        </div>
    );
};

export default CalendarView;

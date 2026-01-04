import type { CalendarEvent } from './types';

interface MonthViewProps {
    events: CalendarEvent[];
}

const MonthView = ({ events }: MonthViewProps) => {
    // 5 rows x 7 columns
    const weeks = [
        [1, 2, 3, 4, 5, 6, 7], // Dec/Jan overlap handled simply
        [5, 6, 7, 8, 9, 10, 11],
        [12, 13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24, 25],
        [26, 27, 28, 29, 30, 31, 1],
    ];

    // Simple helper to check if event is on this day (mock logic uses dayIndex 0-4 for Mon-Fri)
    // For Month view, we'll just map the mock events to specific dates for demo
    // Mon 5 -> 5th
    const getEventsForDay = (day: number) => {
        // Map mock dayIndex to dates for the first week
        // event.dayIndex 0 (Mon) -> 5
        // event.dayIndex 1 (Tue) -> 6, etc.
        return events.filter(e => {
            const eventDate = e.dayIndex + 5;
            return eventDate === day;
        });
    };

    return (
        <div className="flex-1 flex flex-col bg-white">
            {/* Days Header */}
            <div className="flex border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="flex-1 text-center py-2 border-r border-gray-200 text-gray-600 text-sm font-medium bg-gray-50 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col">
                {weeks.map((week, i) => (
                    <div key={i} className="flex-1 flex border-b border-gray-200">
                        {week.map((day, j) => {
                            const dayEvents = getEventsForDay(day);
                            const isOtherMonth = (i === 0 && day > 7) || (i === 4 && day < 20); // Rough logic

                            return (
                                <div key={j} className={`flex-1 border-r border-gray-200 p-2 relative ${isOtherMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}`}>
                                    <span className="text-sm font-medium">{day}</span>
                                    <div className="mt-2 space-y-1">
                                        {dayEvents.map(event => (
                                            <div key={event.id} className={`text-xs p-1 rounded ${event.color} truncate`}>
                                                {event.startHour}:00 {event.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MonthView;

import type { CalendarEvent } from './types';

interface DayViewProps {
    events: CalendarEvent[];
}

const DayView = ({ events }: DayViewProps) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayIndex = 0; // Assuming current day is Monday for static demo

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="flex relative min-h-[1440px]">
                {/* Time Column */}
                <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50 text-xs text-gray-500 text-right pr-2">
                    {hours.map(hour => (
                        <div key={hour} className="h-[60px] relative top-[-6px]">
                            {hour === 0 ? '' : `${hour}:00`}
                        </div>
                    ))}
                </div>

                {/* Day Column */}
                <div className="flex-1 border-r border-gray-200 relative">
                    {/* Hour grid lines */}
                    {hours.map(hour => (
                        <div key={hour} className="h-[60px] border-b border-gray-100"></div>
                    ))}

                    {/* Events - only show events for current dayIndex (0) */}
                    {events.filter(e => e.dayIndex === dayIndex).map(event => (
                        <div
                            key={event.id}
                            className={`absolute left-1 right-1 rounded border-l-4 p-2 text-sm cursor-pointer hover:brightness-95 ${event.color}`}
                            style={{
                                top: `${event.startHour * 60}px`,
                                height: `${event.duration * 60}px`
                            }}
                        >
                            <div className="font-bold text-gray-800">{event.title}</div>
                            <div className="text-gray-600">{`${event.startHour}:00 - ${event.startHour + event.duration}:00`}</div>
                        </div>
                    ))}
                </div>

                {/* Current Time Indicator */}
                <div className="absolute left-16 right-0 border-t-2 border-red-500 z-10" style={{ top: '630px' /* 10:30 AM */ }}>
                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>

            </div>
        </div>
    );
};

export default DayView;

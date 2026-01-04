import { PhoneMissed, MessageSquare, Heart, Users, MoreHorizontal, Filter } from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'missedCall' | 'message' | 'reaction' | 'group';
    user: string;
    avatarColor: string;
    content: string;
    time: string;
    isUnread: boolean;
    channel?: string;
}

const staticActivities: ActivityItem[] = [
    {
        id: '1',
        type: 'missedCall',
        user: 'Vivek G',
        avatarColor: 'bg-purple-600',
        content: 'Missed call',
        time: '10:30 AM',
        isUnread: true,
    },
    {
        id: '2',
        type: 'message',
        user: 'Engineering Team',
        avatarColor: 'bg-blue-600',
        content: 'mentioned you in Deployment',
        time: 'Yesterday',
        isUnread: true,
        channel: 'General'
    },
    {
        id: '3',
        type: 'reaction',
        user: 'Project Managers',
        avatarColor: 'bg-green-600',
        content: 'reacted to your message',
        time: 'Mon',
        isUnread: false,
        channel: 'Planning'
    },
    {
        id: '4',
        type: 'group',
        user: 'Design Team',
        avatarColor: 'bg-pink-500',
        content: 'added you to the team',
        time: 'Sun',
        isUnread: false,
    },
    {
        id: '5',
        type: 'message',
        user: 'Sarah Miller',
        avatarColor: 'bg-yellow-600',
        content: 'Replied to your post',
        time: 'Last week',
        isUnread: false,
        channel: 'Marketing'
    }
];

const ActivityItemRow = ({ item }: { item: ActivityItem }) => {
    const getIcon = () => {
        switch (item.type) {
            case 'missedCall': return <PhoneMissed size={14} className="text-red-500" />;
            case 'message': return <MessageSquare size={14} className="text-purple-500" />;
            case 'reaction': return <Heart size={14} className="text-red-500" />;
            case 'group': return <Users size={14} className="text-blue-500" />;
        }
    };

    return (
        <div className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-100 ${item.isUnread ? 'bg-white' : 'bg-gray-50'}`}>
            <div className="relative">
                <div className={`w-8 h-8 rounded-full ${item.avatarColor} flex items-center justify-center text-white text-xs font-semibold`}>
                    {item.user.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    {getIcon()}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`text-sm truncate ${item.isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                        {item.user}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{item.time}</span>
                </div>
                <p className={`text-sm truncate ${item.isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {item.content}
                </p>
                {item.channel && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                        {item.channel}
                    </p>
                )}
            </div>
        </div>
    );
};

const ActivityFeed = () => {
    return (
        <div className="flex h-full bg-white w-[350px] border-r border-gray-200 flex-col">
            <div className="h-[60px] px-4 flex items-center justify-between border-b border-gray-200 min-h-[60px]">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">Feed</h1>
                    <span className="cursor-pointer text-gray-500 hover:text-gray-700">
                        <Filter size={16} />
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreHorizontal size={20} className="text-gray-500" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {staticActivities.map(activity => (
                    <ActivityItemRow key={activity.id} item={activity} />
                ))}
            </div>
        </div>
    );
};

export default ActivityFeed;

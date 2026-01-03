import { Filter, Edit } from 'lucide-react';

const conversations = [
    { id: 1, name: 'Vivek G', message: 'Can we sync on the timeline?', time: '10:30 AM', avatar: 'VG', active: true },
    { id: 2, name: 'Engineering Team', message: 'Deployment successful.', time: 'Yesterday', avatar: 'ET', active: false },
    { id: 3, name: 'Project Managers', message: 'Updated requirements doc', time: 'Mon', avatar: 'PM', active: false },
];

const ChatList = () => {
    return (
        <div className="w-[290px] flex flex-col border-r border-gray-300 bg-[#F0F0F0] h-full">
            {/* Header */}
            <div className="h-[60px] px-4 flex items-center justify-between shadow-sm bg-[#F5F5F5]">
                <h2 className="text-lg font-bold text-gray-900 cursor-pointer">Chat</h2>
                <div className="flex gap-2 text-gray-600">
                    <Filter size={18} className="cursor-pointer hover:text-brand-default" />
                    <Edit size={18} className="cursor-pointer hover:text-brand-default" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {conversations.map((chat) => (
                    <div
                        key={chat.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-white ${chat.active ? 'bg-white border-l-4 border-brand-default pl-2' : 'pl-3 border-l-4 border-transparent'}`}
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                            {chat.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <span className={`text-sm truncate ${chat.active ? 'font-semibold text-black' : 'font-medium text-gray-700'}`}>{chat.name}</span>
                                <span className="text-[10px] text-gray-500">{chat.time}</span>
                            </div>
                            <p className={`text-xs truncate ${chat.active ? 'text-gray-900' : 'text-gray-500'}`}>
                                {chat.message}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatList;

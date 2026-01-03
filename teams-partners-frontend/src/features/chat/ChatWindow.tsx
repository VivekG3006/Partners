import { Phone, Video, MoreHorizontal, Smile, Paperclip, Send, Bold, Italic, Underline } from 'lucide-react';

const messages = [
    { id: 1, sender: 'Vivek G', text: 'Hey, are we on track for the demo?', time: '10:00 AM', myself: true },
    { id: 2, sender: 'Partner Bot', text: 'Yes, the build passed. I am deploying to staging now.', time: '10:01 AM', myself: false },
    { id: 3, sender: 'Vivek G', text: 'Great! Let me know when it is live.', time: '10:02 AM', myself: true },
    { id: 4, sender: 'Partner Bot', text: 'Deployment successful. You can verify it.', time: '10:25 AM', myself: false },
];

const ChatWindow = () => {
    return (
        <div className="flex-1 flex flex-col bg-white h-full relative">
            {/* Header */}
            <div className="h-[60px] border-b border-gray-200 flex items-center justify-between px-5 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">VG</div>
                    <span className="font-bold text-lg text-gray-900">Vivek G (Partner)</span>
                    <div className="flex gap-4 ml-4 text-gray-500 text-sm">
                        <span className="cursor-pointer hover:underline hover:text-brand-default border-b-2 border-brand-default text-brand-default pb-[17px] mt-[17px]">Chat</span>
                        <span className="cursor-pointer hover:underline hover:text-brand-default pb-[17px] mt-[17px]">Files</span>
                        <span className="cursor-pointer hover:underline hover:text-brand-default pb-[17px] mt-[17px]">Organization</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-brand-default">
                    <div className="p-1.5 hover:bg-gray-100 rounded cursor-pointer"><Video size={20} /></div>
                    <div className="p-1.5 hover:bg-gray-100 rounded cursor-pointer"><Phone size={20} /></div>
                    <div className="pl-2 border-l border-gray-300 ml-2"><MoreHorizontal size={20} className="text-gray-500" /></div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 max-w-[80%] ${msg.myself ? 'self-end flex-row-reverse' : 'self-start'}`}>
                        {!msg.myself && <div className="w-8 h-8 rounded-full bg-gray-400 flex-shrink-0" />}
                        <div className={`flex flex-col ${msg.myself ? 'items-end' : 'items-start'}`}>
                            <div className="flex gap-2 items-baseline mb-1">
                                <span className="font-semibold text-xs text-gray-700">{msg.sender}</span>
                                <span className="text-[10px] text-gray-400">{msg.time}</span>
                            </div>
                            <div className={`p-3 rounded-md text-sm shadow-sm ${msg.myself ? 'bg-[#E8EBFA] text-black' : 'bg-white border border-gray-200'}`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-5 pb-8">
                <div className="border border-gray-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-brand-default/50 transition-shadow bg-white">
                    {/* Formatting Toolbar */}
                    <div className="flex gap-2 pb-2 border-b border-gray-100 mb-2 text-gray-500">
                        <Bold size={16} className="cursor-pointer hover:text-black" />
                        <Italic size={16} className="cursor-pointer hover:text-black" />
                        <Underline size={16} className="cursor-pointer hover:text-black" />
                    </div>
                    <textarea
                        className="w-full resize-none outline-none text-sm min-h-[40px] max-h-[150px]"
                        placeholder="Type a new message"
                        rows={2}
                    />
                    <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-3 text-gray-500">
                            <div className="cursor-pointer hover:text-brand-default"><Paperclip size={20} /></div>
                            <div className="cursor-pointer hover:text-brand-default"><Smile size={20} /></div>
                        </div>
                        <div className="cursor-pointer text-gray-400 hover:text-brand-default">
                            <Send size={20} />
                        </div>
                    </div>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 text-center">
                    Press Enter to send
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;

import ChatList from './ChatList';
import ChatWindow from './ChatWindow';

const ChatFeature = () => {
    return (
        <div className="flex w-full h-full bg-white">
            <ChatList />
            <ChatWindow />
        </div>
    );
};

export default ChatFeature;

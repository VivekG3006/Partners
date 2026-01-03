import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Users, Bell, Calendar, Phone, Files as FilesIcon, MoreHorizontal } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-14 mb-1 text-gray-400 hover:text-white transition-colors
      ${isActive ? 'text-brand-light border-l-2 border-brand-default bg-black/20' : 'border-l-2 border-transparent'}
      `
        }
        style={({ isActive }) => ({
            color: isActive ? '#8B8CC7' : '#BDBDBD', // Custom colors to match Teams precise look if needed, or use classes
        })}
    >
        <Icon size={24} strokeWidth={1.5} />
        <span className="text-[10px] mt-0.5">{label}</span>
    </NavLink>
);

const Sidebar = () => {
    return (
        <div className="w-[68px] bg-[#33344A] flex flex-col items-center py-2 h-full select-none">
            <NavItem to="/activity" icon={Bell} label="Activity" />
            <NavItem to="/chat" icon={MessageSquare} label="Chat" />
            <NavItem to="/teams" icon={Users} label="Teams" />
            <NavItem to="/calendar" icon={Calendar} label="Calendar" />
            <NavItem to="/calls" icon={Phone} label="Calls" />
            <NavItem to="/files" icon={FilesIcon} label="Files" />
            <div className="mt-auto">
                {/* Apps or Help icons could go here */}
                <button className="flex flex-col items-center justify-center w-full h-14 text-gray-400 hover:text-white">
                    <MoreHorizontal size={24} />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

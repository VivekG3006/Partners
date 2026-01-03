import { Search, Minus, Square, X } from 'lucide-react';

const TopBar = () => {
    return (
        <div className="h-[48px] bg-[#464775] flex items-center justify-between px-3 select-none text-white">
            <div className="flex items-center gap-4 w-[250px]">
                <span className="font-semibold text-sm">Microsoft Teams</span>
            </div>

            <div className="flex-1 max-w-[600px] mx-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search"
                        className="block w-full pl-10 pr-3 py-1.5 border-none rounded-[4px] leading-5 bg-[#D6D7E3] text-gray-900 placeholder-gray-600 focus:outline-none focus:bg-white focus:ring-0 sm:text-sm shadow-sm"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 w-[250px] justify-end">
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-xs font-bold cursor-pointer border-2 border-transparent hover:border-white">
                    VJ
                </div>
                {/* Window Controls Imitation (since it's a clone) */}
                <div className="flex items-center gap-4 pl-4 text-gray-300">
                    <Minus size={18} className="cursor-pointer hover:text-white" />
                    <Square size={16} className="cursor-pointer hover:text-white" />
                    <X size={18} className="cursor-pointer hover:text-white" />
                </div>
            </div>
        </div>
    );
};

export default TopBar;

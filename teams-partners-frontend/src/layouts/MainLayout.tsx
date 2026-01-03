import { Outlet } from 'react-router-dom';
import TopBar from '../components/Navigation/TopBar';
import Sidebar from '../components/Navigation/Sidebar';

const MainLayout = () => {
    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
            <TopBar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex overflow-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;

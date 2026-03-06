import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
    const { user, loading } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 animate-pulse">Loading Workspace...</p>
            </div>
        </div>
    );
    if (!user) return <Navigate to="/login" />;

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar />

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50 shadow-sm">
                <span className="text-xl font-bold text-slate-800">StudyUp</span>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-500 hover:text-slate-800"
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;

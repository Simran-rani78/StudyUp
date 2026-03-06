import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    History, Clock, BookOpen, ChevronRight,
    Calendar, Search, Filter
} from 'lucide-react';

const ActivityHistory = () => {
    const [studies, setStudies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudies = async () => {
            try {
                const { data } = await api.get('/studies');
                setStudies(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudies();
    }, []);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-800">Activity History</h1>
                <p className="text-slate-500 mt-1">Timeline of your past study sessions.</p>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">All Activities</h3>
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                        Live Updates
                    </div>
                </div>

                <div className="divide-y divide-slate-200">
                    {loading ? (
                        [1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="p-6 animate-pulse flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))
                    ) : Array.isArray(studies) && studies.length > 0 ? (
                        studies.map((study) => (
                            <div key={study._id} className="p-6 flex items-center gap-6 hover:bg-slate-50 transition-all group">
                                <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px] text-center">
                                    <div className="text-xl font-bold text-slate-800">
                                        {new Date(study.date).getDate()}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                                        {new Date(study.date).toLocaleDateString('en-US', { month: 'short' })}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-2xl ${study.status === 'Completed' ? 'bg-green-50 text-green-500' :
                                    study.status === 'In Progress' ? 'bg-blue-50 text-blue-500' : 'bg-yellow-50 text-yellow-500'
                                    }`}>
                                    <BookOpen className="w-6 h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800 truncate group-hover:text-primary-600 transition-colors uppercase text-xs tracking-wider">
                                            {study.subject}
                                        </h4>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-400 text-xs">{storyTime(study.date)}</span>
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-700 mb-1 truncate">{study.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{study.duration} minutes</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`w-2 h-2 rounded-full ${study.status === 'Completed' ? 'bg-green-500' :
                                                study.status === 'In Progress' ? 'bg-blue-500' : 'bg-yellow-500'
                                                }`}></span>
                                            <span>{study.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </div>
                        ))
                    ) : (
                        <div className="p-20 text-center">
                            <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No activity history yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper function for relative time (very basic version)
const storyTime = (dateStr) => {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Unknown date';
        const now = new Date();
        const diff = Math.abs(now - date);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    } catch (e) {
        return 'Recently';
    }
};

export default ActivityHistory;

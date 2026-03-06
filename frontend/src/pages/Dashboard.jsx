import { useState } from 'react';
import useDashboardAnalytics from '../hooks/useDashboardAnalytics';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Clock, BookOpen, CheckCircle2, AlertCircle, TrendingUp, Lightbulb, Flame, Timer, Footprints, Award } from 'lucide-react';
import ConsistencyScoreCard from '../components/Analytics/ConsistencyScoreCard';
import WeakSubjectsGrid from '../components/Analytics/WeakSubjectsGrid';
import RecommendationsList from '../components/Analytics/RecommendationsList';

const Dashboard = () => {
    const [showAllInsights, setShowAllInsights] = useState(false);
    const {
        analytics,
        weakSubjectData,
        consistency,
        recommendations,
        loading,
    } = useDashboardAnalytics();

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 glass-card bg-slate-100"></div>
            ))}
        </div>
    );

    const stats = [
        { label: 'Total Hours', value: analytics?.totalHours || 0, icon: Clock, color: 'text-blue-500' },
        { label: 'Sessions', value: analytics?.totalSessions || 0, icon: BookOpen, color: 'text-purple-500' },
        { label: 'Completed', value: analytics?.completedSessions || 0, icon: CheckCircle2, color: 'text-green-500' },
        { label: 'Success Rate', value: `${analytics?.completionRate || 0}%`, icon: TrendingUp, color: 'text-orange-500' },
        { label: 'Study Streak', value: `${analytics?.streak || 0} Days`, icon: Flame, color: 'text-red-500' },
    ];

    const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

    const getBadgeIcon = (iconName) => {
        switch (iconName) {
            case 'Footprints': return <Footprints className="w-6 h-6" />;
            case 'Flame': return <Flame className="w-6 h-6" />;
            case 'Timer': return <Timer className="w-6 h-6" />;
            case 'BookOpen': return <BookOpen className="w-6 h-6" />;
            default: return <Award className="w-6 h-6" />;
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <header>
                <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
                <p className="text-slate-500 mt-1">Track your progress and study habits.</p>
            </header>

            {/* Stats Grid + Consistency Score */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="glass-card p-6 flex items-center justify-between group hover:border-primary-300 transition-all cursor-default"
                    >
                        <div>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
                        </div>
                        <div
                            className={`p-3 rounded-xl bg-slate-100 ${stat.color} group-hover:scale-110 transition-transform`}
                        >
                            <stat.icon className="w-6 h-6" />
                        </div>
                    </div>
                ))}

                <ConsistencyScoreCard
                    score={consistency?.consistencyScore || 0}
                    level={consistency?.level || 'Poor'}
                />
            </div>
            {/* Achievements Section */}
            {analytics?.badges?.length > 0 && (
                <div className="glass-card p-6 bg-white border-primary-100">
                    <div className="flex items-center gap-3 mb-6">
                        <Award className="w-6 h-6 text-primary-500" />
                        <h2 className="text-xl font-bold text-slate-800">Your Achievements</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {analytics.badges.map((badge) => (
                            <div
                                key={badge.id}
                                className={`flex items-start gap-4 p-4 rounded-xl border border-slate-100 transition-all hover:shadow-md ${badge.bg || 'bg-slate-50'}`}
                            >
                                <div className={`p-3 rounded-lg bg-white shadow-sm ${badge.color || 'text-primary-600'}`}>
                                    {getBadgeIcon(badge.icon)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">{badge.name}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{badge.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weekly Activity Chart */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">Weekly Activity (Duration)</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.weeklyActivity || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: '#0ea5e9' }}
                                />
                                <Bar dataKey="duration" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Insights & Quick Tips */}
                <div className="glass-card p-6 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        <h3 className="text-lg font-semibold text-slate-800">AI Insights</h3>
                    </div>
                    <div className="space-y-4">
                        {analytics?.insights?.length > 0 ? (
                            (showAllInsights ? analytics.insights : analytics.insights.slice(0, 3)).map(
                                (insight, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-lg bg-primary-50 border border-primary-200 flex gap-3"
                                    >
                                        <span className="text-primary-500">•</span>
                                        <p className="text-sm text-slate-600">{insight}</p>
                                    </div>
                                )
                            )
                        ) : (
                            <p className="text-slate-400 text-sm italic">
                                Add more study sessions to see personalized insights.
                            </p>
                        )}
                        {analytics?.insights?.length > 3 && (
                            <button
                                type="button"
                                onClick={() => setShowAllInsights((prev) => !prev)}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                                {showAllInsights ? 'Show less' : 'Show all insights'}
                            </button>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-5 h-5 text-primary-500" />
                            <h4 className="text-sm font-semibold text-slate-800">Subject Breakdown</h4>
                        </div>
                        <div className="space-y-3">
                            {analytics?.subjectStats && Object.keys(analytics.subjectStats).length > 0 ? (
                                Object.keys(analytics.subjectStats)
                                    .slice(0, 3)
                                    .map((subj, idx) => {
                                        const stat = analytics.subjectStats[subj];
                                        const totalHours = parseFloat(analytics.totalHours || 0);
                                        const percentage =
                                            totalHours > 0
                                                ? (stat.duration / (totalHours * 60)) * 100
                                                : 0;

                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-500">{subj}</span>
                                                    <span className="text-slate-700">
                                                        {(stat.duration / 60).toFixed(1)} hrs
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary-500"
                                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <p className="text-slate-400 text-xs italic">No data available yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Weak Subjects & Smart Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <WeakSubjectsGrid weakSubjects={weakSubjectData.weakSubjects} />
                </div>
                <div>
                    <RecommendationsList recommendations={recommendations} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { Users, BookOpen, BarChart3, Trash2, Loader2 } from 'lucide-react';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [users, setUsers] = useState([]);
    const [studies, setStudies] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const totals = useMemo(() => {
        const totalUsers = users?.length || 0;
        const totalStudies = studies?.length || 0;
        const totalHours = analytics?.global?.totalHours ?? null;
        const completionRate = analytics?.global?.completionRate ?? null;
        return { totalUsers, totalStudies, totalHours, completionRate };
    }, [users, studies, analytics]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [usersRes, studiesRes, analyticsRes] = await Promise.all([
                    api.get('/admin/users'),
                    api.get('/admin/studies'),
                    api.get('/admin/analytics'),
                ]);
                if (!mounted) return;
                setUsers(usersRes.data || []);
                setStudies(studiesRes.data || []);
                setAnalytics(analyticsRes.data || null);
            } catch (e) {
                if (!mounted) return;
                setError(e.response?.data?.message || 'Failed to load admin data');
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);

    const handleDeleteStudy = async (id) => {
        setDeletingId(id);
        setError('');
        try {
            await api.delete(`/admin/study/${id}`);
            setStudies((prev) => prev.filter((s) => (s._id || s.id) !== id));
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to delete study');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 className="animate-spin w-5 h-5" />
                    <span>Loading admin workspace…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
                <p className="text-slate-500">Manage users, study records, and global analytics.</p>
            </header>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">Users</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{totals.totalUsers}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-500">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">Study Records</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{totals.totalStudies}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50 text-purple-500">
                        <BookOpen className="w-6 h-6" />
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">Total Hours (All)</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">
                            {totals.totalHours ?? '—'}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-50 text-green-500">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">Completion Rate (All)</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">
                            {typeof totals.completionRate === 'number' ? `${totals.completionRate}%` : '—'}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-orange-50 text-orange-500">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Users
                    </h2>
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-500 border-b border-slate-200">
                                    <th className="text-left py-2 pr-2">Name</th>
                                    <th className="text-left py-2 pr-2">Email</th>
                                    <th className="text-left py-2 pr-2">Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u._id || u.id} className="border-b border-slate-100 text-slate-700">
                                        <td className="py-2 pr-2">{u.name}</td>
                                        <td className="py-2 pr-2">{u.email}</td>
                                        <td className="py-2 pr-2">
                                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                                                {u.role || 'user'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td className="py-6 text-slate-400 italic" colSpan={3}>
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-500" />
                        Study Records
                    </h2>
                    <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                        {studies.map((s) => {
                            const id = s._id || s.id;
                            const who = s.user?.email || s.user?.name || s.user;
                            return (
                                <div
                                    key={id}
                                    className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-4"
                                >
                                    <div className="min-w-0">
                                        <p className="text-slate-800 font-medium truncate">
                                            {s.title} <span className="text-slate-400 font-normal">({s.subject})</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1 truncate">
                                            User: {who || '—'} · {Number(s.duration) || 0} min · {s.status || '—'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteStudy(id)}
                                        disabled={deletingId === id}
                                        className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 disabled:opacity-60"
                                    >
                                        {deletingId === id ? (
                                            <Loader2 className="animate-spin w-4 h-4" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        Delete
                                    </button>
                                </div>
                            );
                        })}
                        {studies.length === 0 && (
                            <p className="text-slate-400 italic text-sm">No study records found.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminDashboard;

import { useState, useEffect } from 'react';
import api from '../utils/api';
import PomodoroTimer from '../components/Studies/PomodoroTimer';
import {
    Plus, Search, Filter, MoreVertical, Edit2, Trash2,
    Calendar, Clock, Tag, CheckCircle2, Clock3, AlertCircle, BookOpen
} from 'lucide-react';

const StudyManagement = () => {
    const [studies, setStudies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        description: '',
        notes: '',
        duration: '',
        status: 'Pending',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchStudies();
    }, []);

    const handleLogFromTimer = (minutes, subject) => {
        setFormData(prev => ({
            ...prev,
            duration: minutes,
            subject: subject || prev.subject,
            status: 'Completed',
            title: `Focused Session - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        }));
        setShowModal(true);
    };

    const fetchStudies = async () => {
        try {
            const { data } = await api.get('/studies');
            setStudies(data);
        } catch (err) {
            console.error('StudyManagement Fetch Error:', err);
            // Fallback to empty array to prevent map failures
            setStudies([]);
        } finally {
            setLoading(false);
        }
    };

    // Extract unique subjects for the timer dropdown
    const uniqueSubjects = studies && Array.isArray(studies)
        ? [...new Set(studies.map(s => s.subject).filter(Boolean))]
        : [];

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...formData,
            duration: Number(formData.duration) || 0,
        };

        try {
            if (editingId) {
                await api.put(`/studies/${editingId}`, payload);
            } else {
                await api.post('/studies', payload);
            }
            await fetchStudies();
            // Notify analytics views (dashboard, analytics page) to refresh
            window.dispatchEvent(new Event('study-data-changed'));
            handleCloseModal();
        } catch (err) {
            console.error('StudyManagement Save Error:', err?.response || err);
            alert(
                err?.response?.data?.message ||
                'Something went wrong while saving the study session. Please check DevTools → Console for details.'
            );
        }
    };

    const handleEdit = (study) => {
        const safeDate = study.date ? new Date(study.date) : new Date();
        setFormData({
            title: study.title,
            subject: study.subject,
            description: study.description || '',
            notes: study.notes || '',
            duration: study.duration,
            status: study.status,
            date: !isNaN(safeDate.getTime()) ? safeDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setEditingId(study._id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this session?')) {
            try {
                await api.delete(`/studies/${id}`);
                fetchStudies();
                // Notify analytics views (dashboard, analytics page) to refresh
                window.dispatchEvent(new Event('study-data-changed'));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({
            title: '',
            subject: '',
            description: '',
            notes: '',
            duration: '',
            status: 'Pending',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const filteredStudies = Array.isArray(studies) ? studies.filter(s => {
        const title = s.title || '';
        const subject = s.subject || '';
        const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    }) : [];

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'In Progress': return <Clock className="w-4 h-4 text-blue-500" />;
            default: return <AlertCircle className="w-4 h-4 text-yellow-500" />;
        }
    };

    const formatDate = (date) => {
        try {
            return new Date(date).toLocaleDateString();
        } catch (e) {
            return 'N/A';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Study Sessions</h1>
                    <p className="text-slate-500 mt-1">Manage and track your study activities.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary w-full md:w-auto"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Session
                </button>
            </div>

            {/* Pomodoro & Welcome */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-1">
                    <PomodoroTimer
                        onLogSession={handleLogFromTimer}
                        availableSubjects={uniqueSubjects}
                    />
                </div>
                <div className="lg:col-span-2 glass-card p-8 flex flex-col justify-center bg-white border-primary-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-primary-50 text-primary-600">
                            <Clock3 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Ready to Focus?</h2>
                    </div>
                    <p className="text-slate-500 leading-relaxed max-w-xl">
                        Use the built-in Pomodoro timer to help you stay focused during your study sessions.
                        Once you're done, click the **Log Session** icon to automatically record your productivity.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">#Productivity</span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">#Focus</span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">#Pomodoro</span>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by topic or subject..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['All', 'Pending', 'In Progress', 'Completed'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === status
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Studies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-64 glass-card animate-pulse bg-slate-100"></div>)
                ) : filteredStudies.length > 0 ? (
                    filteredStudies.map(study => (
                        <div key={study._id} className="glass-card p-6 flex flex-col h-full hover:border-slate-300 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 bg-primary-50 text-primary-600 text-xs font-bold rounded-full uppercase tracking-wider">
                                    {study.subject}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEdit(study)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(study._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1">{study.title}</h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                                {study.description || 'No description provided.'}
                            </p>

                            {study.notes && (
                                <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100 italic text-xs text-slate-600 line-clamp-3">
                                    <span className="font-bold block not-italic mb-1 uppercase tracking-widest text-[10px] text-slate-400">Session Notes</span>
                                    {study.notes}
                                </div>
                            )}

                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDate(study.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Clock className="w-4 h-4" />
                                        <span>{study.duration} min</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    {getStatusIcon(study.status)}
                                    <span className={
                                        study.status === 'Completed' ? 'text-green-500' :
                                            study.status === 'In Progress' ? 'text-blue-500' : 'text-yellow-500'
                                    }>
                                        {study.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center glass-card">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No study sessions found matching your criteria.</p>
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={handleCloseModal}></div>
                    <div className="relative w-full max-w-lg glass-card p-8 animate-in fade-in zoom-in duration-200 bg-white">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">
                            {editingId ? 'Edit Study Session' : 'Add New Session'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">Title</label>
                                <input
                                    type="text" required className="input-field"
                                    value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Minimax Algorithm Implementation"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">Subject</label>
                                    <input
                                        type="text" required className="input-field"
                                        value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        placeholder="e.g. Computer Science"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">Duration (min)</label>
                                    <input
                                        type="number" required className="input-field"
                                        value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                        placeholder="60"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">Short Description (Optional)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Quick summary..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">Detailed Session Notes 📝</label>
                                <textarea
                                    className="input-field min-h-[120px]"
                                    value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="What exactly did you achieve? Any reflections?"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">Status</label>
                                    <select
                                        className="input-field"
                                        value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">Date</label>
                                    <input
                                        type="date" className="input-field"
                                        value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 transition-all font-medium">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 btn-primary">
                                    {editingId ? 'Update Session' : 'Save Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyManagement;

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Send } from 'lucide-react';

const PomodoroTimer = ({ onLogSession, availableSubjects = [] }) => {
    const [minutes, setMinutes] = useState(25);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('work'); // 'work' or 'break'
    const [totalDuration, setTotalDuration] = useState(25);
    const [selectedSubject, setSelectedSubject] = useState('');
    const timerRef = useRef(null);

    const totalSecondsLeft = minutes * 60 + seconds;
    const progress = ((totalDuration * 60 - totalSecondsLeft) / (totalDuration * 60)) * 100;

    // Tab Title Sync
    useEffect(() => {
        if (isActive) {
            document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} | ${mode === 'work' ? 'Focusing...' : 'Break Time'}`;
        } else {
            document.title = 'Study Tracker';
        }
        return () => { document.title = 'Study Tracker'; };
    }, [isActive, minutes, seconds, mode]);

    const playNotification = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (err) {
            console.error('Audio error:', err);
        }
    };

    useEffect(() => {
        if (isActive) {
            timerRef.current = setInterval(() => {
                if (seconds > 0) {
                    setSeconds(seconds - 1);
                } else if (minutes > 0) {
                    setMinutes(minutes - 1);
                    setSeconds(59);
                } else {
                    clearInterval(timerRef.current);
                    setIsActive(false);
                    playNotification();
                    setTimeout(() => {
                        alert(mode === 'work' ? 'Time for a break!' : 'Back to work!');
                    }, 500);
                }
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, minutes, seconds, mode]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setMinutes(totalDuration);
        setSeconds(0);
    };

    const setDuration = (mins) => {
        setIsActive(false);
        setTotalDuration(mins);
        setMinutes(mins);
        setSeconds(0);
    };

    const switchMode = (newMode) => {
        setIsActive(false);
        setMode(newMode);
        const mins = newMode === 'work' ? 25 : 5;
        setTotalDuration(mins);
        setMinutes(mins);
        setSeconds(0);
    };

    const handleLog = () => {
        setIsActive(false);
        const elapsedSeconds = totalDuration * 60 - totalSecondsLeft;
        const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
        onLogSession(elapsedMinutes, selectedSubject);
    };

    return (
        <div className={`glass-card p-6 bg-white border-primary-100 shadow-xl overflow-hidden relative transition-all duration-500 ${isActive && mode === 'work' ? 'ring-2 ring-primary-400 ring-offset-2' : ''}`}>
            {/* Progress Background */}
            <div
                className="absolute bottom-0 left-0 h-1 bg-primary-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
            ></div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${mode === 'work' ? 'bg-primary-50 text-primary-600' : 'bg-green-50 text-green-600'}`}>
                        {mode === 'work' ? <Brain className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
                    </div>
                    <span className="font-bold uppercase tracking-wider text-xs text-slate-500">
                        {mode === 'work' ? 'Focus Mode' : 'Break Time'}
                    </span>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                        onClick={() => switchMode('work')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'work' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                        Work
                    </button>
                    <button
                        onClick={() => switchMode('break')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'break' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                        Break
                    </button>
                </div>
            </div>

            {/* Subject Selection */}
            {mode === 'work' && (
                <div className="mb-4">
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        disabled={isActive}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 transition-all"
                    >
                        <option value="">Select a subject...</option>
                        {availableSubjects.map((subj, idx) => (
                            <option key={idx} value={subj}>{subj}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="text-center py-4">
                <div className={`text-7xl font-black mb-2 tracking-tighter tabular-nums transition-all duration-1000 ${isActive ? 'scale-110 text-primary-600' : 'text-slate-800'}`}>
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <p className="text-slate-400 text-sm font-medium animate-pulse">
                    {isActive ? (mode === 'work' ? 'Deep focus in progress...' : 'Enjoy your break!') : 'Ready to start?'}
                </p>
            </div>

            {/* Manual Duration Presets */}
            <div className="flex justify-center gap-2 mb-8">
                {[15, 25, 45, 60].map((mins) => (
                    <button
                        key={mins}
                        onClick={() => setDuration(mins)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border ${totalDuration === mins
                            ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-primary-300 hover:text-primary-600'
                            }`}
                    >
                        {mins}M
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-center gap-6">
                <button
                    onClick={resetTimer}
                    className="p-3 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-200"
                    title="Reset"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <button
                    onClick={toggleTimer}
                    className={`h-20 w-20 flex items-center justify-center rounded-full transition-all shadow-xl hover:scale-105 active:scale-95 ${isActive
                        ? 'bg-red-50 text-red-600 border-2 border-red-200'
                        : 'bg-primary-600 text-white'
                        }`}
                >
                    {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                </button>
                <button
                    onClick={handleLog}
                    className="p-3 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-all border border-slate-200"
                    title="Log Session"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>

            {mode === 'work' && (
                <div className="mt-8 pt-4 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={handleLog}
                        className="text-primary-600 hover:text-primary-700 text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        Finish & Log Session
                    </button>
                </div>
            )}
        </div>
    );
};

export default PomodoroTimer;

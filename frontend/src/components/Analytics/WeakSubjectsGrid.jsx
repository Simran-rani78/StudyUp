import React from 'react';
import { AlertTriangle } from 'lucide-react';

const WeakSubjectsGrid = ({ weakSubjects = [] }) => {
    if (!weakSubjects || weakSubjects.length === 0) {
        return (
            <div className="glass-card p-6 flex items-center gap-3">
                <div className="rounded-full bg-amber-50 p-1.5 flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">Weak Subjects</h3>
                    <p className="text-xs md:text-sm text-slate-500">
                        No weak subjects detected yet. Keep your study distribution balanced.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="rounded-full bg-amber-50 p-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">Weak Subjects</h3>
                    <p className="text-xs md:text-sm text-slate-500">
                        Subjects below 20% of your total study time.
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {weakSubjects.map((subj) => (
                    <div
                        key={subj.subject}
                        className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex flex-col gap-2"
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-amber-800">
                                {subj.subject}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border border-amber-300 bg-amber-100 text-[11px] font-semibold uppercase tracking-widest text-amber-700">
                                {subj.percentage.toFixed ? subj.percentage.toFixed(1) : subj.percentage}%
                            </span>
                        </div>
                        <p className="text-xs text-amber-700">
                            Total time: <span className="font-semibold">{subj.totalTime} min</span>
                        </p>
                        <p className="text-[11px] text-amber-600">
                            Try scheduling extra focused sessions to bring this subject closer to your
                            stronger areas.
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeakSubjectsGrid;

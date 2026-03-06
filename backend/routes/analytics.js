const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Study = require('../models/Study');
const MemoryStore = require('../utils/memoryStore');
const { protect } = require('../middleware/auth');

const isMongoId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);
const getUserId = (user) => user._id || user.id;

// Helper: fetch all studies for current user with DB → MemoryStore fallback
const getUserStudies = async (user) => {
    const userId = getUserId(user);
    let studies = null;

    if (isMongoId(userId)) {
        studies = await Study.find({ user: userId }).catch(() => null);
    }

    if (studies === null) {
        studies = MemoryStore.getStudies(userId);
    }

    return { userId, studies };
};

// Helper: create a local date key in YYYY-MM-DD (timezone-agnostic for our charts)
const getLocalDateKey = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    // en-CA => YYYY-MM-DD
    return d.toLocaleDateString('en-CA');
};

// Helper: build last N days buckets (including today), using local date keys
const buildDailyBuckets = (days = 7) => {
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const fullDate = getLocalDateKey(d);
        buckets.push({
            date: d.toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate,
            duration: 0,
        });
    }
    return buckets;
};

// Helper: classify subjects into weak/strong based on percentage share of total time
const classifySubjectsByTimeShare = (subjectDurations) => {
    const entries = Object.entries(subjectDurations || {});
    const totalTime = entries.reduce((acc, [, time]) => acc + time, 0);

    const weakSubjects = [];
    const strongSubjects = [];

    if (totalTime === 0) {
        return { weakSubjects, strongSubjects };
    }

    entries.forEach(([subject, totalTimeForSubject]) => {
        const percentage = (totalTimeForSubject / totalTime) * 100;
        const payload = {
            subject,
            totalTime: totalTimeForSubject,
            percentage: Number(percentage.toFixed(1)),
        };

        if (percentage < 20) {
            weakSubjects.push(payload);
        } else {
            strongSubjects.push(payload);
        }
    });

    return { weakSubjects, strongSubjects };
};

// Helper: compute weak/strong subjects primarily via Mongo aggregation, with MemoryStore fallback
const computeWeakAndStrongSubjects = async (user) => {
    const userId = getUserId(user);

    // Prefer Mongo aggregation when user is persisted in DB
    if (isMongoId(userId)) {
        try {
            const results = await Study.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId.toString()) } },
                { $group: { _id: '$subject', totalTime: { $sum: '$duration' } } },
            ]);

            const subjectDurations = {};
            results.forEach((row) => {
                if (!row._id) return;
                subjectDurations[row._id] = row.totalTime || 0;
            });

            return classifySubjectsByTimeShare(subjectDurations);
        } catch (err) {
            // Fall through to in-memory calculation if aggregation fails
            console.error('Weak subjects aggregation failed, falling back to MemoryStore/JS:', err.message);
        }
    }

    // MemoryStore / JS fallback
    const { studies } = await getUserStudies(user);
    const subjectDurations = {};

    studies.forEach((s) => {
        if (!s.subject) return;
        const duration = Number(s.duration) || 0;
        subjectDurations[s.subject] = (subjectDurations[s.subject] || 0) + duration;
    });

    return classifySubjectsByTimeShare(subjectDurations);
};

// Helper: compute current study streak
const computeStreak = (studies) => {
    if (!Array.isArray(studies) || studies.length === 0) return 0;

    const uniqueDays = new Set();
    studies.forEach((s) => {
        const sourceDate = s.date || s.createdAt;
        if (!sourceDate) return;
        const d = new Date(sourceDate);
        if (!isNaN(d.getTime())) {
            // Using YYYY-MM-DD for consistency
            uniqueDays.add(d.toISOString().split('T')[0]);
        }
    });

    const sortedDays = Array.from(uniqueDays).sort((a, b) => b.localeCompare(a));
    if (sortedDays.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if the latest study session was either today or yesterday
    // If neither, the streak is broken.
    const latestStudyDay = sortedDays[0];
    if (latestStudyDay !== todayStr && latestStudyDay !== yesterdayStr) {
        return 0;
    }

    let streak = 0;
    let currentCheckDate = new Date(latestStudyDay);

    // Count backwards from the latest study day
    while (true) {
        const checkStr = currentCheckDate.toISOString().split('T')[0];
        if (uniqueDays.has(checkStr)) {
            streak++;
            currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
};

// Helper: compute consistency score (0–100) and qualitative level
const computeConsistencyScore = (studies) => {
    if (!Array.isArray(studies) || studies.length === 0) {
        return { consistencyScore: 0, level: 'Poor' };
    }

    // Find earliest study date
    let firstDate = null;
    const uniqueDays = new Set();

    studies.forEach((s) => {
        if (!s.date) return;
        const d = new Date(s.date);
        if (Number.isNaN(d.getTime())) return;

        const dayKey = d.toISOString().split('T')[0];
        uniqueDays.add(dayKey);

        if (!firstDate || d < firstDate) {
            firstDate = d;
        }
    });

    if (!firstDate) {
        return { consistencyScore: 0, level: 'Poor' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    firstDate.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - firstDate.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive of both endpoints

    if (totalDays <= 0) {
        return { consistencyScore: 0, level: 'Poor' };
    }

    const studyDays = uniqueDays.size;
    const rawScore = (studyDays / totalDays) * 100;
    const consistencyScore = Math.round(rawScore);

    let level = 'Poor';
    if (consistencyScore >= 71) level = 'Excellent';
    else if (consistencyScore >= 41) level = 'Average';

    return { consistencyScore, level };
};

// Helper: compute recommendations in a modular way for future AI integration
const buildRecommendations = ({ weakSubjects, completionRate, recentTrend }) => {
    const recommendations = [];

    if (weakSubjects && weakSubjects.length > 0) {
        const names = weakSubjects.map((s) => s.subject).join(', ');
        recommendations.push(
            `Increase focused study time for weaker subjects: ${names}. Aim to bring each to at least 20% of your total study time.`
        );
    }

    if (typeof completionRate === 'number') {
        if (completionRate < 50) {
            recommendations.push('Less than half of your study sessions are completed. Prioritize finishing pending tasks before adding new ones.');
        } else if (completionRate < 80) {
            recommendations.push('Your completion rate is decent. Consider tightening your schedule to close more sessions successfully.');
        }
    }

    if (recentTrend && recentTrend.currentTotal < recentTrend.previousTotal) {
        recommendations.push(
            'Your study time over the last 7 days is lower than the previous week. Consider scheduling shorter but consistent daily sessions to recover momentum.'
        );
    }

    return recommendations;
};

const computeBadges = (studies, streak, totalHours) => {
    const badges = [];
    if (studies.length > 0) {
        badges.push({ id: 'first-step', name: 'First Step', icon: 'Footprints', description: 'Logged your first study session!', color: 'text-blue-500', bg: 'bg-blue-50' });
    }
    if (streak >= 7) {
        badges.push({ id: 'consistency-king', name: '7-Day Streak', icon: 'Flame', description: 'Studied for 7 days in a row!', color: 'text-orange-500', bg: 'bg-orange-50' });
    }
    if (totalHours >= 24) {
        badges.push({ id: 'marathoner', name: '24-Hour Scholar', icon: 'Timer', description: 'Completed over 24 hours of study!', color: 'text-purple-500', bg: 'bg-purple-50' });
    }

    // Subject Specialist: 5+ sessions in one subject
    const subjectCounts = {};
    studies.forEach(s => {
        if (s.subject) {
            subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + 1;
        }
    });
    const hasSpecialist = Object.values(subjectCounts).some(count => count >= 5);
    if (hasSpecialist) {
        badges.push({ id: 'specialist', name: 'Subject Expert', icon: 'BookOpen', description: 'Completed 5 sessions in a single subject!', color: 'text-green-500', bg: 'bg-green-50' });
    }

    return badges;
};

// @route   GET /api/analytics
// @desc    High-level analytics for dashboard
router.get('/', protect, async (req, res) => {
    try {
        const { studies } = await getUserStudies(req.user);

        // Totals
        const totalMinutes = studies.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
        const totalHours = (totalMinutes / 60).toFixed(1);

        // Per-subject stats
        const subjectStats = {};
        studies.forEach((s) => {
            if (!s.subject) return;
            if (!subjectStats[s.subject]) {
                subjectStats[s.subject] = { duration: 0, count: 0, completed: 0 };
            }
            subjectStats[s.subject].duration += Number(s.duration) || 0;
            subjectStats[s.subject].count += 1;
            if (s.status === 'Completed') {
                subjectStats[s.subject].completed += 1;
            }
        });

        // Weekly activity (last 7 days)
        const last7Days = buildDailyBuckets(7);
        studies.forEach((s) => {
            const sourceDate = s.date || s.createdAt;
            const dayKey = getLocalDateKey(sourceDate);
            if (!dayKey) return;
            const dayIndex = last7Days.findIndex((day) => day.fullDate === dayKey);
            if (dayIndex !== -1) {
                last7Days[dayIndex].duration += Number(s.duration) || 0;
            }
        });

        const totalSessions = studies.length;
        const completedSessions = studies.filter((s) => s.status === 'Completed').length;
        const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

        // Simple AI-style insights (kept from original implementation)
        const insights = [];
        let weakSubjectByCompletion = null;
        let minRate = 101;

        Object.keys(subjectStats).forEach((subj) => {
            const stat = subjectStats[subj];
            if (!stat.count) return;
            const rate = (stat.completed / stat.count) * 100;
            if (rate < minRate) {
                minRate = rate;
                weakSubjectByCompletion = subj;
            }
        });

        if (weakSubjectByCompletion) {
            insights.push(
                `${weakSubjectByCompletion} needs more focus (Completion rate: ${Math.round(minRate)}%)`
            );
        }

        const weekendDuration = last7Days
            .filter((d) => d.date === 'Sat' || d.date === 'Sun')
            .reduce((a, b) => a + b.duration, 0);
        const weekdayDuration = last7Days
            .filter((d) => d.date !== 'Sat' && d.date !== 'Sun')
            .reduce((a, b) => a + b.duration, 0);

        if (weekendDuration > weekdayDuration) {
            insights.push('You study more on weekends');
        } else if (weekdayDuration > 0) {
            insights.push('Consistent weekday study habits detected');
        }

        const activeDays = last7Days.filter((d) => d.duration > 0).length;
        if (activeDays >= 5) {
            insights.push('Study consistency improved this week! Keep it up.');
        }

        const streak = computeStreak(studies);

        const badges = computeBadges(studies, streak, totalHours);

        res.status(200).json({
            totalHours,
            totalSessions,
            completedSessions,
            completionRate,
            subjectStats,
            weeklyActivity: last7Days,
            insights,
            streak,
            badges,
        });
    } catch (error) {
        console.error('Analytics base route error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/analytics/weak-subjects
// @desc    Detect weak vs strong subjects based on share of total study time
router.get('/weak-subjects', protect, async (req, res) => {
    try {
        const { weakSubjects, strongSubjects } = await computeWeakAndStrongSubjects(req.user);
        res.status(200).json({ weakSubjects, strongSubjects });
    } catch (error) {
        console.error('Weak subjects analytics error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/analytics/consistency-score
// @desc    Calculate study consistency score for current user
router.get('/consistency-score', protect, async (req, res) => {
    try {
        const { studies } = await getUserStudies(req.user);
        const { consistencyScore, level } = computeConsistencyScore(studies);

        res.status(200).json({
            consistencyScore,
            level,
        });
    } catch (error) {
        console.error('Consistency score analytics error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/analytics/recommendations
// @desc    Smart recommendations based on weak subjects, completion rate, and recent trends
router.get('/recommendations', protect, async (req, res) => {
    try {
        const { studies } = await getUserStudies(req.user);

        // Reuse existing completion rate logic
        const totalSessions = studies.length;
        const completedSessions = studies.filter((s) => s.status === 'Completed').length;
        const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

        // Weak subjects based on time share (uses Mongo aggregation when available)
        const { weakSubjects } = await computeWeakAndStrongSubjects(req.user);

        // Compare last 7 days vs previous 7 days
        const last7 = buildDailyBuckets(7);
        const prev14 = buildDailyBuckets(14);
        const prev7 = prev14.slice(0, 7); // first 7 of 14-day window = previous week

        studies.forEach((s) => {
            const sourceDate = s.date || s.createdAt;
            const dayKey = getLocalDateKey(sourceDate);
            if (!dayKey) return;

            const idxCurrent = last7.findIndex((day) => day.fullDate === dayKey);
            if (idxCurrent !== -1) {
                last7[idxCurrent].duration += Number(s.duration) || 0;
            }

            const idxPrev = prev7.findIndex((day) => day.fullDate === dayKey);
            if (idxPrev !== -1) {
                prev7[idxPrev].duration += Number(s.duration) || 0;
            }
        });

        const recentTrend = {
            currentTotal: last7.reduce((acc, d) => acc + d.duration, 0),
            previousTotal: prev7.reduce((acc, d) => acc + d.duration, 0),
        };

        const recommendations = buildRecommendations({
            weakSubjects,
            completionRate,
            recentTrend,
        });

        res.status(200).json({
            recommendations,
        });
    } catch (error) {
        console.error('Recommendations analytics error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;

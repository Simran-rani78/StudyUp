const mongoose = require('mongoose');
const User = require('../models/User');
const Study = require('../models/Study');
const MemoryStore = require('../utils/memoryStore');

const isMongoId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);

const getAllUsers = async (req, res) => {
    try {
        let users = await User.find().select('-password').catch(() => null);

        if (users === null) {
            users = MemoryStore.users.map(({ password, ...rest }) => rest);
        }

        res.status(200).json(users);
    } catch (error) {
        console.error('Admin getAllUsers error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getAllStudies = async (req, res) => {
    try {
        let studies = await Study.find()
            .sort({ date: -1 })
            .populate('user', 'name email role')
            .catch(() => null);

        if (studies === null) {
            studies = MemoryStore.studies;
        }

        res.status(200).json(studies);
    } catch (error) {
        console.error('Admin getAllStudies error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteAnyStudy = async (req, res) => {
    try {
        const { id } = req.params;

        if (isMongoId(id)) {
            const study = await Study.findById(id).catch(() => null);
            if (!study) {
                return res.status(404).json({ message: 'Study not found' });
            }

            await study.deleteOne();
            return res.status(200).json({ id });
        }

        const deleted = MemoryStore.deleteStudy(id);
        if (deleted) return res.status(200).json({ id });

        return res.status(404).json({ message: 'Study not found' });
    } catch (error) {
        console.error('Admin deleteAnyStudy error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Simple all-users analytics: totals per user + global totals
const getAllUsersAnalytics = async (req, res) => {
    try {
        // Prefer DB aggregation when available
        const users = await User.find().select('_id name email role').catch(() => null);
        if (users) {
            const userIds = users.map((u) => u._id);
            const rows = await Study.aggregate([
                { $match: { user: { $in: userIds } } },
                {
                    $group: {
                        _id: '$user',
                        totalMinutes: { $sum: '$duration' },
                        totalSessions: { $sum: 1 },
                        completedSessions: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
                            },
                        },
                    },
                },
            ]).catch(() => null);

            const byUser = new Map();
            (rows || []).forEach((r) => {
                byUser.set(r._id.toString(), r);
            });

            const perUser = users.map((u) => {
                const r = byUser.get(u._id.toString()) || {
                    totalMinutes: 0,
                    totalSessions: 0,
                    completedSessions: 0,
                };
                const completionRate =
                    r.totalSessions > 0 ? Math.round((r.completedSessions / r.totalSessions) * 100) : 0;
                return {
                    user: u,
                    totalHours: Number((Number(r.totalMinutes || 0) / 60).toFixed(1)),
                    totalSessions: r.totalSessions || 0,
                    completedSessions: r.completedSessions || 0,
                    completionRate,
                };
            });

            const global = perUser.reduce(
                (acc, u) => {
                    acc.totalHours += u.totalHours;
                    acc.totalSessions += u.totalSessions;
                    acc.completedSessions += u.completedSessions;
                    return acc;
                },
                { totalHours: 0, totalSessions: 0, completedSessions: 0 }
            );
            global.totalHours = Number(global.totalHours.toFixed(1));
            global.completionRate =
                global.totalSessions > 0 ? Math.round((global.completedSessions / global.totalSessions) * 100) : 0;

            return res.status(200).json({ global, perUser });
        }

        // MemoryStore fallback
        const memoryUsers = MemoryStore.users.map(({ password, ...rest }) => rest);
        const perUser = memoryUsers.map((u) => {
            const userId = u._id || u.id;
            const studies = MemoryStore.getStudies(userId);
            const totalMinutes = studies.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
            const totalSessions = studies.length;
            const completedSessions = studies.filter((s) => s.status === 'Completed').length;
            const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
            return {
                user: u,
                totalHours: Number((totalMinutes / 60).toFixed(1)),
                totalSessions,
                completedSessions,
                completionRate,
            };
        });

        const global = perUser.reduce(
            (acc, u) => {
                acc.totalHours += u.totalHours;
                acc.totalSessions += u.totalSessions;
                acc.completedSessions += u.completedSessions;
                return acc;
            },
            { totalHours: 0, totalSessions: 0, completedSessions: 0 }
        );
        global.totalHours = Number(global.totalHours.toFixed(1));
        global.completionRate =
            global.totalSessions > 0 ? Math.round((global.completedSessions / global.totalSessions) * 100) : 0;

        return res.status(200).json({ global, perUser });
    } catch (error) {
        console.error('Admin getAllUsersAnalytics error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAllUsers,
    getAllStudies,
    deleteAnyStudy,
    getAllUsersAnalytics,
};


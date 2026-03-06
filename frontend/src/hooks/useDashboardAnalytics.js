import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Reusable hook to fetch all dashboard analytics in one place.
 * - Base analytics (/analytics)
 * - Weak/strong subjects (/analytics/weak-subjects)
 * - Consistency score (/analytics/consistency-score)
 * - Smart recommendations (/analytics/recommendations)
 *
 * It also listens for a global "study-data-changed" event so that
 * any CRUD operation on studies can trigger a refresh without
 * tightly coupling pages/components.
 */
const useDashboardAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [weakSubjectData, setWeakSubjectData] = useState({
        weakSubjects: [],
        strongSubjects: [],
    });
    const [consistency, setConsistency] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [analyticsRes, weakRes, consistencyRes, recRes] = await Promise.all([
                api.get('/analytics'),
                api.get('/analytics/weak-subjects'),
                api.get('/analytics/consistency-score'),
                api.get('/analytics/recommendations'),
            ]);

            setAnalytics(analyticsRes.data);
            setWeakSubjectData({
                weakSubjects: weakRes.data.weakSubjects || [],
                strongSubjects: weakRes.data.strongSubjects || [],
            });
            setConsistency(consistencyRes.data || null);
            setRecommendations(recRes.data?.recommendations || []);
        } catch (error) {
            console.error('Dashboard analytics fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Auto-refresh when study data changes anywhere in the app
    useEffect(() => {
        const handler = () => {
            fetchAll();
        };
        window.addEventListener('study-data-changed', handler);
        return () => window.removeEventListener('study-data-changed', handler);
    }, [fetchAll]);

    return {
        analytics,
        weakSubjectData,
        consistency,
        recommendations,
        loading,
        refresh: fetchAll,
    };
};

export default useDashboardAnalytics;


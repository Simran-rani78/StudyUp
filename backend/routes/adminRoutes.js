const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const {
    getAllUsers,
    getAllStudies,
    deleteAnyStudy,
    getAllUsersAnalytics,
} = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(protect, adminMiddleware);

// GET /api/admin/users
router.get('/users', getAllUsers);

// GET /api/admin/studies
router.get('/studies', getAllStudies);

// DELETE /api/admin/study/:id
router.delete('/study/:id', deleteAnyStudy);

// GET /api/admin/analytics
router.get('/analytics', getAllUsersAnalytics);

module.exports = router;


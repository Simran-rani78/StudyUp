const express = require('express');
const router = express.Router();
const Study = require('../models/Study');
const MemoryStore = require('../utils/memoryStore');
const { protect } = require('../middleware/auth');

// Helper to check if ID is Mongo-compatible
const isMongoId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);

// @desc    Get all study sessions for current user
router.get('/', protect, async (req, res) => {
    try {
        let studies = null;

        // Only try DB if user ID is a Mongo ID
        if (isMongoId(req.user._id || req.user.id)) {
            studies = await Study.find({ user: req.user._id || req.user.id }).sort({ date: -1 }).catch(err => null);
        }

        if (studies === null) {
            console.log("DB Skip or Fail, pulling from mock store");
            studies = MemoryStore.getStudies(req.user._id || req.user.id);
        }

        res.status(200).json(studies);
    } catch (error) {
        console.error('Study Get Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create a study session
router.post('/', protect, async (req, res) => {
    const { title, subject, description, duration, status, date } = req.body;
    const userId = req.user._id || req.user.id;

    try {
        let study = null;

        // Only try DB if user ID is a Mongo ID
        if (isMongoId(userId)) {
            study = await Study.create({
                user: userId,
                title,
                subject,
                description,
                duration,
                status,
                date: date || Date.now(),
            }).catch(err => null);
        }

        if (!study) {
            console.log("DB Skip or Fail, saving to mock store");
            study = MemoryStore.addStudy({ user: userId, title, subject, description, duration, status, date: date || new Date() });
        }

        res.status(201).json(study);
    } catch (error) {
        console.error('Study Create Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update a study session
router.put('/:id', protect, async (req, res) => {
    const userId = req.user._id || req.user.id;
    try {
        let study = null;

        // Only try DB if ID is a Mongo ID
        if (isMongoId(req.params.id)) {
            study = await Study.findById(req.params.id).catch(err => null);

            if (study) {
                if (study.user.toString() !== userId.toString()) {
                    return res.status(401).json({ message: 'User not authorized' });
                }
                const updatedStudy = await Study.findByIdAndUpdate(req.params.id, req.body, { new: true });
                return res.status(200).json(updatedStudy);
            }
        }

        // Try mock store if not in DB or ID is Mock ID
        const updatedMock = MemoryStore.updateStudy(req.params.id, req.body);
        if (updatedMock) return res.status(200).json(updatedMock);

        res.status(404).json({ message: 'Study not found' });
    } catch (error) {
        console.error('Study Update Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Delete a study session
router.delete('/:id', protect, async (req, res) => {
    const userId = req.user._id || req.user.id;
    try {
        let study = null;

        // Only try DB if ID is a Mongo ID
        if (isMongoId(req.params.id)) {
            study = await Study.findById(req.params.id).catch(err => null);

            if (study) {
                if (study.user.toString() !== userId.toString()) {
                    return res.status(401).json({ message: 'User not authorized' });
                }
                await study.deleteOne();
                return res.status(200).json({ id: req.params.id });
            }
        }

        // Try mock store
        const deleted = MemoryStore.deleteStudy(req.params.id);
        if (deleted) return res.status(200).json({ id: req.params.id });

        res.status(404).json({ message: 'Study not found' });
    } catch (error) {
        console.error('Study Delete Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MemoryStore = require('../utils/memoryStore');
const bcrypt = require('bcryptjs');

// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    try {
        let userExists = null;
        // Attempt DB check only if MongoDB might be alive (optional, but keep it logic safe)
        try {
            userExists = await User.findOne({ email }).catch(err => null);
        } catch (e) {
            userExists = null;
        }

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        let user = null;
        try {
            // Role is always "user" at registration time; admin must be assigned manually.
            user = await User.create({ name, email, password, role: 'user' }).catch(err => null);
        } catch (e) {
            user = null;
        }

        if (!user) {
            console.log("DB Failed, falling back to mock mode for Registration");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            user = MemoryStore.addUser({ name, email, password: hashedPassword });
        }

        const id = user._id || user.id;
        const role = user.role || 'user';
        res.status(201).json({ _id: id, name: user.name, email: user.email, role, token: generateToken(id, role) });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email }).catch(err => null);

        // Check mock store if DB failed or user not found
        if (!user) {
            user = MemoryStore.findUser(email);
        }

        if (user && (user.matchPassword ? await user.matchPassword(password) : await bcrypt.compare(password, user.password))) {
            const id = user._id || user.id;
            const role = user.role || 'user';
            res.json({ _id: id, name: user.name, email: user.email, role, token: generateToken(id, role) });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const router = express.Router();

router.post('/gallery-login', (req, res) => {
    const { accessCode, email } = req.body;
    
    db.get(
        'SELECT * FROM galleries WHERE access_code = ? AND client_email = ?',
        [accessCode.toUpperCase(), email],
        (err, gallery) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!gallery) return res.status(401).json({ error: 'Invalid access code or email' });
            
            const token = jwt.sign(
                { galleryId: gallery.id, type: 'gallery' },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                token,
                gallery: {
                    id: gallery.gallery_id,
                    name: gallery.name,
                    clientName: gallery.client_name,
                    eventDate: gallery.event_date,
                    allowDownloads: gallery.allow_downloads,
                    allowPrints: gallery.allow_prints
                }
            });
        }
    );
});

router.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;
    
    db.get(
        'SELECT * FROM users WHERE email = ? AND role = "admin"',
        [username],
        async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });
            
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
            
            const token = jwt.sign(
                { userId: user.id, role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE }
            );
            
            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }
    );
});

router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
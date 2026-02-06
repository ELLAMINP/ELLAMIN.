const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/galleries'));
    },
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only images allowed'));
    }
});

router.post('/', (req, res) => {
    const { name, clientName, clientEmail, eventDate } = req.body;
    const galleryId = 'GL' + uuidv4().split('-')[0].toUpperCase();
    const accessCode = clientName.substring(0, 3).toUpperCase() + '-' + new Date().getFullYear();
    
    db.run(
        `INSERT INTO galleries (gallery_id, name, client_name, client_email, access_code, event_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [galleryId, name, clientName, clientEmail, accessCode, eventDate],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            res.status(201).json({
                id: this.lastID,
                galleryId,
                accessCode,
                message: 'Gallery created successfully'
            });
        }
    );
});

router.post('/:id/photos', upload.array('photos', 50), (req, res) => {
    const files = req.files;
    
    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const insertPromises = files.map(file => {
        return new Promise((resolve, reject) => {
            const url = `/uploads/galleries/${file.filename}`;
            db.run(
                'INSERT INTO photos (gallery_id, filename, original_name, url, file_size) VALUES (?, ?, ?, ?, ?)',
                [req.params.id, file.filename, file.originalname, url, file.size],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, url });
                }
            );
        });
    });
    
    Promise.all(insertPromises)
        .then(results => res.json({ uploaded: results.length, photos: results }))
        .catch(err => res.status(500).json({ error: err.message }));
});

router.get('/access/:code', (req, res) => {
    db.get(
        `SELECT g.*, GROUP_CONCAT(p.url) as photo_urls
         FROM galleries g
         LEFT JOIN photos p ON g.id = p.gallery_id
         WHERE g.access_code = ?
         GROUP BY g.id`,
        [req.params.code.toUpperCase()],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Gallery not found' });
            
            res.json({
                id: row.gallery_id,
                name: row.name,
                clientName: row.client_name,
                eventDate: row.event_date,
                photos: row.photo_urls ? row.photo_urls.split(',') : [],
                allowDownloads: row.allow_downloads,
                allowPrints: row.allow_prints
            });
        }
    );
});

router.get('/', (req, res) => {
    db.all(
        `SELECT g.*, COUNT(p.id) as photo_count
         FROM galleries g
         LEFT JOIN photos p ON g.id = p.gallery_id
         GROUP BY g.id
         ORDER BY g.created_at DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

module.exports = router;
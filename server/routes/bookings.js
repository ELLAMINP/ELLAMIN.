const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const router = express.Router();

router.get('/availability', (req, res) => {
    const { year, month } = req.query;
    
    db.all(
        `SELECT booking_date, booking_time, status 
         FROM bookings 
         WHERE strftime('%Y-%m', booking_date) = ?`,
        [`${year}-${month}`],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const availability = {};
            rows.forEach(row => {
                if (!availability[row.booking_date]) {
                    availability[row.booking_date] = [];
                }
                availability[row.booking_date].push({
                    time: row.booking_time,
                    status: row.status
                });
            });
            
            res.json(availability);
        }
    );
});

router.post('/', (req, res) => {
    const {
        clientName,
        clientEmail,
        clientPhone,
        serviceType,
        bookingDate,
        bookingTime,
        notes
    } = req.body;
    
    const bookingId = 'BK' + uuidv4().split('-')[0].toUpperCase();
    
    db.run(
        `INSERT INTO bookings (
            booking_id, client_name, client_email, client_phone,
            service_type, booking_date, booking_time, notes, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bookingId, clientName, clientEmail, clientPhone, serviceType, 
         bookingDate, bookingTime, notes, 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            res.status(201).json({
                id: this.lastID,
                bookingId,
                message: 'Booking created successfully',
                status: 'pending'
            });
        }
    );
});

router.get('/', (req, res) => {
    db.all('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 50', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    
    db.run(
        'UPDATE bookings SET status = ? WHERE booking_id = ?',
        [status, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes > 0 });
        }
    );
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM bookings WHERE booking_id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes > 0 });
    });
});

module.exports = router;
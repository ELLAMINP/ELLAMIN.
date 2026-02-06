const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const router = express.Router();

router.post('/', (req, res) => {
    const { galleryId, clientEmail, items, totalAmount, paymentIntent } = req.body;
    const orderId = 'ORD' + uuidv4().split('-')[0].toUpperCase();
    
    db.run(
        `INSERT INTO orders (order_id, gallery_id, client_email, items, total_amount, payment_intent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, galleryId, clientEmail, JSON.stringify(items), totalAmount, paymentIntent],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            res.status(201).json({
                id: this.lastID,
                orderId,
                message: 'Order created successfully'
            });
        }
    );
});

router.get('/', (req, res) => {
    db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(row => ({
            ...row,
            items: JSON.parse(row.items)
        })));
    });
});

router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    
    db.run(
        'UPDATE orders SET status = ? WHERE order_id = ?',
        [status, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes > 0 });
        }
    );
});

module.exports = router;
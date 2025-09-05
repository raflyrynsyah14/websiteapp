// server.js (Versi dengan Admin Login)

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'kunci-rahasia-akbar-komputer-yang-jauh-lebih-aman-lagi',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) console.error("Error saat koneksi ke database:", err.message);
    else console.log('Terhubung ke database SQLite.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, phone TEXT, role TEXT DEFAULT 'client')`);
    db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, deviceType TEXT NOT NULL, issueDescription TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Diterima', createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (userId) REFERENCES users (id))`);
});

// Middleware untuk user biasa
function requireLogin(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

// Middleware KHUSUS untuk admin
function requireAdmin(req, res, next) {
    if (req.session.userId && req.session.userRole === 'admin') {
        next();
    } else {
        res.status(403).send('<h1>403 Forbidden - Akses Ditolak</h1><p>Anda tidak punya izin untuk mengakses halaman ini.</p><a href="/">Kembali ke beranda</a>');
    }
}

// === RUTE HALAMAN ===
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/dashboard.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/order.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views', 'order.html')));
app.get('/admin.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));


// === RUTE API ===
app.post('/register.html', async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        db.run(`INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)`, [name, email, hashedPassword, phone], (err) => {
            if (err) return res.status(400).json({ error: 'Email sudah terdaftar.' });
            res.redirect('/login');
        });
    } catch { res.status(500).send('Server error.'); }
});

app.post('/login.html', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user || !await bcrypt.compare(password, user.password)) {
            return res.status(400).send('<script>alert("Email atau password salah."); window.location.href="/login.html";</script>');
        }
        if (user) {
            req.session.userId = user.id;
            req.session.userName = user.name;
            req.session.userRole = user.role; // Simpan peran pengguna

            if (user.role === 'admin') {
                res.redirect('/admin.html'); // Arahkan admin ke dashboard admin
            } else {
                res.redirect('/dashboard.html'); // Arahkan klien ke dashboard klien
            }
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.get('/api/user-session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, name: req.session.userName, role: req.session.userRole });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/orders', requireLogin, (req, res) => {
    const { deviceType, issueDescription } = req.body;
    db.run(`INSERT INTO orders (userId, deviceType, issueDescription) VALUES (?, ?, ?)`, [req.session.userId, deviceType, issueDescription], (err) => {
        if (err) return res.status(500).send('Gagal membuat order.');
        res.redirect('/dashboard.html');
    });
});

app.get('/api/my-orders', requireLogin, (req, res) => {
    db.all(`SELECT id, deviceType, issueDescription, status, strftime('%d-%m-%Y %H:%M', createdAt) as formattedDate FROM orders WHERE userId = ? ORDER BY createdAt DESC`, [req.session.userId], (err, rows) => {
        if (err) return res.status(500).send('Gagal mengambil data order.');
        res.json(rows);
    });
});

// Terapkan penjaga admin di API
app.get('/api/admin/all-orders', requireAdmin, (req, res) => {
    db.all(`SELECT o.id, u.name as clientName, u.phone, o.deviceType, o.issueDescription, o.status, strftime('%d-%m-%Y %H:%M', o.createdAt) as formattedDate FROM orders o JOIN users u ON o.userId = u.id ORDER BY o.createdAt ASC`, [], (err, rows) => {
        if (err) return res.status(500).send('Gagal mengambil data order untuk admin.');
        res.json(rows);
    });
});

app.post('/api/admin/update-status', requireAdmin, (req, res) => {
    const { orderId, newStatus } = req.body;
    db.run(`UPDATE orders SET status = ? WHERE id = ?`, [newStatus, orderId], (err) => {
        if (err) return res.status(500).send('Gagal mengupdate status.');
        res.json({ success: true, message: 'Status berhasil diupdate.' });
    });
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server Akbar Komputer berjalan di http://localhost:${port}`);
});
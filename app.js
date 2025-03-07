const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: '123',
    resave: false, // Prevent session from being reset unnecessarily
    saveUninitialized: false, // Only save sessions that are modified
    cookie: { secure: false, maxAge: 1000 * 60 * 60 } // 1-hour session expiry
}));

app.set('view engine', 'ejs');

// Function to read users from users.json
const readUsers = () => {
    try {
        const data = fs.readFileSync('users.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// Function to write users to users.json
const writeUsers = (users) => {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
};

// Home Route
app.get('/', (req, res) => {
    res.render('index');
});

// Signup Routes
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    let users = readUsers();
    const existingUser = users.find(user => user.username === username);
    
    if (existingUser) {
        return res.send("User already exists! Try logging in.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword, notes: [] });
    writeUsers(users);
    res.redirect('/login');
});

// Login Routes
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = username;
        req.session.save(() => {
            res.redirect('/dashboard');
        });
    } else {
        res.send('Invalid username or password');
    }
});

// Dashboard Route
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('dashboard', { name: req.session.user });
});

// Profile Route
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const users = readUsers();
    const user = users.find(u => u.username === req.session.user);
    
    const notes = user?.notes || [];
    res.render('profile', { name: req.session.user, notes });
});

// Add Note Route
app.post('/add-note', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { note } = req.body;
    let users = readUsers();
    let userIndex = users.findIndex(u => u.username === req.session.user);

    if (userIndex !== -1) {
        if (!users[userIndex].notes) {
            users[userIndex].notes = [];
        }
        users[userIndex].notes.push(note);
        writeUsers(users);
        req.session.save(() => {
            res.redirect('/profile');
        });
    } else {
        res.redirect('/login');
    }
});

// Delete Note Route
app.post('/delete-note', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { noteIndex } = req.body;
    let users = readUsers();
    let userIndex = users.findIndex(u => u.username === req.session.user);

    if (userIndex !== -1 && users[userIndex].notes.length > noteIndex) {
        users[userIndex].notes.splice(noteIndex, 1);
        writeUsers(users);
        req.session.save(() => {
            res.redirect('/profile');
        });
    } else {
        res.redirect('/login');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Start Server
app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on http://192.168.100.14:3000');
});

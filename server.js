// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const users = {}; // In-memory user storage
const onlineUsers = {}; // Track online users

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username } = req.body;
    if (users[username]) {
        req.session.username = username;
        onlineUsers[username] = true; // Mark user as online
        res.redirect('/profile');
    } else {
        res.send('User  not found. Please sign up.');
    }
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', (req, res) => {
    const { username } = req.body;
    if (!users[username]) {
        users[username] = true; // Store user
        req.session.username = username;
        onlineUsers[username] = true; // Mark user as online
        res.redirect('/profile');
    } else {
        res.send('User  already exists. Please log in.');
    }
});

app.get('/profile', (req, res) => {
    if (req.session.username) {
        res.render('profile', { username: req.session.username, onlineUsers: Object.keys(onlineUsers) });
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    onlineUsers[req.session.username] = false; // Mark user as offline
    req.session.destroy();
    res.redirect('/login');
});

// Socket.io for chat
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join', (username) => {
        socket.username = username; // Store username in socket
        socket.join(username); // Join a room with the username
        io.emit('user list', Object.keys(onlineUsers)); // Update user list
    });

    socket.on('chat message', (data) => {
        io.to(data.to).emit('chat message', { from: data.from, message: data.message });
    });

    socket.on('disconnect', () => {
        console.log('User  disconnected');
        delete onlineUsers[socket.username]; // Remove user from online users
        io.emit('user list', Object.keys(onlineUsers)); // Update user list
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('./models/user');
const app = express();
const rateLimit = require('express-rate-limit');
const http = require('http').Server(app);
const io = require('socket.io')(http);

mongoose.connect('MONGODB_URL')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const messageSchema = new mongoose.Schema({
    username: String,
    text: String,
    timestamp: Date
});

messageSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    }
});

const Message = mongoose.model('Message', messageSchema);

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: 'Too many login attempts, please try again later.'
});

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'HK9gOzBY6ic6m5M74PHeqXlaMPImehdikambfbo6cO3kYixBJpCesO2ghxGr5TQLxAeVm',
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && password === user.password) {
        req.session.userId = user._id;
        req.session.username = user.username;
        return res.redirect('/home');
    }
    
    res.render('login', { message: 'Wrong username or password' });
});

app.get('/home', requireLogin, async (req, res) => {
    const messages = await Message.find({}).sort({ timestamp: -1 }).limit(50);
    res.render('home', { username: req.session.username, messages: messages });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/home');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

const messageLimit = 5;

io.on('connection', (socket) => {
    const username = socket.handshake.query.username;

    socket.broadcast.emit('message', { username: 'Server', text: `${username} joined` });

    socket.on('chatMessage', async (msg) => {
        const message = new Message({
            username: username,
            text: msg,
            timestamp: new Date()
        });

        await message.save();


        const totalMessages = await Message.countDocuments();
        
        if (totalMessages > messageLimit) {

            await Message.deleteMany({});
            console.log('All messages deleted.');
        }

        io.emit('message', { username: username, text: msg });
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('message', { username: 'Server', text: `${username} left.` });
    });
});

http.listen(3000, () => {
    console.log('http://localhost:3000');
});
const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const fs = require('fs');
const multer = require('multer');
const app = express();
const server = createServer(app);
const io = new Server(server);

const upload = multer({ dest: 'uploads/' });

var username_base = [];
var channels = [];
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'chat.html'));
});

app.get('/josh', (req, res) => {
  res.sendFile(join(__dirname, 'josh.html'));
});

app.get('/randy', (req, res) => {
  res.sendFile(join(__dirname, 'bigrandy.html'));
});

io.on('connection', (socket) => {
  

  socket.on('quote', (msg) => {
    console.log('quote: ' + msg);
  });

  socket.on('chat message', (msg, user, channel) => {
    console.log('message: ' + msg + ' ' + user + ' channel: ' + channel);
    const message = `${msg}☆${user}☆${channel}❀`;
    fs.appendFile(`data_${channel}.txt`, message, (err) => {
      if (err) {
        console.error(err);
      }
    });
    io.to(channel).emit('chat message', msg, user, channel);
  });

  socket.on('image message', (imageUrl, user, channel) => {
    console.log('image: ' + imageUrl + ' ' + user + ' channel: ' + channel);
    const message = `${imageUrl}☆${user}☆${channel}❀`;
    fs.appendFile(`data_${channel}.txt`, message, (err) => {
      if (err) {
        console.error(err);
      }
    });
    io.to(channel).emit('image message', imageUrl, user, channel);
  });

  socket.on('set username', (user, id) => {
    if (username_base.includes(user)) {
      socket.emit('taken', user, id);
    } else {
      username_base.push(user);
      socket.emit('kept', user, id);
    }
  });

  socket.on('create channel', (channel) => {
    if (!channels[channel]) {
      channels[channel] = [];
      io.emit('new channel', channel);
    }
  });

  socket.on('join channel', (channel, user) => {
    socket.join(channel);
    if (!channels[channel]) {
      channels[channel] = [];
    }
    channels[channel].push(user);
    console.log(`${user} joined channel: ${channel}`);
    io.to(channel).emit('user joined', user, channel);

    fs.readFile(`data_${channel}.txt`, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      }
      const messages = data.split('❀').filter(Boolean);
      messages.forEach((message) => {
        const [msg, usr, ch] = message.split('☆');
        if (msg.startsWith('/uploads/')) {
          socket.emit('image message', msg, usr, ch);
        } else {
          socket.emit('chat message', msg, usr, ch);
        }
      });
    });
  });

  socket.on('leave channel', (channel, user) => {
    socket.leave(channel);
    if (channels[channel]) {
      channels[channel] = channels[channel].filter(u => u !== user);
    }
  });

  socket.on('disconnect', () => {
    console.log('a user disconnected');
  });
  socket.on('connect', () => {
    console
  })
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});

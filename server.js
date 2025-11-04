const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = new Map();

// Generate fun random colors for usernames
const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

function getRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate fun usernames if not provided
const funUsernames = [
  'CosmicExplorer', 'PixelWizard', 'CodeNinja', 'ChatMaster',
  'ByteBuddy', 'CyberPunk', 'NeonGhost', 'DigitalDreamer',
  'StarGazer', 'MoonWalker', 'CloudRider', 'WaveMaker'
];

function getFunUsername() {
  return funUsernames[Math.floor(Math.random() * funUsernames.length)] + 
         Math.floor(Math.random() * 1000);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✨ New user connected:', socket.id);

  // Handle user joining
  socket.on('join', (username) => {
    const userColor = getRandomColor();
    const displayName = username || getFunUsername();
    
    users.set(socket.id, {
      id: socket.id,
      username: displayName,
      color: userColor
    });

    socket.emit('welcome', {
      username: displayName,
      color: userColor,
      message: `🎉 Welcome to the chat, ${displayName}!`
    });

    // Notify others
    socket.broadcast.emit('userJoined', {
      username: displayName,
      color: userColor,
      message: `${displayName} joined the chat! 🚀`
    });

    // Send current users list
    io.emit('updateUsers', Array.from(users.values()));
  });

  // Handle chat messages
  socket.on('chatMessage', (data) => {
    const user = users.get(socket.id);
    if (user) {
      // Check if it's an image message
      if (data.image) {
        io.emit('chatMessage', {
          username: user.username,
          color: user.color,
          image: data.image,
          timestamp: new Date().toLocaleTimeString()
        });
        return;
      }
      
      // Check for fun commands
      let message = data.message;
      
      if (message && message.startsWith('/')) {
        handleCommand(socket, message, user);
      } else if (message) {
        io.emit('chatMessage', {
          username: user.username,
          color: user.color,
          message: message,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('typing', {
        username: user.username,
        isTyping: data.isTyping
      });
    }
  });

  // Handle emoji reactions
  socket.on('emojiReaction', (data) => {
    const user = users.get(socket.id);
    if (user) {
      io.emit('emojiReaction', {
        username: user.username,
        color: user.color,
        emoji: data.emoji,
        messageId: data.messageId
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      socket.broadcast.emit('userLeft', {
        username: user.username,
        message: `${user.username} left the chat 👋`
      });
      io.emit('updateUsers', Array.from(users.values()));
    }
    console.log('👋 User disconnected:', socket.id);
  });
});

// Fun command handler
function handleCommand(socket, message, user) {
  const command = message.split(' ')[0].toLowerCase();
  const args = message.split(' ').slice(1).join(' ');

  switch (command) {
    case '/joke':
      const jokes = [
        "Why don't programmers like nature? It has too many bugs! 🐛",
        "How do you comfort a JavaScript bug? You console it! 😄",
        "Why did the developer go broke? Because he used up all his cache! 💸",
        "What's a programmer's favorite hangout place? Foo Bar! 🍺",
        "Why do Java developers wear glasses? Because they can't C#! 👓",
        "How many programmers does it take to change a light bulb? None, that's a hardware problem! 💡",
        "Why did the programmer quit his job? He didn't get arrays! 😂",
        "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?' 🍻",
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
        "What's the object-oriented way to become wealthy? Inheritance! 💰",
        "Why did the programmer get stuck in the shower? The instructions on the shampoo bottle said: Lather, Rinse, Repeat! 🔁",
        "How do you tell an introverted computer scientist from an extroverted one? The extroverted one looks at YOUR shoes when talking! 👟",
        "Why don't programmers like to go outside? The sun gives them compiler errors! ☀️",
        "What do you call a programmer from Finland? Nerdic! 🇫🇮",
        "Why did the React component feel lonely? Because it didn't know what state it was in! ⚛️",
        "How do you generate a random string? Put a web developer in front of Vim and tell them to exit! ⌨️",
        "Why did the developer break up with GitHub? Too many commits! 💔",
        "What's a programmer's favorite snack? Cookies! 🍪",
        "Why do Python programmers prefer dark chocolate? Because they can't stand white space! 🐍",
        "How do you know if a programmer is an extrovert? They look at YOUR shoes when talking to you! 👀"
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      io.emit('chatMessage', {
        username: user.username,
        color: user.color,
        message: `🎭 ${joke}`,
        timestamp: new Date().toLocaleTimeString()
      });
      break;

    case '/dance':
      io.emit('chatMessage', {
        username: user.username,
        color: user.color,
        message: `${user.username} is dancing! 🕺💃🎉`,
        timestamp: new Date().toLocaleTimeString()
      });
      break;

    case '/wave':
      io.emit('chatMessage', {
        username: user.username,
        color: user.color,
        message: `${user.username} waves hello! 👋✨`,
        timestamp: new Date().toLocaleTimeString()
      });
      break;

    case '/count':
      io.emit('chatMessage', {
        username: '🤖 System',
        color: '#888',
        message: `There are ${users.size} user(s) in the chat! 👥`,
        timestamp: new Date().toLocaleTimeString()
      });
      break;

    case '/help':
      socket.emit('chatMessage', {
        username: '🤖 Help',
        color: '#888',
        message: 'Available commands: /joke, /dance, /wave, /count, /help 🎮',
        timestamp: new Date().toLocaleTimeString()
      });
      break;

    default:
      socket.emit('chatMessage', {
        username: '🤖 System',
        color: '#888',
        message: `Unknown command: ${command}. Type /help for available commands.`,
        timestamp: new Date().toLocaleTimeString()
      });
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`💬 Fun chat server is ready!`);
});

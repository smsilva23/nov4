const socket = io();
let username = '';
let typingTimeout;

// DOM elements
const usernameModal = document.getElementById('usernameModal');
const usernameInput = document.getElementById('usernameInput');
const joinButton = document.getElementById('joinButton');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');

// Join chat
joinButton.addEventListener('click', () => {
  username = usernameInput.value.trim();
  socket.emit('join', username);
  usernameModal.classList.add('hidden');
  messageInput.focus();
});

usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinButton.click();
  }
});

// Send message
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('chatMessage', { message });
    messageInput.value = '';
    socket.emit('typing', { isTyping: false });
  }
}

// Typing indicator
messageInput.addEventListener('input', () => {
  socket.emit('typing', { isTyping: true });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { isTyping: false });
  }, 1000);
});

// Emoji picker
emojiBtn.addEventListener('click', () => {
  emojiPicker.classList.toggle('show');
});

document.querySelectorAll('.emoji').forEach(emoji => {
  emoji.addEventListener('click', () => {
    messageInput.value += emoji.textContent;
    emojiPicker.classList.remove('show');
    messageInput.focus();
  });
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
  if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
    emojiPicker.classList.remove('show');
  }
});

// Socket event listeners
socket.on('welcome', (data) => {
  addMessage('system', data.username, data.message, data.color);
});

socket.on('chatMessage', (data) => {
  addMessage('user', data.username, data.message, data.color, data.timestamp);
});

socket.on('userJoined', (data) => {
  addMessage('system', data.username, data.message, data.color);
});

socket.on('userLeft', (data) => {
  addMessage('system', data.username, data.message);
});

socket.on('typing', (data) => {
  if (data.isTyping) {
    typingIndicator.textContent = `${data.username} is typing...`;
  } else {
    typingIndicator.textContent = '';
  }
});

socket.on('updateUsers', (users) => {
  userCount.textContent = users.length;
  usersList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.style.color = user.color;
    li.textContent = user.username;
    usersList.appendChild(li);
  });
});

socket.on('emojiReaction', (data) => {
  // Find the last message and add emoji reaction
  const messages = document.querySelectorAll('.message');
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    const reaction = document.createElement('span');
    reaction.className = 'emoji-reaction';
    reaction.textContent = data.emoji;
    reaction.title = `${data.username} reacted`;
    lastMessage.querySelector('.message-text').appendChild(reaction);
  }
});

// Add message to chat
function addMessage(type, username, message, color, timestamp) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  if (type === 'system') {
    messageDiv.innerHTML = `
      <div class="message-text" style="background: #e9ecef; text-align: center; color: #666;">
        ${message}
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">
        <div style="flex: 1;">
          <div class="message-username" style="color: ${color || '#667eea'}">
            ${username}
          </div>
          <div class="message-text">
            ${escapeHtml(message)}
            ${timestamp ? `<div class="message-time">${timestamp}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Add animation
  messageDiv.style.animation = 'fadeIn 0.3s ease';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show users sidebar on mobile
if (window.innerWidth <= 768) {
  userCount.addEventListener('click', () => {
    document.getElementById('usersSidebar').classList.toggle('show');
  });
}

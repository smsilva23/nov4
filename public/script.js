const socket = io();
let username = '';
let typingTimeout;
let currentStream = null;
let currentFilter = 'none';
let capturedImage = null;

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

// Camera elements
const cameraBtn = document.getElementById('cameraBtn');
const cameraModal = document.getElementById('cameraModal');
const closeCamera = document.getElementById('closeCamera');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');
const previewImage = document.getElementById('previewImage');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const sendPhotoBtn = document.getElementById('sendPhotoBtn');
const filterButtons = document.querySelectorAll('.filter-btn');

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

// Camera functionality
cameraBtn.addEventListener('click', openCamera);
closeCamera.addEventListener('click', closeCameraModal);

function openCamera() {
  cameraModal.classList.add('show');
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 }
    } 
  })
  .then(stream => {
    currentStream = stream;
    cameraVideo.srcObject = stream;
    cameraVideo.style.display = 'block';
    previewImage.style.display = 'none';
    captureBtn.style.display = 'block';
    retakeBtn.style.display = 'none';
    sendPhotoBtn.style.display = 'none';
  })
  .catch(err => {
    console.error('Error accessing camera:', err);
    alert('Unable to access camera. Please allow camera permissions.');
    closeCameraModal();
  });
}

function closeCameraModal() {
  cameraModal.classList.remove('show');
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  cameraVideo.srcObject = null;
  capturedImage = null;
  currentFilter = 'none';
  filterButtons.forEach(btn => {
    if (btn.dataset.filter === 'none') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Filter buttons
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    applyFilter();
  });
});

function applyFilter() {
  if (!capturedImage) return;
  
  const canvas = cameraCanvas;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Handle mirror filter differently
    if (currentFilter === 'mirror') {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      previewImage.src = canvas.toDataURL('image/jpeg', 0.8);
      return;
    }
    
    // For normal filter, just show original
    if (currentFilter === 'none') {
      previewImage.src = capturedImage;
      return;
    }
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    switch(currentFilter) {
      case 'neon':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          data[i] = Math.min(255, brightness * 2);
          data[i + 1] = Math.min(255, brightness * 1.5);
          data[i + 2] = Math.min(255, brightness * 3);
        }
        break;
      case 'vintage':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.1);
          data[i + 1] = Math.min(255, data[i + 1] * 0.95);
          data[i + 2] = Math.min(255, data[i + 2] * 0.85);
          data[i + 3] *= 0.9;
        }
        break;
      case 'grayscale':
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        break;
      case 'sepia':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
        break;
    }
    
    ctx.putImageData(imageData, 0, 0);
    previewImage.src = canvas.toDataURL('image/jpeg', 0.8);
  };
  
  img.src = capturedImage;
}

// Capture photo
captureBtn.addEventListener('click', () => {
  const canvas = cameraCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  
  ctx.drawImage(cameraVideo, 0, 0);
  
  // Store original captured image
  const originalImage = canvas.toDataURL('image/jpeg', 0.9);
  capturedImage = originalImage;
  
  // Stop camera stream
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  
  cameraVideo.style.display = 'none';
  previewImage.style.display = 'block';
  applyFilter(); // Apply current filter
  
  captureBtn.style.display = 'none';
  retakeBtn.style.display = 'block';
  sendPhotoBtn.style.display = 'block';
});

// Retake photo
retakeBtn.addEventListener('click', () => {
  capturedImage = null;
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 }
    } 
  })
  .then(stream => {
    currentStream = stream;
    cameraVideo.srcObject = stream;
    cameraVideo.style.display = 'block';
    previewImage.style.display = 'none';
    captureBtn.style.display = 'block';
    retakeBtn.style.display = 'none';
    sendPhotoBtn.style.display = 'none';
  });
});

// Send photo
sendPhotoBtn.addEventListener('click', () => {
  if (previewImage.src) {
    // Send the currently displayed image (with any applied filter)
    socket.emit('chatMessage', { 
      message: '', 
      image: previewImage.src 
    });
    closeCameraModal();
    messageInput.focus();
  }
});

// Socket event listeners
socket.on('welcome', (data) => {
  addMessage('system', data.username, data.message, data.color);
});

socket.on('chatMessage', (data) => {
  if (data.image) {
    addImageMessage(data.username, data.image, data.color, data.timestamp);
  } else {
    addMessage('user', data.username, data.message, data.color, data.timestamp);
  }
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
    lastMessage.querySelector('.message-text')?.appendChild(reaction);
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
  messageDiv.style.animation = 'messageSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
}

// Add image message to chat
function addImageMessage(username, imageSrc, color, timestamp) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  
  messageDiv.innerHTML = `
    <div class="message-content">
      <div style="flex: 1;">
        <div class="message-username" style="color: ${color || '#667eea'}">
          ${username}
        </div>
        <div class="message-text image-message">
          <img src="${imageSrc}" alt="Photo from ${username}" class="chat-image">
          ${timestamp ? `<div class="message-time">${timestamp}</div>` : ''}
        </div>
      </div>
    </div>
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  messageDiv.style.animation = 'messageSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
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

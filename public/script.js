const socket = io();
let username = '';
let typingTimeout;
let currentStream = null;
let currentFilter = 'none';
let capturedImage = null;

// Flipbook variables
let flipbookCanvas = null;
let flipbookCtx = null;
let isDrawing = false;
let currentTool = 'brush';
let currentColor = '#00f3ff';
let brushSize = 5;
let pages = []; // Store canvas data for each page
let currentPage = 0;
let lastX = 0;
let lastY = 0;
let onionskinEnabled = false;
let onionskinOpacity = 30;
let isPlaying = false;
let animationInterval = null;
let animationSpeed = 500; // milliseconds per frame

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

// Flipbook elements
const flipbookBtn = document.getElementById('flipbookBtn');
const flipbookModal = document.getElementById('flipbookModal');
const closeFlipbook = document.getElementById('closeFlipbook');
const colorPicker = document.getElementById('colorPicker');
const brushSizeInput = document.getElementById('brushSize');
const brushSizeLabel = document.getElementById('brushSizeLabel');
const toolButtons = document.querySelectorAll('.tool-btn');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const addPageBtn = document.getElementById('addPage');
const pageInfo = document.getElementById('pageInfo');
const playBtn = document.getElementById('playBtn');
const onionskinToggle = document.getElementById('onionskinToggle');
const onionskinOpacityInput = document.getElementById('onionskinOpacity');
const onionskinOpacityLabel = document.getElementById('onionskinOpacityLabel');

// Initialize canvas when DOM is ready
function initFlipbookCanvas() {
  flipbookCanvas = document.getElementById('flipbookCanvas');
  if (flipbookCanvas) {
    flipbookCtx = flipbookCanvas.getContext('2d');
  }
}

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

// ========== FLIPBOOK FUNCTIONALITY ==========

// Initialize flipbook
function initFlipbook() {
  initFlipbookCanvas();
  if (!flipbookCanvas || !flipbookCtx) return;
  
  if (pages.length === 0) {
    pages.push(null); // First page
    currentPage = 0;
  }
  
  // Initialize first page if empty
  if (!pages[0]) {
    pages[0] = flipbookCanvas.toDataURL();
  }
  
  resizeCanvas();
  loadPage(currentPage);
  updatePageInfo();
  
  // Reset onionskin state
  onionskinEnabled = false;
  onionskinToggle.classList.remove('active');
}

// Resize canvas to fit container
function resizeCanvas() {
  const container = flipbookCanvas.parentElement;
  const maxWidth = container.clientWidth - 40;
  const maxHeight = container.clientHeight - 40;
  
  flipbookCanvas.width = Math.min(maxWidth, 800);
  flipbookCanvas.height = Math.min(maxHeight, 600);
  
  // Redraw current page after resize
  loadPage(currentPage);
}

window.addEventListener('resize', () => {
  if (flipbookModal.classList.contains('show')) {
    resizeCanvas();
  }
});

// Open flipbook modal
flipbookBtn.addEventListener('click', () => {
  flipbookModal.classList.add('show');
  initFlipbook();
  attachCanvasListeners();
  // Request current state from server
  socket.emit('flipbook:getState');
});

// Close flipbook modal
closeFlipbook.addEventListener('click', () => {
  if (isPlaying) {
    stopAnimation();
  }
  flipbookModal.classList.remove('show');
});

// Tool selection
toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toolButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
    flipbookCanvas.style.cursor = currentTool === 'eraser' ? 'grab' : 'crosshair';
  });
});

// Color picker
colorPicker.addEventListener('change', (e) => {
  currentColor = e.target.value;
});

// Brush size
brushSizeInput.addEventListener('input', (e) => {
  brushSize = parseInt(e.target.value);
  brushSizeLabel.textContent = `${brushSize}px`;
});

// Onionskin toggle
onionskinToggle.addEventListener('click', () => {
  onionskinEnabled = !onionskinEnabled;
  onionskinToggle.classList.toggle('active', onionskinEnabled);
  renderCanvas(); // Redraw with onionskin
});

// Onionskin opacity
onionskinOpacityInput.addEventListener('input', (e) => {
  onionskinOpacity = parseInt(e.target.value);
  onionskinOpacityLabel.textContent = `${onionskinOpacity}%`;
  if (onionskinEnabled) {
    renderCanvas(); // Redraw with new opacity
  }
});

// Play button
playBtn.addEventListener('click', toggleAnimation);

// Drawing functions
function getMousePos(e) {
  const rect = flipbookCanvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function startDrawing(e) {
  isDrawing = true;
  const pos = getMousePos(e);
  lastX = pos.x;
  lastY = pos.y;
  
  socket.emit('flipbook:drawStart', {
    page: currentPage,
    x: lastX,
    y: lastY,
    tool: currentTool,
    color: currentTool === 'eraser' ? '#ffffff' : currentColor,
    size: brushSize
  });
}

function draw(e) {
  if (!isDrawing) return;
  
  const pos = getMousePos(e);
  
  // Draw locally
  drawLine(lastX, lastY, pos.x, pos.y, currentTool === 'eraser' ? '#ffffff' : currentColor, brushSize);
  
  // Send to server
  socket.emit('flipbook:draw', {
    page: currentPage,
    fromX: lastX,
    fromY: lastY,
    toX: pos.x,
    toY: pos.y,
    tool: currentTool,
    color: currentTool === 'eraser' ? '#ffffff' : currentColor,
    size: brushSize
  });
  
  lastX = pos.x;
  lastY = pos.y;
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    socket.emit('flipbook:drawEnd', { page: currentPage });
    savePage(currentPage);
    
    // Redraw with onionskin if enabled after drawing stops
    if (onionskinEnabled) {
      renderCanvas();
    }
  }
}

function drawLine(fromX, fromY, toX, toY, color, size, tool = null) {
  // Stop animation if playing while drawing
  if (isPlaying) {
    stopAnimation();
  }
  
  flipbookCtx.globalAlpha = 1.0; // Reset alpha for drawing
  flipbookCtx.beginPath();
  flipbookCtx.moveTo(fromX, fromY);
  flipbookCtx.lineTo(toX, toY);
  flipbookCtx.strokeStyle = color;
  flipbookCtx.lineWidth = size;
  flipbookCtx.lineCap = 'round';
  flipbookCtx.lineJoin = 'round';
  
  const useTool = tool || currentTool;
  if (useTool === 'eraser' || color === '#ffffff') {
    flipbookCtx.globalCompositeOperation = 'destination-out';
  } else {
    flipbookCtx.globalCompositeOperation = 'source-over';
  }
  
  flipbookCtx.stroke();
  
}

// Canvas event listeners (attached when flipbook opens)
function attachCanvasListeners() {
  if (!flipbookCanvas) return;
  
  flipbookCanvas.addEventListener('mousedown', startDrawing);
  flipbookCanvas.addEventListener('mousemove', draw);
  flipbookCanvas.addEventListener('mouseup', stopDrawing);
  flipbookCanvas.addEventListener('mouseout', stopDrawing);

  // Touch events for mobile
  flipbookCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    flipbookCanvas.dispatchEvent(mouseEvent);
  });

  flipbookCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    flipbookCanvas.dispatchEvent(mouseEvent);
  });

  flipbookCanvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    flipbookCanvas.dispatchEvent(mouseEvent);
  });
}

// Page management
function savePage(pageIndex) {
  pages[pageIndex] = flipbookCanvas.toDataURL();
}

function loadPage(pageIndex) {
  if (pageIndex < 0 || pageIndex >= pages.length) return;
  
  currentPage = pageIndex;
  updatePageInfo();
  renderCanvas();
}

function renderCanvas() {
  if (!flipbookCanvas || !flipbookCtx) return;
  
  // Clear canvas
  flipbookCtx.fillStyle = 'white';
  flipbookCtx.fillRect(0, 0, flipbookCanvas.width, flipbookCanvas.height);
  
  // Draw onionskin layers if enabled (and not playing animation)
  if (onionskinEnabled && !isPlaying) {
    let onionskinLayers = 0;
    let onionskinDrawn = 0;
    
    if (currentPage > 0 && pages[currentPage - 1]) onionskinLayers++;
    if (currentPage < pages.length - 1 && pages[currentPage + 1]) onionskinLayers++;
    
    const drawOnionskinComplete = () => {
      onionskinDrawn++;
      if (onionskinDrawn >= onionskinLayers) {
        drawCurrentPage();
      }
    };
    
    // Draw previous page (if exists)
    if (currentPage > 0 && pages[currentPage - 1]) {
      const prevImg = new Image();
      prevImg.onload = () => {
        flipbookCtx.save();
        flipbookCtx.globalAlpha = onionskinOpacity / 100;
        flipbookCtx.globalCompositeOperation = 'source-over';
        flipbookCtx.drawImage(prevImg, 0, 0);
        flipbookCtx.restore();
        drawOnionskinComplete();
      };
      prevImg.src = pages[currentPage - 1];
    }
    
    // Draw next page (if exists)
    if (currentPage < pages.length - 1 && pages[currentPage + 1]) {
      const nextImg = new Image();
      nextImg.onload = () => {
        flipbookCtx.save();
        flipbookCtx.globalAlpha = onionskinOpacity / 100;
        flipbookCtx.globalCompositeOperation = 'source-over';
        flipbookCtx.drawImage(nextImg, 0, 0);
        flipbookCtx.restore();
        drawOnionskinComplete();
      };
      nextImg.src = pages[currentPage + 1];
    }
    
    // If no onionskin layers, draw current page immediately
    if (onionskinLayers === 0) {
      drawCurrentPage();
    }
  } else {
    drawCurrentPage();
  }
  
  function drawCurrentPage() {
    if (pages[currentPage]) {
      const img = new Image();
      img.onload = () => {
        flipbookCtx.save();
        flipbookCtx.globalAlpha = 1.0;
        flipbookCtx.globalCompositeOperation = 'source-over';
        flipbookCtx.drawImage(img, 0, 0);
        flipbookCtx.restore();
      };
      img.src = pages[currentPage];
    }
  }
}



function updatePageInfo() {
  pageInfo.textContent = `Page ${currentPage + 1} / ${pages.length}`;
  prevPageBtn.disabled = currentPage === 0;
  nextPageBtn.disabled = currentPage === pages.length - 1;
}

function addPage() {
  if (isPlaying) {
    stopAnimation();
  }
  savePage(currentPage);
  pages.push(null);
  currentPage = pages.length - 1;
  loadPage(currentPage);
  socket.emit('flipbook:addPage', { totalPages: pages.length });
}

prevPageBtn.addEventListener('click', () => {
  if (isPlaying) {
    stopAnimation();
  }
  if (currentPage > 0) {
    savePage(currentPage);
    loadPage(currentPage - 1);
    socket.emit('flipbook:changePage', { page: currentPage });
  }
});

nextPageBtn.addEventListener('click', () => {
  if (isPlaying) {
    stopAnimation();
  }
  if (currentPage < pages.length - 1) {
    savePage(currentPage);
    loadPage(currentPage + 1);
    socket.emit('flipbook:changePage', { page: currentPage });
  }
});

addPageBtn.addEventListener('click', addPage);

// Animation playback
function toggleAnimation() {
  if (isPlaying) {
    stopAnimation();
  } else {
    startAnimation();
  }
}

function startAnimation() {
  if (pages.length < 2) {
    alert('You need at least 2 pages to play an animation!');
    return;
  }
  
  isPlaying = true;
  playBtn.textContent = '⏸️';
  playBtn.title = 'Pause Animation';
  
  // Disable drawing and page navigation while playing
  flipbookCanvas.style.pointerEvents = 'none';
  prevPageBtn.disabled = true;
  nextPageBtn.disabled = true;
  addPageBtn.disabled = true;
  
  let animationPage = currentPage;
  savePage(currentPage); // Save current page before starting
  
  animationInterval = setInterval(() => {
    // Switch to next page
    animationPage = (animationPage + 1) % pages.length;
    currentPage = animationPage;
    renderCanvas();
    updatePageInfo();
  }, animationSpeed);
}

function stopAnimation() {
  isPlaying = false;
  playBtn.textContent = '▶️';
  playBtn.title = 'Play Animation';
  
  // Re-enable drawing and navigation
  flipbookCanvas.style.pointerEvents = 'auto';
  prevPageBtn.disabled = currentPage === 0;
  nextPageBtn.disabled = currentPage === pages.length - 1;
  addPageBtn.disabled = false;
  
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
}

// Socket events for collaborative drawing
socket.on('flipbook:state', (data) => {
  if (data.pages && data.pages.length > 0) {
    pages = data.pages;
    currentPage = data.currentPage || 0;
    loadPage(currentPage);
  }
});

socket.on('flipbook:drawStart', (data) => {
  if (data.page === currentPage) {
    lastX = data.x;
    lastY = data.y;
  }
});

socket.on('flipbook:draw', (data) => {
  if (data.page === currentPage) {
    drawLine(data.fromX, data.fromY, data.toX, data.toY, data.color, data.size, data.tool);
  }
});

socket.on('flipbook:changePage', (data) => {
  // Another user changed pages - sync if needed
  if (data.page !== currentPage) {
    // Optionally sync to same page
    // savePage(currentPage);
    // loadPage(data.page);
  }
});

socket.on('flipbook:addPage', (data) => {
  // Another user added a page
  while (pages.length < data.totalPages) {
    pages.push(null);
  }
  updatePageInfo();
});

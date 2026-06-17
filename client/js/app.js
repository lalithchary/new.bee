// ==========================================
// new.bee - Client Application
// ==========================================

(function () {
  'use strict';

  // DOM Elements
  const landingPage = document.getElementById('landing');
  const chatPage = document.getElementById('chat-page');
  const joinModal = document.getElementById('join-modal');
  const joinForm = document.getElementById('join-form');
  const nicknameInput = document.getElementById('nickname');
  const adminPasswordInput = document.getElementById('admin-password');
  const channelDisplay = document.getElementById('channel-display');
  const chatInterface = document.getElementById('chat-interface');
  const headerChannel = document.getElementById('header-channel');
  const userCount = document.getElementById('user-count');
  const btnUsers = document.getElementById('btn-users');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const sidebar = document.getElementById('sidebar');
  const userList = document.getElementById('user-list');
  const messagesContainer = document.getElementById('messages');
  const typingIndicator = document.getElementById('typing-indicator');
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const imageInput = document.getElementById('image-input');
  const imagePreview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const btnRemoveImage = document.getElementById('btn-remove-image');

  // State
  let ws = null;
  let channel = '';
  let myNick = '';
  let isAdmin = false;
  let pendingImage = null;
  let typingTimeout = null;
  let users = [];

  // Initialize
  init();

  function init() {
    channel = window.location.search.slice(1);

    // Landing page: create channel form
    const createForm = document.getElementById('create-channel-form');
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('channel-name-input');
        const name = input.value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
        if (name) {
          window.location.href = `?${name}`;
        }
      });
    }

    if (!channel) {
      landingPage.classList.add('active');
      chatPage.classList.remove('active');
      return;
    }

    landingPage.classList.remove('active');
    chatPage.classList.add('active');
    channelDisplay.textContent = '?' + channel;

    setupEventListeners();
  }

  function setupEventListeners() {
    joinForm.addEventListener('submit', handleJoin);
    chatForm.addEventListener('submit', handleSend);
    messageInput.addEventListener('keydown', handleInputKeydown);
    messageInput.addEventListener('input', handleInputResize);
    messageInput.addEventListener('input', handleTyping);
    imageInput.addEventListener('change', handleImageSelect);
    btnRemoveImage.addEventListener('click', removeImage);
    btnUsers.addEventListener('click', toggleSidebar);
    btnClearHistory.addEventListener('click', handleClearHistory);
  }

  // ==========================================
  // WebSocket Connection
  // ==========================================

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        cmd: 'join',
        nick: myNick,
        channel: channel,
        password: adminPasswordInput.value || undefined
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handleMessage(msg);
    };

    ws.onclose = () => {
      addSystemMessage('Connection lost. Refreshing...');
      setTimeout(() => window.location.reload(), 3000);
    };

    ws.onerror = () => {
      addSystemMessage('Connection error.');
    };
  }

  // ==========================================
  // Message Handling
  // ==========================================

  function handleMessage(msg) {
    switch (msg.cmd) {
      case 'joined':
        onJoined(msg);
        break;
      case 'chat':
        addChatMessage(msg);
        break;
      case 'userJoined':
        users.push({ nick: msg.nick, isAdmin: msg.isAdmin });
        updateUserList();
        addSystemMessage(`${msg.nick} joined the channel`);
        break;
      case 'userLeft':
        users = users.filter(u => u.nick !== msg.nick);
        updateUserList();
        addSystemMessage(`${msg.nick} left the channel`);
        break;
      case 'typing':
        showTyping(msg.nick);
        break;
      case 'warn':
        alert(msg.text);
        break;
      case 'historyCleared':
        messagesContainer.innerHTML = '';
        addSystemMessage('Chat history has been cleared by admin');
        break;
    }
  }

  function onJoined(msg) {
    myNick = msg.nick;
    isAdmin = msg.isAdmin;
    users = msg.users;

    joinModal.classList.remove('active');
    chatInterface.classList.remove('hidden');
    headerChannel.textContent = '?' + msg.channel;

    if (isAdmin) {
      btnClearHistory.classList.remove('hidden');
    }

    updateUserList();

    // Render history
    if (msg.history && msg.history.length > 0) {
      msg.history.forEach(m => addChatMessage(m, false));
      scrollToBottom();
    }

    addSystemMessage(`Welcome to ?${msg.channel}, ${msg.nick}!`);
    messageInput.focus();
  }

  // ==========================================
  // UI Actions
  // ==========================================

  function handleJoin(e) {
    e.preventDefault();
    myNick = nicknameInput.value.trim();
    if (!myNick) return;
    connect();
  }

  function handleSend(e) {
    e.preventDefault();
    const text = messageInput.value.trim();

    if (!text && !pendingImage) return;

    if (pendingImage) {
      uploadImage(pendingImage).then(url => {
        ws.send(JSON.stringify({
          cmd: 'chat',
          text: text,
          imageUrl: url
        }));
        removeImage();
      }).catch(() => {
        addSystemMessage('Failed to upload image');
      });
    } else {
      ws.send(JSON.stringify({
        cmd: 'chat',
        text: text
      }));
    }

    messageInput.value = '';
    messageInput.style.height = 'auto';
  }

  function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  }

  function handleInputResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  }

  function handleTyping() {
    if (typingTimeout) clearTimeout(typingTimeout);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ cmd: 'typing' }));
    }
    typingTimeout = setTimeout(() => { }, 2000);
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    pendingImage = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
  }

  function removeImage() {
    pendingImage = null;
    previewImg.src = '';
    imagePreview.classList.add('hidden');
  }

  function toggleSidebar() {
    sidebar.classList.toggle('hidden');
  }

  function handleClearHistory() {
    if (confirm('Clear all chat history for this channel?')) {
      ws.send(JSON.stringify({ cmd: 'clearHistory' }));
    }
  }

  // ==========================================
  // Image Upload
  // ==========================================

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  }

  // ==========================================
  // Message Rendering
  // ==========================================

  function addChatMessage(msg, scroll = true) {
    const el = document.createElement('div');
    el.className = 'message';

    const time = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nickClass = msg.isAdmin ? 'message-nick admin' : 'message-nick';
    const adminBadge = msg.isAdmin ? ' 🐝' : '';

    let bodyHtml = formatMessage(msg.text || '');

    let imageHtml = '';
    if (msg.imageUrl) {
      imageHtml = `
        <div class="message-image">
          <img src="${escapeHtml(msg.imageUrl)}" alt="Shared image" onclick="openLightbox(this.src)" loading="lazy">
        </div>
      `;
    }

    el.innerHTML = `
      <div class="message-header">
        <span class="${nickClass}">${escapeHtml(msg.nick)}${adminBadge}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-body">${bodyHtml}</div>
      ${imageHtml}
    `;

    messagesContainer.appendChild(el);

    // Highlight code blocks
    el.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });

    if (scroll) scrollToBottom();
  }

  function addSystemMessage(text) {
    const el = document.createElement('div');
    el.className = 'message-system';
    el.innerHTML = `<span>${escapeHtml(text)}</span>`;
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  function showTyping(nick) {
    if (nick === myNick) return;
    typingIndicator.textContent = `${nick} is typing...`;
    typingIndicator.classList.remove('hidden');
    setTimeout(() => {
      typingIndicator.classList.add('hidden');
    }, 2000);
  }

  function updateUserList() {
    userList.innerHTML = users.map(u => `
      <li>
        <span>${escapeHtml(u.nick)}</span>
        ${u.isAdmin ? '<span class="admin-tag">ADMIN</span>' : ''}
      </li>
    `).join('');
    userCount.textContent = `${users.length} online`;
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ==========================================
  // Text Formatting
  // ==========================================

  function formatMessage(text) {
    if (!text) return '';

    // Escape HTML first
    let html = escapeHtml(text);

    // Code blocks: ```lang\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const langAttr = lang ? ` class="${lang}"` : '';
      return `<pre><code${langAttr}>${code.trim()}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

    return html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==========================================
  // Lightbox (global)
  // ==========================================

  window.openLightbox = function (src) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `<img src="${src}" alt="Full size image">`;
    lightbox.addEventListener('click', () => lightbox.remove());
    document.body.appendChild(lightbox);
  };

})();

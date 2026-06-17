import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'newbee_admin_2024';
const HISTORY_DIR = join(ROOT_DIR, 'data', 'history');
const UPLOADS_DIR = join(ROOT_DIR, 'data', 'uploads');

// Ensure directories exist
fs.mkdirSync(HISTORY_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Serve static files
app.use(express.static(join(ROOT_DIR, 'client')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Image upload handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${uuidv4()}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No valid image file provided' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Channel management
const channels = new Map();

function getChannel(name) {
  if (!channels.has(name)) {
    channels.set(name, {
      users: new Map(),
      history: loadHistory(name)
    });
  }
  return channels.get(name);
}

function loadHistory(channelName) {
  const historyFile = join(HISTORY_DIR, `${sanitizeFilename(channelName)}.json`);
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`Failed to load history for ${channelName}:`, e.message);
  }
  return [];
}

function saveHistory(channelName, history) {
  const historyFile = join(HISTORY_DIR, `${sanitizeFilename(channelName)}.json`);
  try {
    // Keep last 500 messages per channel
    const trimmed = history.slice(-500);
    fs.writeFileSync(historyFile, JSON.stringify(trimmed, null, 2));
  } catch (e) {
    console.error(`Failed to save history for ${channelName}:`, e.message);
  }
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function broadcast(channelName, message, excludeWs = null) {
  const channel = channels.get(channelName);
  if (!channel) return;

  const data = JSON.stringify(message);
  for (const [ws] of channel.users) {
    if (ws !== excludeWs && ws.readyState === 1) {
      ws.send(data);
    }
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  let currentChannel = null;
  let currentNick = null;
  let isAdmin = false;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.cmd) {
      case 'join': {
        const nick = (msg.nick || '').trim();
        const channel = (msg.channel || '').trim();

        if (!nick || nick.length > 24) {
          ws.send(JSON.stringify({ cmd: 'warn', text: 'Nickname must be 1-24 characters.' }));
          return;
        }
        if (!channel) {
          ws.send(JSON.stringify({ cmd: 'warn', text: 'Channel name required.' }));
          return;
        }

        // Check if admin login
        if (msg.password === ADMIN_PASSWORD) {
          isAdmin = true;
        }

        const ch = getChannel(channel);

        // Check for duplicate nicks
        for (const [, user] of ch.users) {
          if (user.nick.toLowerCase() === nick.toLowerCase()) {
            ws.send(JSON.stringify({ cmd: 'warn', text: 'Nickname already in use.' }));
            return;
          }
        }

        currentChannel = channel;
        currentNick = nick;

        ch.users.set(ws, { nick, isAdmin, joinedAt: Date.now() });

        // Send channel history (for admin, send all; for others, send last 50)
        const historyToSend = isAdmin ? ch.history : ch.history.slice(-50);
        ws.send(JSON.stringify({
          cmd: 'joined',
          nick,
          channel,
          isAdmin,
          users: Array.from(ch.users.values()).map(u => ({
            nick: u.nick,
            isAdmin: u.isAdmin
          })),
          history: historyToSend
        }));

        // Notify others
        broadcast(channel, {
          cmd: 'userJoined',
          nick,
          isAdmin,
          time: Date.now()
        }, ws);

        break;
      }

      case 'chat': {
        if (!currentChannel || !currentNick) return;

        const text = (msg.text || '').trim();
        if (!text && !msg.imageUrl) return;
        if (text.length > 2000) return;

        const chatMsg = {
          cmd: 'chat',
          nick: currentNick,
          text,
          imageUrl: msg.imageUrl || null,
          isAdmin,
          time: Date.now()
        };

        const ch = getChannel(currentChannel);
        ch.history.push(chatMsg);
        saveHistory(currentChannel, ch.history);

        broadcast(currentChannel, chatMsg);
        break;
      }

      case 'typing': {
        if (!currentChannel || !currentNick) return;
        broadcast(currentChannel, {
          cmd: 'typing',
          nick: currentNick
        }, ws);
        break;
      }

      case 'clearHistory': {
        if (!isAdmin || !currentChannel) return;
        const ch = getChannel(currentChannel);
        ch.history = [];
        saveHistory(currentChannel, []);
        broadcast(currentChannel, { cmd: 'historyCleared' });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentChannel && currentNick) {
      const ch = channels.get(currentChannel);
      if (ch) {
        ch.users.delete(ws);
        broadcast(currentChannel, {
          cmd: 'userLeft',
          nick: currentNick,
          time: Date.now()
        });

        // Cleanup empty channels (but keep history)
        if (ch.users.size === 0) {
          channels.delete(currentChannel);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n  🐝 new.bee is running at http://localhost:${PORT}\n`);
});

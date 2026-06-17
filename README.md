# 🐝 new.bee

A minimal, modern, anonymous chat application with image sharing and admin persistence.

## Features

- **Anonymous chat** — no accounts, join with just a nickname
- **URL-based channels** — `?channelname` creates/joins a room
- **Image sharing** — upload and share images directly in chat (5MB limit)
- **Persistent history** — messages are stored on server, admin sees full history
- **Admin mode** — log in with a password for admin privileges
- **Code highlighting** — syntax highlighting via highlight.js
- **Modern dark UI** — sleek, responsive design
- **Typing indicators** — see when someone is typing
- **Lightbox** — click images to view full-size

## Quick Start

```bash
npm install
npm start
```

Then open `http://localhost:3000/?lounge` in your browser.

## Admin Access

To log in as admin, enter the admin password when joining a channel.  
Default password: `newbee_admin_2024`  
Change it via the `ADMIN_PASSWORD` environment variable.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `ADMIN_PASSWORD` | `newbee_admin_2024` | Admin login password |

## Deploying to GitHub (for persistence)

The `data/history/` and `data/uploads/` folders store chat logs and images.  
To persist on GitHub:

1. Remove `data/history/` and `data/uploads/` from `.gitignore`
2. Commit and push periodically, or set up a cron job

## Tech Stack

- **Backend:** Node.js + Express + WebSocket (ws)
- **Frontend:** Vanilla HTML/CSS/JS
- **Image upload:** Multer
- **Code highlighting:** highlight.js
- **Fonts:** JetBrains Mono + Inter

## License

MIT

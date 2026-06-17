# 🐝 new.bee

A minimal, distraction-free, anonymous chat application.

## What is new.bee?

new.bee is a lightweight chat service where you can talk to anyone without creating an account. No sign-ups, no email, no tracking. Just pick a nickname and start chatting.

## How to Use

1. Visit the app
2. Change the text after `?` in the URL to create or join a channel
3. Pick a nickname
4. Chat

That's it.

## Channels

Channels are created by URL. Go to `?anything` and you're in a room. There are no channel lists — a secret channel name is a private room.

Some channels to get started:

- `?lounge` — general chat
- `?programming` — code talk
- `?tech` — technology
- `?random` — whatever
- `?banana` — 🍌

## Features

- **Anonymous** — no accounts, no registration
- **Ephemeral** — no message history is retained on the server
- **Image sharing** — share images directly in chat (not stored permanently)
- **Code highlighting** — paste code with syntax highlighting
- **Formatting** — supports `**bold**`, `*italic*`, `` `inline code` ``, and code blocks
- **Typing indicators** — see when someone is typing
- **Modern dark UI** — easy on the eyes

## Privacy

- No accounts or personal data collected
- No message history stored on the server
- No tracking, no analytics
- Images are temporary and not permanently stored
- When you leave, it's gone

## Self-Hosting

```bash
git clone https://github.com/lalithchary/new.bee.git
cd new.bee
npm install
npm start
```

Or with Docker:

```bash
git clone https://github.com/lalithchary/new.bee.git
cd new.bee
docker compose up -d
```

The app runs on port `3000` by default.

## License

MIT

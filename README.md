# DrakoBot-Dashboard-Addon

> ⚠️ **Archived test project**
>
> This repository was a private test project (May/June 2025) and is provided here as an
> archive only. It is **not maintained** and there is **no support**.
> **No guarantee is given that anything works** – use at your own risk.
>
> This is an **unofficial** addon. It is not affiliated with or endorsed by the
> developers of Drako Bot. Drako Bot itself is **not** included.

## What is it?

A live monitoring dashboard for Drako Bot (discord.js v14), built with Express and
Socket.IO, storing data in **MongoDB** (and a small SQLite file for presence/username history):

- Bot status, server list, server statistics, channels (with last message)
- Live event feed: messages, deleted messages, joins/leaves, voice activity,
  presence changes, member/username/nickname changes
- User overview, active users, user activity and presence history, audit log viewer
- Performance view (CPU/RAM), configurable update interval

> Note: the dashboard UI, log messages and code comments are partly in **German**.

## Setup (rough outline)

1. Copy the folder into your Drako Bot addons folder.
2. `npm install` (`express`, `socket.io`, `mongodb` 4.x, `sqlite3`).
3. Run a MongoDB instance and edit `config.json` (created on first start):

   | Key | Meaning | Default |
   |-----|---------|---------|
   | `port` | dashboard port | `3000` |
   | `host` | listen address | `127.0.0.1` |
   | `mongoUri` | MongoDB connection string | `mongodb://127.0.0.1:27017` |
   | `mongoDbName` | database name | `discord-dashboard` |
   | `adminRoleId` | stored in the config, not used for access control | – |
   | `socketIoClient` | `cdn` or local Socket.IO client | `cdn` |

The bot needs the privileged **Server Members**, **Presence** and **Message Content** intents.

## ⚠️ Privacy and security notice

- This addon **logs message contents, deleted messages, presence/activity and username
  changes** of all members. Storing this kind of data requires a legal basis and
  transparency towards your members (e.g. GDPR) and must comply with Discord's
  Developer Terms and Policy. You are responsible for how you use it.
- The dashboard has **no authentication**. It therefore only listens on `127.0.0.1` by
  default – do not expose it without putting authentication in front of it.

## Changes compared to the original private version

- Removed hard-coded MongoDB credentials and the personal database name; the connection
  string and database name are now configurable.
- The dashboard binds to `127.0.0.1` by default (previously all interfaces).
- Removed the local SQLite history database; added `package.json` (MongoDB driver 4.x,
  because the code uses the callback API that was removed in driver 5).

## Known state

Briefly tested (October 2026, Node.js 26, MongoDB 7, mocked Discord client): dashboard
page, bot status, server list, channels, all users, active users, message logs, member
logs, user activities, presence history, config endpoint; a message event is stored and
shown; the dashboard is not reachable from the LAN.
`/export-logs/...` is an unfinished stub and never responds.
Not tested against a real Drako Bot installation or a live Discord server.

## License

[MIT](LICENSE)

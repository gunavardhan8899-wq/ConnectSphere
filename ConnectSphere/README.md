# ConnectSphere

A real-time group chat starter application built with HTML, CSS, vanilla JavaScript, Node.js, Express, Socket.IO, MongoDB, and Mongoose.

## Features included
- Registration and login with bcrypt password hashing and an HTTP-only JWT cookie
- Group creation, group listing, member invitations by registered email, and leaving a group
- Real-time group messages persisted to MongoDB
- Group membership checks on REST and Socket.IO operations
- Typing indicators, online presence event, responsive layout, light/dark theme
- Message history, search groups, and member list
- Helmet security headers, login/register rate limiting, environment-based secrets

## Requirements
- Node.js 18+ (a current LTS release is recommended)
- MongoDB local instance or MongoDB Atlas database

## Setup
1. Open this directory in a terminal.
2. Install packages: `npm install`
3. Copy `.env.example` to `.env`.
4. Set `MONGODB_URI` to your database connection string.
5. Set `JWT_SECRET` to a long random secret. Do not commit `.env`.
6. Start MongoDB if using a local database.
7. Run `npm run dev` (or `npm start`).
8. Visit `http://localhost:3000`.

## Notes and limitations
This is a runnable MVP foundation, not a fully audited production service. Password reset, attachments, message editing/deletion UI, read receipts, unread counters, group rename/remove-member UI, and comprehensive automated tests are not implemented yet. Online presence is broadcast as a simple process-local event and is not a durable presence store. For deployment behind a proxy, review cookie settings and configure HTTPS. Cookie-authenticated deployments should add a CSRF strategy appropriate to the hosting architecture. For multiple backend instances, configure a shared Socket.IO adapter and shared presence state.

## Main endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/groups`, `POST /api/groups`, `GET /api/groups/:id`, `POST /api/groups/:id/members`, `POST /api/groups/:id/leave`
- `GET /api/groups/:id/messages`
- `GET /api/users/search?q=`

## Socket.IO events
Client: `join_group`, `leave_group`, `send_message`, `typing_start`, `typing_stop`
Server: `new_message`, `typing`, `presence`

## Troubleshooting
- If the server exits immediately, check that `.env` exists and `JWT_SECRET` is set.
- If MongoDB fails to connect, check `MONGODB_URI`, Atlas network access, and database credentials.
- If the browser cannot connect, verify the server started and open the exact local address above.

# 🎨 Inkblot — Draw. Guess. Repeat.

A real-time multiplayer drawing and guessing game built with Next.js, Socket.IO, and MongoDB.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Auth**: JWT (httpOnly cookies), bcrypt password hashing
- **Database**: MongoDB Atlas (Mongoose)
- **Real-time**: Socket.IO on Railway
- **Deployment**: Vercel (frontend) + Railway (socket server)

---

## Getting Started (for collaborators)

### 1. Clone the repo

### 2. Install dependencies

```bash
# Next.js app
npm install

# Socket server
cd socket-server
npm install
cd ..
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable                 | Where to get it                                                                 |
| ------------------------ | ------------------------------------------------------------------------------- |
| `MONGODB_URI`            | MongoDB Atlas → Connect → Drivers                                               |
| `JWT_SECRET`             | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` for development                                         |
| `FRONTEND_URL`           | `http://localhost:3000` for development                                         |

### 4. Set up MongoDB Atlas

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Add your IP to Network Access (or allow all IPs: `0.0.0.0/0`)
4. Copy the connection string into `MONGODB_URI` in `.env.local`

### 5. Run the development servers

Open **two terminal tabs**:

**Tab 1 — Next.js app:**

```bash
npm run dev
# Runs on http://localhost:3000
```

**Tab 2 — Socket server:**

```bash
cd socket-server
node index.js
# Runs on http://localhost:3001
```

### 6. Create an admin account

1. Register normally at `localhost:3000`
2. Go to MongoDB Atlas → Browse Collections → `inkblot` → `users`
3. Find your user → Edit → change `role` from `"user"` to `"admin"` → Save
4. Log out and back in
5. Visit `localhost:3000/admin`

---

## Project Structure

```
inkblot/
├── app/
│   ├── page.tsx              # Landing + Auth
│   ├── lobby/                # Lobby page
│   ├── room/[id]/            # Game room (real-time)
│   ├── admin/                # Admin dashboard
│   ├── 403/                  # Forbidden page
│   └── api/
│       ├── auth/             # register, login, logout, session
│       └── admin/users/      # user management
├── components/
├── lib/
│   ├── db.ts                 # MongoDB connection
│   ├── auth.ts               # Cookie + bcrypt helpers
│   └── jwt.ts                # JWT sign/verify (Edge-safe)
├── models/
│   └── User.ts               # Mongoose user schema
├── socket-server/
│   └── index.js              # Standalone Socket.IO server
├── middleware.ts              # Route protection
└── .env.example              # Environment variable template
```

---

## Features

- 🔐 JWT authentication with bcrypt password hashing
- 👑 Role-based access control (admin / user)
- 🎨 Real-time collaborative drawing canvas
- 💬 Live chat and guessing with first-guess fairness
- ⏱️ Round timer with automatic turn rotation
- 🏆 Live leaderboard with score tracking
- 📊 Admin dashboard — manage users, roles, word bank
- 📱 Responsive design

---

## Rubric Coverage

| Criterion               | Implementation                        |
| ----------------------- | ------------------------------------- |
| Auth end-to-end         | `app/api/auth/` routes                |
| bcrypt hashing          | `lib/auth.ts` — 12 salt rounds        |
| No plain-text passwords | `select: false` on passwordHash field |
| Secure hash comparison  | `bcrypt.compare()`                    |
| Two roles (admin/user)  | User model enum + middleware          |
| Admin route protection  | `middleware.ts` + server-side check   |
| Admin user management   | `app/api/admin/users/` PATCH route    |
| Client-side validation  | `app/page.tsx` validators             |
| Server-side validation  | All API routes sanitize inputs        |
| Session management      | httpOnly JWT cookie, 7-day expiry     |

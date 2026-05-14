# 🎨 inkblot — Real-Time Multiplayer Drawing Game

> draw • guess • repeat

A real-time multiplayer drawing and guessing game inspired by Skribbl.io, built as a full-stack web application for the Web Programming course project.

---

## 👥 Team

| Name          | Roll No  |
| ------------- | -------- |
| Shahmeer Atif | 23i-0711 |
| Muhammad Umar | 23i-0782 |

---

## 🚀 Live Demo

**Frontend:** https://web-project-seven-orpin.vercel.app  
**Socket Server:** https://webproject-production-c326.up.railway.app

---

## 📖 About

Inkblot is a real-time scribble battle where players take turns drawing a secret word while others race to guess it in the chat. Each player draws once per round, scores are tracked live, and the person with the most points at the end wins.

---

## ✨ Features

### Gameplay

- Real-time drawing canvas with brush, eraser, color palette, brush sizes, undo, and clear
- Live stroke synchronization across all players via Socket.IO
- Word hints displayed as letter dashes for guessers
- Animated timer ring counting down each turn
- Word of the Day with bonus points set by admin
- Late joiner canvas catch-up (snapshot replay)
- Tie detection and winner announcement overlay

### Rooms

- Quick Play — instantly joins or creates an open room
- Custom Room — configurable player count (4–12), rounds (3–10), draw time (30–120s)
- Password-protected private rooms
- Join by Room ID with password support
- Invite friends directly from the game room

### Authentication & Security

- JWT-based authentication with httpOnly cookies
- bcrypt password hashing (12 salt rounds)
- Secure password comparison (never string equality)
- Token-based password reset via email (Resend)
- Session expires after **30 minutes of inactivity** (sliding window)
- Inactivity warning modal 5 minutes before logout

### Social

- Friends system — send/accept/reject friend requests
- Friend search by username
- In-game friend invites with real-time delivery via Socket.IO
- Add Friend button on the leaderboard during games

### Admin Panel

- Dashboard with live user stats
- User management — view, activate/suspend, change roles, delete
- Role-based access control (admin / user)
- Word of the Day management — set word, hint, and bonus points per date
- Word Bank (Easy / Medium / Hard / Custom categories)

---

## 🛠️ Tech Stack

| Layer     | Technology                                        |
| --------- | ------------------------------------------------- |
| Frontend  | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend   | Next.js API Routes                                |
| Database  | MongoDB Atlas (Mongoose)                          |
| Real-time | Socket.IO hosted on Railway                       |
| Auth      | JWT (jose), bcryptjs                              |
| Email     | Resend API                                        |
| Hosting   | Vercel (frontend) + Railway (socket server)       |

---

## 🗂️ Project Structure

```
inkblot/
├── app/
│   ├── page.tsx                  # Login / Signup page
│   ├── lobby/                    # Lobby with Quick Play, Create Room, Word of Day
│   ├── room/[id]/                # Game room (canvas, chat, leaderboard)
│   ├── admin/                    # Admin panel
│   ├── reset-password/           # Password reset page
│   └── api/
│       ├── auth/                 # login, register, logout, session, forgot/reset password
│       ├── rooms/                # create, join, quick play
│       ├── friends/              # friend requests
│       ├── invites/              # game invites
│       ├── wordofday/            # public word of day endpoint
│       └── admin/                # users, word of day management
├── models/                       # Mongoose models
├── lib/                          # JWT, auth helpers, DB connection, socket client
├── hooks/                        # useInactivityLogout
├── components/                   # FriendsPanel, AddFriendButton
└── socket-server/
    └── index.js                  # Standalone Socket.IO server (Node.js)
```

---

## ⚙️ Setup & Running Locally

### Prerequisites

- Node.js 18+
- MongoDB Atlas connection string
- A Resend account (for password reset emails)

### 1. Clone the repository

```bash
git clone https://github.com/Shahmeer-Atif/WEB_Project.git
cd WEB_Project
```

### 2. Install dependencies

```bash
# Frontend
npm install

# Socket server
cd socket-server
npm install
cd ..
```

### 3. Environment variables

Create `.env.local` in the root:

```env
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key_min_32_chars
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
```

Create `.env` in `socket-server/`:

```env
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### 4. Run the app

```bash
# Terminal 1 — Next.js frontend
npm run dev

# Terminal 2 — Socket server
cd socket-server
node index.js
```

Open http://localhost:3000

---

## 🎮 How to Play

1. **Sign up / Log in** at the landing page
2. Click **Quick Play** to jump into a room instantly, or **Create Room** to set custom rules
3. When it's your turn, draw the word shown in the yellow bar at the top
4. When others are drawing, type your guesses in the chat
5. Guessing correctly earns points based on how fast you guessed
6. The player with the most points after all rounds wins 🏆

---

## 🔐 Admin Access

Admins can access `/admin` from the lobby nav. Admin accounts are set via the User Management panel. Admin features include user management, Word of the Day scheduling, and word bank editing.

---

## 📦 Deployment

| Service     | Config                                                                 |
| ----------- | ---------------------------------------------------------------------- |
| **Vercel**  | Root `/`, branch `main`, env vars set in dashboard                     |
| **Railway** | Root `socket-server/`, branch `main`, `PORT` env var set automatically |

Both services auto-deploy on every push to `main`.

---

## 📄 License

Built for academic purposes — Web Programming course, FAST-NUCES Islamabad.

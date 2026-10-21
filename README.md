# Msg-app: Full-Stack Real-Time Chat Application

A full-stack, real-time messaging application built with React, Node.js, Express, Socket.IO, MongoDB, and Tailwind CSS. The application supports user authentication with JWT, instant messaging, online status tracking, image sharing via Cloudinary, and interface theming with DaisyUI.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture and Communication Flow](#system-architecture-and-communication-flow)
  - [REST API Communication](#rest-api-communication)
  - [Socket.IO Real-Time Flow](#socketio-real-time-flow)
  - [Message Storage and History Retrieval](#message-storage-and-history-retrieval)
- [Project Directory Structure](#project-directory-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Installation and Setup](#local-installation-and-setup)
  - [1. Clone and Install Dependencies](#1-clone-and-install-dependencies)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
  - [3. Optional: Seed Initial Users](#3-optional-seed-initial-users)
  - [4. Run in Development Mode](#4-run-in-development-mode)
- [Production Build and Execution](#production-build-and-execution)
- [Deployment Guide (Render)](#deployment-guide-render)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Screenshots](#screenshots)
- [License](#license)

---

## Overview

Msg-app is designed as a single monorepo containing a client frontend (`frontend`) and a server backend (`backend`). In development, the React frontend runs on Vite and proxies API requests to Express, with Socket.IO providing bidirectional event streaming. In production, the backend serves the compiled static frontend bundle alongside API endpoints on a single port.

---

## Key Features

- **Authentication and Authorization**: User signup, login, and logout powered by JSON Web Tokens (JWT) stored in HTTP-only cookies, with password hashing via bcryptjs.
- **Real-Time 1-on-1 Messaging**: Instant messaging powered by Socket.IO with automatic message appending for both sender and receiver without page refreshes.
- **Online Presence Tracking**: Real-time broadcast of currently connected users displayed via sidebar indicators and contact lists.
- **Image Sharing**: Support for uploading and sharing photos within chats, stored remotely on Cloudinary.
- **Profile Customization**: Users can view profile details, account creation timestamp, and update their profile avatar.
- **Theme Customization**: 32 pre-configured themes powered by DaisyUI and Tailwind CSS v4, persisted in browser `localStorage`.
- **Responsive Layout**: Collapsible sidebar, mobile-friendly navigation, and adaptive chat containers.

---

## Technology Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router DOM (v7)
- **State Management**: Zustand
- **Styling**: Tailwind CSS (v4) with DaisyUI (v5)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **HTTP Client**: Axios
- **WebSockets Client**: Socket.IO Client

### Backend
- **Runtime**: Node.js
- **Server Framework**: Express.js (v5)
- **Real-Time Engine**: Socket.IO (v4)
- **Database ODM**: Mongoose (v9) with MongoDB Atlas
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) and `bcryptjs`
- **Cookie Parsing**: `cookie-parser`
- **File Upload Service**: Cloudinary SDK (v2)
- **Environment Management**: `dotenv`
- **CORS Handling**: `cors`
- **Development Tooling**: `nodemon`

---

## System Architecture and Communication Flow

### REST API Communication
The React client uses Axios with `withCredentials: true` to authenticate HTTP requests. When a user signs in, the backend issues a signed JWT stored inside an HTTP-only, `sameSite: "strict"` cookie named `jwt`. Subsequent requests to protected endpoints (`/api/auth/*` and `/api/messages/*`) pass through the `protectRoute` middleware, which verifies the token and attaches the authenticated user record to `req.user`.

```
[React Client (Axios)]
        |
        |  HTTP Requests (Cookies included)
        v
[Express API Router]
        |
        +---> [protectRoute Middleware] (Verifies JWT cookie)
                    |
                    +---> [Auth Controller]   (/api/auth/...)
                    +---> [Message Controller](/api/messages/...)
```

### Socket.IO Real-Time Flow
The HTTP server and the Socket.IO instance share the same network server instance (`http.createServer(app)`).

1. **Connection**: When a user logs in, `useAuthStore.connectSocket()` opens a WebSocket connection to the backend passing `userId` in `socket.handshake.query`.
2. **Online Mapping**: The backend maps the user ID to the socket ID (`userSocketMap[userId] = socket.id`) and broadcasts the updated list of online user IDs to all clients via `io.emit("getOnlineUsers", Object.keys(userSocketMap))`.
3. **Message Dispatch**: When user A sends a message to user B:
   - The message is posted via HTTP POST to `/api/messages/send/:id`.
   - The backend saves the message to MongoDB.
   - The backend checks `userSocketMap[receiverId]`. If the recipient is online, it targets that specific socket: `io.to(receiverSocketId).emit("newMessage", newMessage)`.
   - The recipient client receives the event via `useChatStore` and appends the message to state.
4. **Disconnection**: When a socket disconnects, the user ID is removed from `userSocketMap` and the updated list is broadcast again.

### Message Storage and History Retrieval
Messages are stored in MongoDB using the `Message` model schema:

```javascript
{
  senderId: ObjectId (ref: "User", required: true),
  receiverId: ObjectId (ref: "User", required: true),
  text: String,
  image: String,
  timestamps: true (createdAt, updatedAt)
}
```

When a conversation is opened with a selected user:
- The client calls `GET /api/messages/:id`.
- The controller queries MongoDB for all messages where:
  `($or: [{ senderId: myId, receiverId: userToChatId }, { senderId: userToChatId, receiverId: myId }])`.
- Messages are returned chronologically and rendered in the message container.

---

## Project Directory Structure

```
Msg-app/
├── package.json               # Root monorepo build and start scripts
├── .gitignore                 # Ignored files (node_modules, .env, dist)
├── backend/
│   ├── package.json           # Backend dependencies and scripts
│   ├── .env                   # Server environment variables (not committed)
│   └── src/
│       ├── index.js           # Server entry point, middleware, and production static routing
│       ├── controllers/
│       │   ├── auth.controller.js     # Signup, login, logout, checkAuth, updateProfile
│       │   └── message.controller.js  # getUsersForSidebar, getMessages, sendMessage
│       ├── lib/
│       │   ├── cloudinary.js  # Cloudinary configuration
│       │   ├── db.js          # MongoDB Mongoose connection
│       │   ├── socket.js      # Socket.IO initialization and socket mapping
│       │   └── utils.js       # JWT generation and cookie configuration
│       ├── middleware/
│       │   └── auth.middleware.js # Route protection and JWT verification
│       ├── models/
│       │   ├── message.mode.js # Message Mongoose schema
│       │   └── user.model.js   # User Mongoose schema
│       ├── routes/
│       │   ├── auth.route.js    # Authentication and profile endpoints
│       │   └── message.route.js # Messaging endpoints
│       └── seeds/
│           └── user.seed.js   # Sample user seeding script
└── frontend/
    ├── package.json           # Frontend dependencies and scripts
    ├── index.html             # HTML template
    ├── vite.config.js         # Vite configuration with Tailwind CSS plugin
    └── src/
        ├── App.jsx            # Main app router and auth initialization
        ├── main.jsx           # React root rendering with BrowserRouter
        ├── index.css          # Tailwind CSS v4 and DaisyUI theme definitions
        ├── components/
        │   ├── AuthImagePattern.jsx # Decorative animated grid for auth pages
        │   ├── ChatContainer.jsx    # Chat header, message feed, and input form
        │   ├── ChatHeader.jsx       # Selected chat partner info and close button
        │   ├── MessageInput.jsx     # Text input and image attachment handler
        │   ├── Navbar.jsx           # Global application navigation bar
        │   ├── NoChatSelected.jsx   # Empty state placeholder
        │   ├── Sidebar.jsx          # Contacts list with online filter
        │   └── skeletons/           # Loading placeholder skeletons
        │       ├── MessageSkeleton.jsx
        │       └── SidebarSkeleton.jsx
        ├── constants/
        │   └── index.js       # List of 32 DaisyUI themes
        ├── lib/
        │   ├── axios.js       # Axios instance with base URL configuration
        │   └── utils.js       # Message timestamp formatting helper
        ├── pages/
        │   ├── HomePage.jsx     # Main chat layout
        │   ├── LoginPage.jsx    # User login page
        │   ├── ProfilePage.jsx  # User account and avatar upload page
        │   ├── SettingsPage.jsx # Theme selection and live preview
        │   └── SignUpPage.jsx   # User registration page
        └── store/
            ├── useAuthStore.js  # Zustand store for user auth and socket connection
            ├── useChatStore.js  # Zustand store for messages, contacts, and active chat
            └── useThemeStore.js # Zustand store for UI theme state and persistence
```

---

## Prerequisites

Before running the application locally, ensure you have:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB Atlas** account (or local MongoDB database instance)
- **Cloudinary** account (for media storage)

---

## Environment Variables

Create a `.env` file inside the `backend/` directory:

```bash
# Path: backend/.env

PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloudinary_cloud_name
```

Do not commit `backend/.env` to version control.

---

## Local Installation and Setup

### 1. Clone and Install Dependencies

Clone the repository and install dependencies for both the frontend and backend:

```bash
# Clone the repository
git clone https://github.com/your-username/Msg-app.git
cd Msg-app

# Install root dependencies and submodules
npm run build
```

Alternatively, install dependencies manually in each directory:

```bash
# Install backend packages
cd backend
npm install

# Install frontend packages
cd ../frontend
npm install
cd ..
```

### 2. Configure Environment Variables

Populate `backend/.env` using the template outlined in the [Environment Variables](#environment-variables) section.

### 3. Optional: Seed Initial Users

You can populate your database with dummy contacts to test the chat interface:

```bash
cd backend
node src/seeds/user.seed.js
cd ..
```

### 4. Run in Development Mode

Run the backend and frontend in separate terminals:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
The server will start on `http://localhost:5001`.

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`.

---

## Production Build and Execution

The root `package.json` contains scripts to install, compile, and execute the production server:

1. **Build the production bundle:**
   ```bash
   npm run build
   ```
   This command installs dependencies in both `backend` and `frontend`, then compiles the frontend into static assets located at `frontend/dist`.

2. **Start the production server:**
   ```bash
   npm start
   ```
   This runs `node src/index.js` inside the `backend` directory.

When `NODE_ENV=production`, Express serves the compiled frontend assets from `frontend/dist` and routes non-API requests to `frontend/dist/index.html`.

---

## Deployment Guide (Render)

Deploying Msg-app to [Render](https://render.com/) as a Web Service:

1. Push your repository to GitHub or GitLab.
2. Log into Render and click **New +** > **Web Service**.
3. Select your repository.
4. Configure the service settings:
   - **Name**: `msg-app` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose the region closest to your database
   - **Branch**: `main`
   - **Root Directory**: Leave blank (operates from the repository root)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Add the Environment Variables under the **Environment** tab:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (or leave default, Render sets `PORT` automatically)
   - `MONGODB_URI`: Your MongoDB Atlas connection URI
   - `JWT_SECRET`: A secure random secret string
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
   - `CLOUDINARY_URL`: Your full Cloudinary connection URL
6. Click **Create Web Service**.

Render will install dependencies, build the frontend bundle, and start the unified server.

---

## Troubleshooting Common Issues

### 1. Cloudinary Returns 403 Forbidden on Image Uploads
- **Cause 1**: The email associated with the Cloudinary account is unverified. Cloudinary blocks upload API operations until the verification link is clicked.
- **Cause 2**: The API key permissions are restricted or read-only. Ensure the key has write/upload permissions in Cloudinary Settings > Access Keys.
- **Cause 3**: Secret contains leading special characters (like hyphens). Enclose the credential in double quotes inside `backend/.env`.

### 2. Payload Too Large (HTTP 413) on Image Upload
- **Cause**: Uploading high-resolution photos sends large Base64 data strings exceeding Express's default 100 KB limit.
- **Solution**: Verify that `express.json({ limit: "10mb" })` is configured in `backend/src/index.js`.

### 3. Socket Connection Fails in Development
- **Cause**: Port mismatch or mismatched CORS origin.
- **Solution**: Verify that `backend/src/lib/socket.js` allows CORS origin `http://localhost:5173`, and frontend `BASE_URL` in `useAuthStore.js` points to `http://localhost:5001`.

### 4. Static Frontend Routing in Production
- **Cause**: In `backend/src/index.js`, ensure the production fallback path correctly resolves to `frontend/dist/index.html`.
- **Note**: When running from `backend/`, verify that `path.join(__dirname, "../frontend/dist")` matches the relative location of the compiled `dist` directory.

---

## Screenshots

> Replace the placeholders below with application screenshots.

| Login Screen | Chat Interface |
|:---:|:---:|
| ![Login Screenshot](https://via.placeholder.com/600x350?text=Login+Screen) | ![Chat Screenshot](https://via.placeholder.com/600x350?text=Chat+Interface) |

| Profile Customization | Theme Selection |
|:---:|:---:|
| ![Profile Screenshot](https://via.placeholder.com/600x350?text=Profile+Screen) | ![Theme Selection](https://via.placeholder.com/600x350?text=Theme+Settings) |

---

## License

This project is licensed under the **ISC License**, matching the repository configuration in `package.json`.

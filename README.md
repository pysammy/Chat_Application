# Chat_Application

## Prerequisites
- Node.js 18+ (recommended)
- npm
- MongoDB connection string
- Cloudinary account credentials (for image uploads)

## Project Structure
- `backend/` - Express + MongoDB + Socket.IO server
- `frontend/` - React + Vite client

## Setup
1. Clone the repository and open the project root.
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
4. Create environment files:
   - Copy `backend/.env.sample` to `backend/.env` and fill required values.
   - Copy `frontend/.env.sample` to `frontend/.env`.

## Start The App
Run backend and frontend in separate terminals.

1. Start backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open the app:
   - `http://localhost:5173`

## Default Local Ports
- Frontend: `5173`
- Backend: `5001`

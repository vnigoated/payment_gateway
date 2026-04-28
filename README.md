# Payment Gateway

A modern payment gateway API built with a decoupled architecture. 
- **Frontend**: Next.js (React)
- **Backend**: FastAPI (Python)

## Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL (or SQLite for local dev)

---

## 🔧 1. Backend Setup

The backend handles the core REST API, database migrations, and background tasks (like webhooks and emails).

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in the values:
   ```bash
   cp .env.example .env
   ```
   *(Make sure `DATABASE_URL` is set correctly. By default, it might use SQLite: `sqlite:///./app.db`)*

5. **Run Migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start the API Server:**
   ```bash
   python run.py
   ```
   The backend will run on `http://localhost:8000`. API docs are available at `http://localhost:8000/docs`.

---

## 💻 2. Frontend Setup

The frontend handles the dashboard and the public payment pages for your customers.

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Copy `.env.local.example` to `.env.local` and configure your backend API URL:
   ```bash
   cp .env.local.example .env.local
   ```
   *(Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000` is set)*

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The Next.js application will run on `http://localhost:3000`.

---

## Architecture Note
This project uses a decoupled architecture. Ensure both servers (Next.js and FastAPI) are running simultaneously during local development. The Next.js frontend interacts with the FastAPI backend exclusively through the REST API.

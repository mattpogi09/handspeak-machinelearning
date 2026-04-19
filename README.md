# HandSpeak 🖐🌟

**HandSpeak** is an interactive, gamified ASL (American Sign Language) learning application designed with a robust Deep Learning/Computer Vision pipeline for real-time gesture recognition.

This application combines a beautiful 3D-styled interactive web map frontend with a powerful Python (FastAPI) backend. It connects to a Supabase PostgreSQL database to persist learning progress across user sessions.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React.js (via Vite)
- **UI/UX**: Custom CSS components, `lucide-react` for scalable iconography, `react-hot-toast` for global application state/errors
- **Routing**: `react-router-dom` v6

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **Database**: PostgreSQL (via Supabase)
- **Machine Learning**: 
  - MediaPipe for topological hand-tracking
  - PyTorch (`.pt`) for dynamic spatial gesture classification

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher) and `npm`
- **Python** (v3.9 or higher)
- **Git**

---

## 🚀 Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/handspeak-machinelearning.git
cd handspeak-machinelearning
```

### 2. Backend Setup
Navigate to the backend directory and set up your Python environment:
```bash
cd backend

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Environment Variables
You'll need a `.env` file in the `backend/` directory containing your Supabase connection strings or other required environment tokens. Create one based on `env_bootstrap.py` defaults:
```env
DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
# Add any other tokens as needed
```

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install the Node packages:
```bash
cd frontend

# Install Node dependencies
npm install
```

---

## 🏃‍♂️ Running the Application

To run the full stack locally, you need both the frontend client and the backend server running simultaneously.

### Start the Backend (Terminal 1)
```bash
cd backend
.venv\Scripts\Activate.ps1  # (Or source .venv/bin/activate on Mac/Linux)
uvicorn main:app --reload
```
*The API will be available at `http://localhost:8000`*

### Start the Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
*The web app will be available at `http://localhost:5173`*

---

## 🗺 Features Overview

- **Interactive Islands Hub**: Navigable SVG-based roadmap tracking practice progress visually.
- **Learn Mode**: Flashcard-style previews of ASL signs.
- **Drill Mode**: Gamified camera-based repetition system utilizing the integrated machine learning model.
- **Converse Mode (Reply Quests)**: Real-time contextual sign simulations against interactive NPC scenarios.
- **Robust Error Handling**: Graceful error UI bounds (via React Hot Toast & custom global Skeletons) managing API latency.
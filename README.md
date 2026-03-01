# 🐠 HandSpeak - ASL Learning Platform

A gamified ocean-themed web application for learning American Sign Language (ASL).

## Project Structure

```
new Ocean-sign-language/
├── backend/                    # FastAPI Python backend
│   ├── data/
│   │   └── asl_data.py         # Static ASL datasets (alphabets, phrases)
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   ├── routes/
│   │   ├── auth.py             # Authentication routes
│   │   ├── practice.py         # Practice mode routes
│   │   └── study.py            # Study mode routes
│   ├── main.py                 # FastAPI app entry point
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── assets/             # Images, icons, backgrounds
│   │   ├── components/         # Reusable components
│   │   │   ├── Camera.jsx      # Webcam camera component
│   │   │   ├── Camera.css
│   │   │   ├── Navbar.jsx      # Navigation bar
│   │   │   └── Navbar.css
│   │   ├── data/
│   │   │   └── aslData.js      # Frontend static ASL data
│   │   ├── pages/              # Page components
│   │   │   ├── Login.jsx       # Sign In page
│   │   │   ├── SignUp.jsx      # Create Account page
│   │   │   ├── Welcome.jsx     # Profile setup (name, nickname)
│   │   │   ├── Dashboard.jsx   # Main hub with 2 islands
│   │   │   ├── Practice.jsx    # Sandy Shores - alphabet & numbers
│   │   │   ├── PracticeSession.jsx  # Camera practice for letters
│   │   │   ├── Study.jsx       # Deep Dive Study - topic path
│   │   │   ├── StudySession.jsx     # Camera study for phrases
│   │   │   └── Settings.jsx    # User settings
│   │   ├── App.jsx             # Root component with routing
│   │   ├── App.css             # Global app styles
│   │   ├── index.js            # React entry point
│   │   └── index.css           # CSS reset & variables
│   └── package.json
│
└── README.md
```

## Getting Started

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React)

```bash
cd frontend
npm install
npm start
```

The React app runs on `http://localhost:3000` and proxies API requests to `http://localhost:8000`.

## Features

- **Sign In / Sign Up** - Ocean-themed authentication
- **Profile Setup** - Enter name and get your "Diver License"
- **Practice Island (Sandy Shores)** - Practice ASL alphabet (A-Z) and numbers (0-9) with camera
- **Study Voyage (Deep Dive Study)** - Learn ASL phrases by topic with progress tracking
- **Camera Integration** - Real-time webcam for practicing signs
- **Gamification** - Ocean theme, progress whale, island unlocks

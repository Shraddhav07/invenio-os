# Invenio OS - Warehouse Intelligence

## Introduction
Invenio OS is an advanced Warehouse Intelligence system that combines real-time Computer Vision (CV) with a modern web interface to track inventory, shelves, and warehouse operations. It uses ArUco markers to create a live digital twin of your warehouse, enabling accurate spatial tracking, live camera feeds, and an AI-powered assistant to query warehouse data.

## System Architecture
* **Frontend**: React, Vite, Tailwind CSS, Zustand for state management, and TanStack Query for data fetching. It leverages Framer Motion for smooth animations and Three.js for 3D visualization.
* **Backend**: FastAPI for high-performance REST/WebSocket endpoints, OpenCV for ArUco marker detection, and PostgreSQL for persistent storage.
* **Database**: Drizzle ORM (on the frontend for definitions/utilities) and Neon Serverless PostgreSQL (or local instance).
* **AI Assistant**: Local Ollama instance running the `llama3.1` model.

---

## Setup and Installation

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.9+)
- **PostgreSQL** (Neon Serverless or local instance)
- **Ollama** installed locally

### 2. Database Setup
1. Create a `.env` file in the root directory and add your database connection string:
```env
VITE_DATABASE_URL=postgres://user:password@hostname/dbname?sslmode=require
```
2. Run database migrations using Drizzle:
```bash
npm run migrate:push
```

### 3. Backend Setup
1. Navigate to the backend directory:
```bash
cd Backend
```
2. Create and activate a Python virtual environment:
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```
3. Install dependencies:
```bash
pip install fastapi uvicorn opencv-contrib-python psycopg2-binary python-dotenv pydantic
```
4. Start the FastAPI server:
```bash
uvicorn back:app --reload --host 0.0.0.0 --port 8000
```

### 4. Frontend Setup
1. Install Node modules:
```bash
npm install
```
2. Start the Vite development server:
```bash
npm run dev
```

### 5. AI Assistant Setup (Ollama)
Invenio OS uses a local instance of Ollama to power the AI Assistant.
1. Download and install [Ollama](https://ollama.com/).
2. Pull the required model (`llama3.1`) by running this command in your terminal:
```bash
ollama run llama3.1
```
3. Keep the Ollama service running. The application's AI view will automatically connect to your local Ollama instance (typically running on `http://localhost:11434`) to provide contextual answers about your warehouse data.

---

## Application Views

*(Note: To populate these placeholders, capture screenshots of each view in the running app and save them into the `docs/assets/` folder.)*

### Dashboard
Overview of warehouse metrics, live sync status, and quick statistics.
![Dashboard View](docs/assets/dashboard.png)

### Warehouse Map (Digital Twin)
A live spatial view showing the positions of shelves, products, and active workers. Supports live telemetry follow for specific tracking markers.
![Warehouse Map View](docs/assets/warehouse_map.png)

### Inventory
A comprehensive list of all products, their assigned zones, quantities, and statuses.
![Inventory View](docs/assets/inventory.png)

### AI Assistant
Chat interface connected to the local `llama3.1` model. Ask questions about stock levels, item locations, or warehouse optimization.
![AI Assistant View](docs/assets/ai_assistant.png)

### Camera Feeds
Live monitoring view showing raw and annotated camera feeds directly from the backend computer vision pipeline.
![Camera Feeds View](docs/assets/camera_feeds.png)

### Alerts
System notifications and anomaly detections, such as items misplaced or low stock alerts.
![Alerts View](docs/assets/alerts.png)

---

## Computer Vision Pipeline
The backend uses `OpenCV` and the `ArucoDetector` to continuously scan camera streams for `DICT_APRILTAG_36h10` markers. When a marker is detected, the backend correlates the ID to a product or shelf stored in PostgreSQL. It then calculates the relative spatial coordinates and streams both the live JPEG frames and the coordinate metadata to the frontend via WebSockets (`/ws` and `/camera/feed`).

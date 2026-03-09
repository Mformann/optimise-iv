# Project Requirements & Installation Guide

This document outlines the dependencies and steps required to install and run the Optimise IV CRM Prototype locally.

## Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher, usually comes with Node.js)
- **Git**

## Automated Installation (Recommended)

### For Windows:
We have provided an automated batch script. Simply double-click it or run it in your terminal:
```bash
> install.bat
```

### For macOS / Linux:
Run the start script (make sure it's executable first):
```bash
$ chmod +x install.sh
$ ./install.sh
```

---

## Manual Installation (Using `npm`)

This project uses a unified root `package.json` with a `postinstall` script to simultaneously install both the backend and frontend dependencies.

1. **Install all dependencies:**
   Navigate to the root directory `optimise-iv-crm-prototype-master` and run:
   ```bash
   npm install
   ```
   *(This will automatically trigger `npm install` inside both the `frontend` and `backend` directories).*

2. **Start the Application:**
   To run both the frontend and backend servers concurrently, use:
   ```bash
   npm run dev
   ```
   - The frontend will start at: `http://localhost:5173`
   - The backend will start at: `http://localhost:5000` (or as configured)

## Environment Variables
Ensure you have the required `.env` files set up in your `backend` and `frontend` directories before starting the application. 

* (e.g., `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` for the database).

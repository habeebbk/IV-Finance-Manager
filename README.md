# Class Trip Ledger — Private College Trip Finance Portal

A minimal, secure, and reliable college trip finance manager built with **Node.js + Express.js**, **MongoDB Atlas**, and modern vanilla web technologies (HTML, Tailwind CSS, FontAwesome).

---

## 🌟 Key Features

1. **Role-Based Server-Side Authorization**:
   - **Admin Portal**: Full financial management, student registry with Roll Numbers and passwords, live expense and income ledger, GPay vs. Cash reconciliation, OCR screenshot reader, POS thermal slips, and audit exports.
   - **Private Student Portal**: Role-restricted view where students log in with their **Roll Number** and **Password** to view only their personal payment records, verified blue seal, total contributed, and remaining budget balance.
2. **MongoDB Atlas Integration**: Central cloud database replacing browser local storage so records are accessible from any phone or computer.
3. **Password Security & Sessions**: Passwords hashed with `bcrypt`, server-side sessions stored in MongoDB, and HTTPS-ready cookies.
4. **Preserved Existing Features**: Line/Card views, POS Thermal receipt slips (58mm/80mm), WhatsApp summary generator, minimal & audit PDF generation, formatted CSV export, and 30-day recycle bin.
5. **1-Click LocalStorage Migration**: Easily import existing local storage data or JSON backup files into MongoDB Atlas without duplicate entries.

---

## 📁 Project Structure

```text
trip-ledger/
├── models/
│   ├── User.js          # Admin schema (username, bcrypt password)
│   ├── Student.js       # Student schema (rollNumber, name, bcrypt password)
│   ├── Transaction.js   # Income and Expense transactions schema
│   └── Setting.js       # Global settings (e.g. perHeadBudget)
├── routes/
│   ├── auth.js          # Login, logout, session check, password change
│   ├── admin.js         # Student & transaction CRUD, verification, migration
│   └── student.js       # Role-restricted student dashboard endpoint
├── middleware/
│   └── auth.js          # requireAuth, requireAdmin, requireStudent
├── public/
│   ├── login.html       # Dual-tab Student and Admin login interface
│   ├── index.html       # Full Admin Dashboard (MongoDB Atlas connected)
│   └── student.html     # Clean, mobile-friendly Student Portal
├── .env.example         # Template for environment variables
├── render.yaml          # Render Blueprint deployment specification
├── server.js            # Express server, MongoDB connection, security headers
└── package.json
```

---

## 🚀 Quick Start (Local Run)

1. **Install dependencies**:
   ```bash
   cd trip-ledger
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set your MongoDB connection string in `.env` (either local `mongodb://127.0.0.1:27017/trip_ledger` or your MongoDB Atlas URI).

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   - **URL**: `http://localhost:3000`
   - **Default Admin Username**: `admin`
   - **Default Admin Password**: `admin123`

---

## ☁️ Step-by-Step MongoDB Atlas Setup (Free)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up / log in.
2. Click **Create a Database** and select the **M0 Free** cluster.
3. Choose a cloud provider and region close to you (e.g., AWS Mumbai / Frankfurt / us-east-1).
4. **Database Access**:
   - Create a database user (e.g., `tripadmin` with a strong password). Save this password!
5. **Network Access**:
   - Go to **Network Access** in the left sidebar.
   - Click **Add IP Address** and choose **Allow Access From Anywhere** (`0.0.0.0/0`). This is required so Render can connect to your database.
6. **Get Connection String**:
   - Go to **Clusters** &rarr; click **Connect** &rarr; select **Drivers** (Node.js).
   - Copy the connection URI:
     ```text
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/trip_ledger?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your actual credentials.

---

## 🚢 Simple Deployment to Render (Free Tier)

### Option A: Using Git & Render Web Service

1. Create a GitHub repository and push this `trip-ledger` project folder to it.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** &rarr; **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name**: `class-trip-ledger` (or any name you choose)
   - **Language / Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Add the following **Environment Variables** under the **Environment** tab:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/trip_ledger?retryWrites=true&w=majority`
   - `SESSION_SECRET`: Any random 32-character string
   - `ADMIN_USERNAME`: Your preferred admin login (e.g., `admin`)
   - `ADMIN_PASSWORD`: Your secret admin password (e.g., `TripManager2026!`)
7. Click **Create Web Service**.
8. Render will build and deploy the app. Once finished, you will receive a secure HTTPS URL (e.g., `https://class-trip-ledger.onrender.com`).

---

## 👥 How to Use & Share with Students

### 1. Admin Login
- Open `https://your-app-url.onrender.com/login.html`
- Select the **Admin Portal** tab and log in with your admin credentials.

### 2. Adding Students & Passwords
- In the Admin Dashboard, click the **Students** button in the top navigation.
- Add students by entering their **Full Name** and **Roll Number** (e.g., `21CS01`).
- The system automatically creates a default password (e.g., `21cs01123`) or allows you to enter a custom password.
- The initial password is displayed in the student list so you can copy and share it with each student.

### 3. Student Access
- Send the site URL to your students: `https://your-app-url.onrender.com`
- Students enter their **Roll Number** and **Password** on the **Student Login** tab.
- They will be taken to their private portal showing:
  - Personal payment history (itemized)
  - Blue verified seal on verified transactions
  - Total paid vs. per-head budget target
  - Remaining balance due
  - Option to view receipts and download/print their official POS slip.

### 4. Migrating Old Data from LocalStorage
- If you previously used `v2_fixed.html` in your browser, open the Admin Dashboard on that same browser.
- A yellow banner will appear at the top: **"Found Local Storage Records — Migrate Now"**.
- Click **Migrate Now** (or go to **Export &rarr; Sync Local Storage to MongoDB**).
- All transactions, students, and budget settings will be uploaded directly into your MongoDB Atlas cluster!

# IV-Finance-Manager


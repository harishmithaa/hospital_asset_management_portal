# Hospital Asset Lifecycle Management Portal (HAMS)

HAMS is an enterprise-grade medical ERP module designed to manage hospital hardware assets throughout their lifecycle—from procurement, scheduling preventive calibration checks, tracking AMC/Warranty contracts, to decommission disposal.

## Technology Stack

- **Frontend**: React (Vite, JavaScript), Tailwind CSS, React Router DOM, Axios, Recharts, React Hook Form, Lucide React Icons.
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, bcryptjs, Multer, Morgan.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on port `27017`

### Database Seeding
To populate the database with 100 assets, 75 maintenance logs, 30 complaints, 15 vendors, and default users, navigate to the `backend` folder and run:
```bash
cd backend
npm run seed
```

### Launching the Backend Server
From the `backend` directory, run:
```bash
npm run start
```
The server will start on port `5000`.

### Launching the Frontend Portal
From the `frontend` directory, run:
```bash
npm install
npm run dev
```
The client app will launch on `http://localhost:5173`.

## Demo Accounts Credentials

The portal implements role-based dashboards. Click the corresponding credentials card on the login screen to autofill:

- **Admin**
  - Email: `admin@hospital.com`
  - Password: `Admin@123`
- **Biomedical Engineer**
  - Email: `engineer@hospital.com`
  - Password: `Engineer@123`
- **Department Staff**
  - Email: `staff@hospital.com`
  - Password: `Staff@123`
- **Vendor Rep**
  - Email: `vendor@hospital.com`
  - Password: `Vendor@123`

---

## 🚀 Cloud Deployment Guide

### 1. Database: MongoDB Atlas (Cloud)
1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free **M0 Shared Cluster**.
2. Under **Database Access**, create a user with read/write privileges (e.g. `hams_admin`).
3. Under **Network Access**, add IP address `0.0.0.0/0` (allow access from anywhere) so Render can connect.
4. Click **Connect** > **Drivers** and copy your connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/hams?retryWrites=true&w=majority
   ```
5. *(Optional)* Seed your cloud database by temporarily setting `MONGO_URI` in `backend/.env` and running:
   ```bash
   cd backend
   npm run seed
   ```

### 2. Backend: Render (Web Service)
1. Sign in to [Render](https://render.com) and click **New +** > **Web Service**.
2. Connect your GitHub repository: `https://github.com/harishmithaa/hospital_asset_management_portal`.
3. Configure the service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In the **Environment Variables** tab, add:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGO_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_SECRET`: `your_secure_secret_key`
5. Click **Create Web Service**. Once deployed, copy your Render URL (e.g. `https://hams-backend.onrender.com`).

### 3. Frontend: Vercel
1. Sign in to [Vercel](https://vercel.com) and click **Add New...** > **Project**.
2. Select your repository `hospital_asset_management_portal`.
3. In project settings:
   - **Root Directory**: Click edit and choose `frontend`.
   - **Framework Preset**: `Vite` (auto-detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://hams-backend.onrender.com/api` *(replace with your Render backend URL)*
5. Click **Deploy**. Vercel will build and deploy your app with automated SSL and SPA routing.


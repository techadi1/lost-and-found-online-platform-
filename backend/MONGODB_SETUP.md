# Backend Setup for MongoDB Atlas

Follow these steps to link your project to the MongoDB Cloud Server:

## 1. Get your MongoDB Atlas Connection String
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Log in and create a new project/cluster if you haven't already.
3.  Click on **"Connect"** in your Cluster.
4.  Choose **"Drivers"** (Node.js).
5.  Copy the connection string (it looks like `mongodb+srv://<username>:<password>@cluster0...`).

## 2. Update your `.env` File
In the root of your project, you'll find a `.env` file. Paste your connection string there:
```env
MONGODB_URI=mongodb+srv://lostfound_user:VgvvrowgQj4nnCdQ@cluster1.ik9itnx.mongodb.net/lostfound?authSource=admin&retryWrites=true&w=majority
PORT=5001
```
*Note: Replace `<username>`, `<password>`, and `your_username` / `your_password` with your actual Atlas credentials.*

## 3. Run the Backend Server
Open your terminal and run:
```bash
npm run server
```
If everything is correct, you'll see:
`✅ Connected to MongoDB Atlas`
`🚀 Server is running on http://localhost:5000`

## 4. Using the API in Frontend
You can now use `axios` or `fetch` in your React frontend to communicate with `http://localhost:5000/api/items`.

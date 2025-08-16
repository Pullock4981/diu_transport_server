require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // to parse JSON bodies

// MongoDB connection
const username = encodeURIComponent(process.env.DB_USER);
const password = encodeURIComponent(process.env.DB_PASS);
const uri = `mongodb+srv://${username}:${password}@cluster0.mhbkfqu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    tls: true,
});

let transportRequestsCollection;
let usersCollection;

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();
        const db = client.db("diu_smart_transport");
        transportRequestsCollection = db.collection("transport_requests");
        usersCollection = db.collection("users");
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
    }
}
connectDB();

/* ------------------ TRANSPORT REQUESTS ------------------ */

// Create transport request
app.post("/transport_requests", async (req, res) => {
    try {
        const { studentId, name, reason, date, time, destination } = req.body;
        if (!studentId || !name || !reason || !date || !time || !destination) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const requestData = { studentId, name, reason, date, time, destination, status: "Pending" };
        const result = await transportRequestsCollection.insertOne(requestData);
        res.status(201).json({ success: true, id: result.insertedId });
    } catch (err) {
        console.error("Error inserting request:", err);
        res.status(500).json({ success: false, message: "Failed to insert request" });
    }
});

// Get all transport requests
app.get("/transport_requests", async (req, res) => {
    try {
        const requests = await transportRequestsCollection.find().toArray();
        res.status(200).json(requests);
    } catch (err) {
        console.error("Error fetching requests:", err);
        res.status(500).json({ success: false, message: "Failed to fetch requests" });
    }
});

// Update transport request
app.put("/transport_requests/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid request ID" });

        const updateFields = req.body;
        const result = await transportRequestsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "Request not found" });

        res.json({ success: true, message: "Transport request updated successfully" });
    } catch (err) {
        console.error("Error updating request:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Delete transport request
app.delete("/transport_requests/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID format" });

        const result = await transportRequestsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ success: false, message: "Request not found" });

        res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        console.error("Error deleting request:", err);
        res.status(500).json({ success: false, message: "Failed to delete request" });
    }
});

/* ------------------ USERS & ROLES ------------------ */

// Save or update user (fixed: do not overwrite admin role)
app.post("/users", async (req, res) => {
    try {
        const { name, email, photoURL, role } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required" });

        const updateData = { name, email, photoURL, lastLogin: new Date() };

        // Only set role if provided (prevents overwriting admin)
        if (role) updateData.role = role;

        const result = await usersCollection.updateOne(
            { email },
            { $set: updateData },
            { upsert: true }
        );

        res.status(200).json({ success: true, message: "User saved successfully", result });
    } catch (err) {
        console.error("❌ Error saving user:", err);
        res.status(500).json({ success: false, message: "Failed to save user" });
    }
});

// Get all users (admin only)
app.get("/users", async (req, res) => {
    try {
        const users = await usersCollection.find().toArray();
        res.status(200).json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
});

// Get single user by email
app.get("/users/:email", async (req, res) => {
    try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.status(200).json({ success: true, user });
    } catch (err) {
        console.error("❌ Error fetching user:", err);
        res.status(500).json({ success: false, message: "Failed to fetch user" });
    }
});

// Promote a user to admin
app.put("/users/admin/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid user ID" });

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { role: "admin" } }
        );

        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, message: "User promoted to admin successfully" });
    } catch (err) {
        console.error("❌ Error promoting user:", err);
        res.status(500).json({ success: false, message: "Failed to promote user" });
    }
});

/* ------------------ SERVER ------------------ */
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

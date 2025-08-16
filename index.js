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
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    tls: true
});

let transportRequestsCollection;

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();
        const db = client.db("diu_smart_transport");
        transportRequestsCollection = db.collection("transport_requests");
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
    }
}
connectDB();

app.post("/transport_requests", async (req, res) => {
    try {
        const { studentId, name, reason, date, time, destination, userEmail } = req.body;

        // Validate required fields
        if (!studentId || !name || !reason || !date || !time || !destination) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const requestData = {
            studentId,
            name,
            reason,
            date,
            time,
            destination,
            status: "Pending" // default status
        };

        const result = await transportRequestsCollection.insertOne(requestData);
        res.status(201).json({ success: true, id: result.insertedId });
    } catch (err) {
        console.error("Error inserting request:", err);
        res.status(500).json({ success: false, message: "Failed to insert request" });
    }
});

// GET all bus requests
app.get("/transport_requests", async (req, res) => {
    try {
        const requests = await transportRequestsCollection.find().toArray();
        res.status(200).json(requests);
    } catch (err) {
        console.error("Error fetching requests:", err);
        res.status(500).json({ success: false, message: "Failed to fetch requests" });
    }
});



// POST: create a bus request
// app.post("/transport_requests", async (req, res) => {
//     try {
//         const requestData = req.body;

//         // Optional: validate required fields
//         if (!requestData.busName || !requestData.route || !requestData.date || !requestData.userEmail) {
//             return res.status(400).json({ success: false, message: "Missing required fields" });
//         }

//         requestData.status = "Pending"; // default status
//         const result = await transportRequestsCollection.insertOne(requestData);
//         res.status(201).json({ success: true, id: result.insertedId });
//     } catch (err) {
//         console.error("Error inserting request:", err);
//         res.status(500).json({ success: false, message: "Failed to insert request" });
//     }
// });

// DELETE request
app.delete("/transport_requests/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        const result = await transportRequestsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        console.error("Error deleting request:", err);
        res.status(500).json({ success: false, message: "Failed to delete request" });
    }
});

// update a transport request
app.put("/transport_requests/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            studentId,
            name,
            reason,
            date,
            time,
            destination,
            status,
        } = req.body;

        // Ensure valid ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid request ID" });
        }

        const updateFields = {};
        if (studentId) updateFields.studentId = studentId;
        if (name) updateFields.name = name;
        if (reason) updateFields.reason = reason;
        if (date) updateFields.date = date;
        if (time) updateFields.time = time;
        if (destination) updateFields.destination = destination;
        if (status) updateFields.status = status;

        const result = await transportRequestsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        res.json({ success: true, message: "Transport request updated successfully" });
    } catch (err) {
        console.error("Error updating transport request:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});



app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

import "dotenv/config";
import express from "express";
import { connectDB } from "./db.js";
import spotsRouter from "./routes/spots.js";
import ratingsRouter from "./routes/ratings.js";
import checkinsRouter from "./routes/checkins.js";

// Create the app with express and save it in a variable
const app = express();

// Set the port and have 3000 as a backup
const PORT = process.env.PORT || 3000;

// Let routes read JSON from frontend
app.use(express.json());

// Serve files from the public folder so the HTML loads
app.use(express.static("public"));

// Use the backend routes
app.use("/api/spots", spotsRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/checkins", checkinsRouter);
// Connect DB
async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, () =>{
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

// Call startServer
startServer();
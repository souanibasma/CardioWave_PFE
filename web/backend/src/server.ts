import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { seedApprovedLicenses } from "./utils/seedLicenses";
import { initSocket } from "./utils/socket";

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    await seedApprovedLicenses();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT as number, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Accessible locally via http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

startServer();
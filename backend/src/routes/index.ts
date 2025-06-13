import userRoutes from "./users";
import authRoutes from "./auth";
import fileRoutes from "./file";
import folderRoutes from "./folders";

import { Application } from "express";
import { verifyToken } from "../middleware/auth";

const router = (app: Application) => {
  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/files", verifyToken, fileRoutes); // Ensure file routes are protected by the verifyToken middleware
  app.use("/folders", verifyToken, folderRoutes); // Use folderRoutes for folder-related endpoints
};

export default router;

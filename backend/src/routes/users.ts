import express, { Request, Response } from "express";
import { verifyToken } from "../middleware/auth";
import userController from "../controllers/users";

const router = express.Router();

router.get("/me", verifyToken, userController.me);

router.get("/me", verifyToken, userController.me);

router.put("/change-password", verifyToken, userController.changePassword);

router.put("/update-profile", verifyToken, userController.update);

router.post("/find", verifyToken, userController.findUserByEmail);

router.get("/find/:userId", verifyToken, userController.findUserById);

export default router;

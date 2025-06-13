import express, { Request, Response } from "express";
import { verifyToken } from "../middleware/auth";
import userController from "../controllers/users";

const router = express.Router();

router.get("/me", verifyToken, userController.me);

/**
 * @route POST /api/users/register
 * @desc Register a new user and return a JWT token
 * @access Public
 * @param {Request} req - The request object containing user data
 * @param {Response} res - The response object to send data back
 */

router.get("/me", verifyToken, userController.me);

router.put("/change-password", verifyToken, userController.changePassword);

router.put("/update-profile", verifyToken, userController.update);

router.post("/find", verifyToken, userController.findUserByEmail);
router.get("/find/:userId", verifyToken, userController.findUserById);

export default router;

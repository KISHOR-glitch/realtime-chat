import express from "express";
import { sendMessage, getMessages, getUsersForSidebar } from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/users", protectRoute, getUsersForSidebar);//protection always send the user to next function remember
router.get("/:id", protectRoute, getMessages)
router.post("/send/:id", protectRoute, sendMessage)
export default router;
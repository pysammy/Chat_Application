import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSideBar, getmessages, sendMessage } from "../controllers/message.controller.js";
import { validateObjectIdParam, validateSendMessage } from "../middleware/validation.middleware.js";

const router = express.Router()


router.get("/users", protectRoute, getUsersForSideBar);
router.get("/:id", protectRoute, validateObjectIdParam("id"), getmessages);

router.post("/send/:id", protectRoute, validateObjectIdParam("id"), validateSendMessage, sendMessage);

export default router;

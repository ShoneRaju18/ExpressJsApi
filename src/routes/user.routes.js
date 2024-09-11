import {Router} from "express";
import { getUsers, registerUser } from "../controllers/user.controller.js";

const router = Router()

router.route("/register").post(registerUser)
router.route("/getUsers").get(getUsers)

export default router
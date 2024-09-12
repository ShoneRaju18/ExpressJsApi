import {Router} from "express";
import { getUsers, loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/refresh-token").get(refreshAccessToken)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/getUsers").get(verifyJWT, getUsers)


export default router
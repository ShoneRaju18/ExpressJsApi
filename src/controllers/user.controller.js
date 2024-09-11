import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js"
import { prisma }  from "../prisma/prismaClient.js"


const registerUser = asyncHandler( async (req, res) => {

    
    const {fullName, email, username, password } = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: username },
            { email: email }
          ]
        }
      });

      if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const User = await prisma.user.create({
        data: {
          fullName: fullName,
          email: email,
          username: username,
          password: password

        }})

    const createdUser = await prisma.user.findUnique({
        where: { id: User.id }, // assuming `id` is the primary key
        select: {
            username: true,
            email: true,
            fullName: true,
            createdAt: true,
            updatedAt: true
            // Do not select password or refreshToken
        }
    })
    
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }
    
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )      
})

const getUsers = asyncHandler( async(req,res) => {
    const users = await prisma.user.findMany({
    })

    return res.status(200).json(
        new ApiResponse(200, users, "Users retreived successfully")
    )
})

export {registerUser, getUsers}
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import { prisma }  from "../prisma/prismaClient.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


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

const loginUser = asyncHandler( async(req,res) => {

        const {email, username, password } = req.body

        if(!(email || username))
            throw new ApiError(400, "Email or username is required");        

        const user = await prisma.User.findFirst({
            where: {
                OR: [
                  { username: username },
                  { email: email }
                ]
              }
            });           

        if (!user) {
            throw new ApiError(404, "User does not exist")
        }    

        const isPasswordValid = await checkPassword(user.id, password);

        if(!isPasswordValid)
            throw new ApiError(400, "Invalid user credentials")

        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user.id);

        const options = {
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,
          secure: true
        }

        return res.status(200).cookie("accessToken", accessToken, options)
                              .cookie("refreshToken", refreshToken, options)
                              .json(
                                new ApiResponse(200, {accessToken, refreshToken},
                                  "User logged in successfully")
                                );
})

const logoutUser = asyncHandler(async(req, res) => {
  const userId = req.user?.id; // Assuming `req.user` is populated by your authentication middleware

  // Update the user and set refreshToken to null
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken: null, // Sets the refreshToken field to null
    },
  });

  // Define cookie options
  const options = {
    httpOnly: true,
    secure: true, // Ensure this is set to true in production
  };

  // Clear the cookies and send the response
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
})

const refreshAccessToken = asyncHandler( async(req, res) => {
  
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if(!incomingRefreshToken){
    throw new ApiError(401, "Missing refresh token");
  }

  const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

  const user = await prisma.user.findUnique({
    where: { id: decodedToken._id },
    select: {
      id: true,
      refreshToken: true
    }
  });

  if(!user)
    throw new ApiError(401, "Invalid refresh token")

  if(incomingRefreshToken != user?.refreshToken)
    throw new ApiError(401, "Refresh token is expired or used");

  const options = {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: true
  }

  const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user.id);

  return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
              new ApiResponse(
                200, {accessToken, refreshToken: newRefreshToken}, "Access token refreshed"
              )
            )
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  
  const {oldPassword, newPassword} = req.body;

  const isPasswordValid = await checkPassword(req.user.id, oldPassword);

  if(!isPasswordValid)
    throw new ApiError(400, "Invalid Current Password")

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      password: newPassword, // Sets the refreshToken field to null
    },
  })

  return res.status(200)
            .json(new ApiResponse(200, {}, "Password Changed Sucessfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res.status(200).json(200, req.user, "current user fetched successfully")
})

//Helper Methods
async function generateAccessToken(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true
      }
    });
  
    if (!user) {
      throw new Error('User not found');
    }
  
    return jwt.sign(
      {
        _id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
      }
    );
  }

async function generateRefreshToken(userId){
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return jwt.sign(
        {
            _id: user.id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
    
}

async function checkPassword(id, password){
    const user = await prisma.user.findUnique({
        where: { id: id },
        select: {
          password: true
        }
      });

    return await bcrypt.compare(password, user.password);
}

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
          });

        const accessToken = await generateAccessToken(userId);
        const refreshToken = await generateRefreshToken(userId);

        user.refreshToken = refreshToken;
        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken }
          });        

        return { accessToken, refreshToken };        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

export {registerUser, getUsers, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser}
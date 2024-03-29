import UserModel from "../models/userM.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authMiddleware from "../middlewares/authMiddleWare.js";
// import { store as sessionStore } from "../server.js"

// Handles the login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email: email });

    if (!user) {
      const error = new Error(`User with ${email} not found`);
      error.status(400);
      throw error;
    } else {
      const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

      if (passwordMatch) {
        const payload = {
          uuid: user.uuid,
          email: user.email,
          name: user.name,
          group: user.group

        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "3h" });
        res.cookie('token', token, { httpOnly: true, maxAge: 3 * 60 * 60 * 1000 });
        return res.status(200).json({
          data: payload,

        });
      } else {
        const error = new Error("Wrong Password!");
        error.status(400);
        throw error;
      }
    }
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      status: 'fail',
      message: error.message || 'Internal Server Error'
    });
  }
};


export const logout = async (req, res) => {
  try {

    res.clearCookie('token');
    res.status(200).json({ message: "Logged out successfully!" });
  }
  catch (error) {
    res.status(500).json(error);
  }
}

// Gets the Author Info
export const getAuthorInfo = async (req, res) => {
  try {
    // 
    authMiddleware(req, res, async () => {
      // 
      const userUUID = await req.session.user.uuid;


      const userData = await UserModel.findOne({ uuid: userUUID });

      const { email, name, _id, group } = userData._doc


      res.status(200).json({ message: "Session", email, name, _id, group });
    });
  } catch (error) {
    // Handle errors by sending a 500 Internal Server Error response
    res.status(500).json(error);
  }
};

// Updates the Author Info
export const updateAuthorInfo = async (req, res) => {
  try {
    // The authMiddleware checks if the user is authenticated
    // If not authenticated, it will return a 401 Unauthorized response
    authMiddleware(req, res, async () => {
      const newData = req.body;

      const updatedUser = await UserModel.findOneAndUpdate({ email: req.session.user.email }, newData, { new: true });

      !updatedUser && res.status(404).json({ message: "User does not exist" });

      res.status(200).json(updatedUser);
    });
  } catch (err) {
    res.status(400).json({ message: err });
  }
}

export const register = async (req, res) => {
  try {
    // Check if the user with the provided email already exists
    const userExist = await UserModel.findOne({ email: req.body.email });

    if (userExist) {
      return res.status(400).json({ message: "A user with that email already exists" });
    }

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create a new user instance
    const newUser = new UserModel({
      email: req.body.email,
      hashedPassword: hashedPassword,
      name: req.body.name,
      bio: req.body.bio
    });

    // Save the new user to the database
    const savedUser = await newUser.save();

    // Prepare the data to return in the response
    const returnData = {
      uuid: savedUser.uuid,
      name: savedUser.name,
      email: savedUser.email
    };

    // Send a success response
    res.status(200).json({ message: "Signed Up Successfully!", returnData });
  } catch (err) {
    // Handle errors
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const parseAuthorInfo = async (req, res) => {
  try {

    const user = await UserModel.findOne({ uuid: req.body.uuid })

    const { name, uuid, email, group, active, profilePic, bio, createdAt, updatedAt } = user

    res.status(200).json({ message: "User Info Parsed", data: { name, uuid, email, group, active, profilePic, bio, updatedAt, createdAt } })

  } catch (err) {
    res.status(500).json({ message: err });
    throw (err);
  }
}

export const deleteAuthor = async (req, res) => {
  try {
    if (req.session.user.group !== 'Admin') {
      return res.status(403).json({ message: 'You do not have the access required for that' });
    }

    const authorId = req.params.authorId; // Assuming you use "authorId" as the route parameter

    // Check if the author exists
    const existingAuthor = await UserModel.findById(authorId);
    if (!existingAuthor) {
      return res.status(404).json({ message: 'Author not found' });
    }

    // Perform the deletion
    await UserModel.findByIdAndDelete(authorId);

    res.status(200).json({ message: 'Author deleted successfully' });
  } catch (error) {
    console.error('Error deleting author:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getAllAuthors = async (req, res) => {
  try {
    authMiddleware(req, res, async () => {
      const authors = await UserModel.find({});
      console.log(authors)



      res.status(200).json({ message: "Authors Fetched", authors });
    });
  } catch (err) {
    res.status(400).json({ message: err });
  }
}
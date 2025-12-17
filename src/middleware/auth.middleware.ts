import {verify} from "jsonwebtoken";

  export const extractCustomerIdFromCookie = async(req, res, next) => {
  try {
    // console.log("request:",req);
    console.log("cookies",req.cookies)
    const {token} = req.cookies 
    console.log("token is",token)
    // const authorizationHeader = req.headers['authorization'];
    // const token = authorizationHeader.split(" ")[1];
    // console.log(process.env.JWT_SECRET)
    // console.log("bkl")
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const userDetails = await verify(token, process.env.JWT_SECRET); 
    req.user = userDetails

    next();
  } catch (error) {
    console.log("Adilllllll",error)
    return res.status(401).json({ message: 'Invalid token' });
  }
};



import  jwt  from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import { User } from "../models/user.js";


const isAuthenticated =  TryCatch((req,res,next)=>{

    const token = req.cookies['chat-token'];

    if(!token) return next(new ErrorHandler("Please login to access this route",401));

    const decodedData = jwt.verify(token,process.env.JWT_SECRET);

    req.user = decodedData._id;

    next();
})

const adminOnly =  (req,res,next)=>{

    const token = req.cookies['chat-adminToken'];

    if(!token) return next(new ErrorHandler("Only admin can access this route",401));

    const adminId = jwt.verify(token,process.env.JWT_SECRET);

    const isMatched = process.env.ADMIN_PASSWORD === adminId;

    if(!isMatched) return next(new ErrorHandler("Only admin can access this route",401));

    next();
}

const socketAuthenticator = async(err,socket,next)=>{

    try {
        if(err){
            return next(err);
        }
        const authToken = socket.request.cookies['chat-token'];

        if(!authToken) next(new ErrorHandler("Please login to access this route",401));

        const decodedData = jwt.verify(authToken,process.env.JWT_SECRET);

        const user = await User.findById(decodedData._id);
        socket.user=user;

        next();        
    } catch (error) {
        return next(new ErrorHandler("Please login to access this route",401));
    }

}

export {isAuthenticated,adminOnly,socketAuthenticator}
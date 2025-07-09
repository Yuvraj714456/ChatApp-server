import mongoose from "mongoose"
import jwt from 'jsonwebtoken'
import {v4 as uuid} from 'uuid'
import {v2 as cloudinary} from 'cloudinary'
import { getBase64, getSockets } from "../lib/helper.js"

const cookie_option= {
        maxAge:15*24*60*60*1000,
        sameSite:"none",
        httpOnly:true,
        secure:true
    } 
 
const connectDB = (url)=>{
    mongoose.connect(url,{dbName:"ChatApp"}).then((data)=>{console.log(`Connected to DB: ${data.connection.host}`)})
    .catch((err)=>{throw err});
}

const sendToken = (res,user,code,message)=>{

    const token = jwt.sign({_id:user._id},process.env.JWT_SECRET);

    return res.status(code).cookie("chat-token",token,cookie_option).json({
        success:true,
        user,
        message,
    });

}

const emitEvent = (req,event,users,data)=>{
    let io = req.app.get("io");

    const userSocket = getSockets(users);
    io.to(userSocket).emit(event,data);
    
}

const uploadFilesToCloudinary = async (files=[])=>{

    const uploadPromises = files.map((file)=>{
        return new Promise((resolve,reject)=>{
            cloudinary.uploader.upload(
                getBase64(file),
                {
                    resource_type:"auto",
                    public_id:uuid()
                },
                (error,result)=>{
                    if(error){ 
                        console.log("❌ Cloudinary Upload Error:", error)
                        return reject(error)
                    };
                    resolve(result)
                })
        })
    })

    try {
        const results = await Promise.all(uploadPromises);

        const formattedResult = results.map((result)=>({
            publicId:result.public_id,
            url:result.secure_url
        }));

        return formattedResult;
    } catch (error) {
        throw new Error("Error uploading files to cloudinary",error);
    }
}

const deleteFileFromCloudinary = async (public_id)=>{
    // delete files from cloudinary
}


export {connectDB,sendToken,cookie_option,emitEvent,deleteFileFromCloudinary,uploadFilesToCloudinary};
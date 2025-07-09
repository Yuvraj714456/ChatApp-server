import { TryCatch } from "../middlewares/error.js";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { ErrorHandler } from "../utils/utility.js";
import  jwt  from "jsonwebtoken";
import { cookie_option } from "../utils/features.js";
import { adminOnly } from "../middlewares/auth.js";

const adminLogin = TryCatch(async (req,res,next)=>{
    const {username,password} = req.body;

    const isMatched = username===process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;

    if(!isMatched) return next(new ErrorHandler("Username or Password is wrong",401));

    const token = jwt.sign(password,process.env.JWT_SECRET);

    return res.status(200).cookie("chat-adminToken",token,{...cookie_option,
        maxAge:1000*60*15,
    }).json({
        success:true,
        message:"Autheticated successfully"
    })
})

// Only Admin can access

const getAdminData = TryCatch(async (req,res,next)=>{
    return res.status(200).json({
        success:true,
        admin:true
    })
})

const adminLogOut = TryCatch(async (req,res,next)=>{
    
    return res.status(200).cookie("chat-adminToken","",{...cookie_option,
        maxAge:0,
    }).json({
        success:true,
        message:"Log Out successfully"
    })
})


const allUsers = TryCatch(async (req,res)=>{
    
    const users = await User.find();

    const transformedUsers =  await Promise.all(users.map(async({name,username,avatar,_id})=>{
        const [groups,friends] = await Promise.all([
            Chat.countDocuments({isGroup:true,members:_id}),
            Chat.countDocuments({isGroup:false,members:_id})
        ]);

        return {
            name,
            username,
            avatar:avatar.url,
            _id,
            groups,
            friends
        };
    }));

    return res.status(200).json({
        success:true,
        message:"Data fetched successfully",
        data:transformedUsers
    })
})

const getDashboardStats = TryCatch(async (req,res)=>{
    const [groupsCount,usersCount,messagesCount,totalChatsCount] =await  Promise.all([
        Chat.countDocuments({isGroup:true}),
        User.countDocuments({}),
        Message.countDocuments({}),
        Chat.countDocuments({}),
    ]);

    const today = new Date();

    const last7Days = new Date();

    last7Days.setDate(last7Days.getDate()-7);

    const last7DaysMessages = await Message.find({
        createdAt:{
            $gte:last7Days,
            $lte:today,
        },
    }).select("createdAt");

    const messages = new Array(7).fill(0);
    const dayInMilliSeconds= 1000*60*60*24;

    last7DaysMessages.forEach((message)=>{
        const indexApprox=(today.getTime() - message.createdAt.getTime())/dayInMilliSeconds;

        const index = Math.floor(indexApprox);

        messages[6-index]++;
    })

    const stats ={
        groupsCount,
        usersCount,
        messagesCount,
        totalChatsCount,
        messagesChart:messages
    };

    return res.status(200).json({
        success:true,
        stats:stats
    })
})

export {allUsers,getDashboardStats,adminLogin,adminLogOut,getAdminData}
import { TryCatch } from '../middlewares/error.js';
import {User} from '../models/user.js'
import {Chat} from '../models/chat.js'
import {Request} from '../models/request.js'
import { cookie_option, emitEvent, sendToken} from '../utils/features.js';
import {compare} from 'bcrypt'
import { ErrorHandler } from '../utils/utility.js';
import { NEW_REQUEST, REFETCH_CHATS } from '../constants/events.js';
import { getOtherMembers } from '../lib/helper.js';
import {processAvatarInBackground} from '../lib/avatarMaker.js'

// create a newUser and save it to the database and return a response and save cookie
const newUser = async  (req,res,next)=>{

    const  {name,username,password,confirmPassword} = req.body;

    const file = req.file;


    if(password.length<8) return next(new ErrorHandler("Password length is less than 8",400));

    if(password!==confirmPassword) return next(new ErrorHandler("password and confirm Password are not equal",400))


    const user= await User.create({
            name:name,
            username:username,
            password:password,
            avatar:{
                publicId:"default",
                url:"/default-avatar.png"
            }
    });
    sendToken(res,user,201,"User created");  

    processAvatarInBackground(user._id,file,name);
}

const login =  TryCatch(async (req,res,next)=>{
    const {username,password} = req.body;

    const user = await User.findOne({username}).select("+password");

    if(!user) return next(new ErrorHandler("Invalid Credentials",404))
        
    const isMatch = await compare(password,user.password);

    if(!isMatch) return next(new ErrorHandler("Invalid Credentials",404))

    sendToken(res,user,200,`Welcome back, ${user.name} Logged in`);

});


const getMyProfile = TryCatch(async (req,res,next)=>{

    const user=  await User.findById(req.user);

    if(!user) return next(new ErrorHandler("user is not defined",404));

    res.status(200).json({
        success:true,
        user:user,
    })
    
})

const logout = (req,res)=>{
    return res.status(200).cookie('chat-token',"",{...cookie_option,maxAge:0}).json({
        success:true,
        message:"Logged out succesfully"
    })
}

// find new users
const searchNewUsers = TryCatch(async (req,res)=>{
    const {name} = req.query;

    // find all chats with me except groupChats
    const myChats = await Chat.find({isGroup:false,members:req.user});

    // find all users from my chats
    const allUsersFromMyChats = myChats.flatMap((chat)=>chat.members);

    // find all users except from me
    const allUserExceptMeAndFriends = await User.find({
        _id:{$nin: allUsersFromMyChats},
        name:{$regex: name,$options:"i"}
    })

    // Modifying users
    const users=allUserExceptMeAndFriends.map(({_id,name,avatar})=>({
        _id,name,
        avatar:avatar.url,
    }));

    return res.status(200).
    json({
        success:true,
        users
    })

})

const sendFriendRequest = TryCatch(async (req,res,next)=>{
    const {userId} = req.body;

    const user=await User.findById(userId);
    if(!user)
        return next(new ErrorHandler("User is not found",404));

    const request = await Request.findOne({
        $or:[
            {sender:userId,receiver:req.user},
            {sender:req.user,receiver:userId}
        ]
    });

    if(request) return next(new ErrorHandler("Request already sent",400));

    await Request.create({
        sender:req.user,
        receiver:userId
    });

    emitEvent(req,NEW_REQUEST,[userId]);

    res.status(200).json({
        success:true,
        message:"Friend Request Sent"
    })
})

const handleFriendRequest=TryCatch(async (req,res,next)=>{
    const {requestId,handle} = req.body;

    const request = await Request.findById(requestId).
                    populate("sender","name").
                    populate("receiver","name");


    if(!request) return next(new ErrorHandler("Request not found",404));
    
    if(request.receiver._id.toString()!== req.user.toString())
        return next(new ErrorHandler("Unauthorized",401));

    if(!handle){
        await request.deleteOne();
        return res.status(200).json({
            succes:true,
            message:"Friend request rejected"
        })
    }

    const members = [request.sender._id,request.receiver._id];

    await Promise.all([
        Chat.create({
            members,
            name:`${request.sender.name}`
        }),
        request.deleteOne(),
    ])

    emitEvent(req,REFETCH_CHATS,members)

    return res.status(200).json({
        success:true,
        message:"Friend request accepted",
        senderId: request.sender._id
    })
})

const getMyNotification =TryCatch(async (req,res,next)=>{
    const requests= await Request.find({receiver:req.user}).
    populate("sender","name avatar");


    const allRequest = requests.map(({_id,sender})=>({
        _id,
        sender:{
            _id:sender._id,
            name:sender.name,
            avatar:sender.avatar.url,
        }
    }));

    return res.status(200).json({
        success:true,
        allRequest,
    })

});

const getMyfriends = TryCatch(async (req,res)=>{
    const chatId = req.query.chatId;

    const chats= await Chat.find({
        members:req.user,
        isGroup:false,
    }).populate("members","name avatar");

    const friends = chats.map((chat)=>{
        const otherUser = getOtherMembers(chat.members,req.user)
        return {
            _id:otherUser._id,
            name:otherUser.name,
            avatar:otherUser.avatar.url
        }
    });

    if(chatId){
        const chat = await Chat.findById(chatId);
        const availableFriends = friends.filter(friend=>!chat.members.some(memberId => memberId.equals(friend._id)));

        return res.status(200).json({
            succes:true,
            friends:availableFriends,
        });
    }else{
        return res.status(200).json({
            success:true,
            friends
        })
    }
})




export {login,
        newUser,
        getMyProfile,
        logout,
        searchNewUsers,
        sendFriendRequest,
        handleFriendRequest,
        getMyNotification,
        getMyfriends}


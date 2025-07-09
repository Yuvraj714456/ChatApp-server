import { TryCatch } from "../middlewares/error.js"
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { User } from "../models/user.js";
import {Message} from '../models/message.js'
import { deleteFileFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMembers } from "../lib/helper.js";



const  newGroupChat = TryCatch(async (req,res,next)=>{

    const {name,members} = req.body;

    const allMembers = [...members,req.user];

    
        await Chat.create({
            name,
            isGroup:true,
            creator:req.user,
            members:allMembers
            
        })
        emitEvent(req,ALERT,allMembers,`Welcome to ${name} group`);
        emitEvent(req,REFETCH_CHATS,members)
    

    return res.status(201).json({
        success:true,
        message:"Group created"
    });
});


const  getMyChat = TryCatch(async (req,res,next)=>{

    const chats = await Chat.find({members:req.user}).populate(
        "members",
        "name avatar"
    );

    const transformedChats = chats.map(({_id,name,isGroup,members})=>{

        const otherMember = getOtherMembers(members,req.user);

        return {
            _id,
            isGroup,
            avatar:isGroup?members.slice(0,3).map(({avatar})=>avatar.url):[otherMember.avatar.url],
            name:isGroup? name: otherMember.name,
            members:members.reduce((prev,curr)=>{
                if(curr._id.toString() !== req.user.toString()){
                    prev.push(curr._id)
                }
                return prev
            },[]),
        }
    })

    return res.status(201).json({
        success:true,
        message:transformedChats
    });
});


const addMembers = TryCatch(async (req,res,next)=>{
    const {chatId,members}=req.body;
    const chat =await Chat.findById(chatId);

    if(!members || members.length<1) return next(new ErrorHandler("Please Provide members",400));

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    if(!chat.isGroup) return next(new ErrorHandler("This is not a group chat",400));

    if(chat.creator.toString() !== req.user.toString()) return next(new ErrorHandler("You are not allowed to add members",403));

    const allNewMembersPromise = members.map(i=>User.findById(i,"name"));

    const allNewMembers = await Promise.all(allNewMembersPromise);

    const existingMembersIds = chat.members.map(id=>id.toString());

    const duplicatesMembers = allNewMembers.filter(user=>existingMembersIds.includes(user.id.toString()));

    if(duplicatesMembers.length>0){
        const dupliactesNames = duplicatesMembers.map((i)=>i.name).join(",");
        return next(new ErrorHandler(`Duplicate Members: ${dupliactesNames}`,400))
    }

    chat.members.push(...allNewMembers.map((i)=>i._id));

    if(chat.members.length > 100)
            return next(new ErrorHandler("Group members limit reached",400)) 

    await chat.save();

    const allUserName = allNewMembers.map((i)=>i.name).join(",");

    emitEvent(req,ALERT,chat.members,`${allUserName} has been added to ${chat.name} group`)

    emitEvent(req,REFETCH_CHATS,chat.members);

    return res.status(201).json({
        success:true,
        message:"Members added successfully"
    })
})

const removeMembers = TryCatch(async (req,res,next)=>{
    const {chatId,userId} = req.body;

    if(!userId) return next(new ErrorHandler("please provide Member to be removed",404))

    const [chat,userThatWillBeRemoved] = await Promise.all([
        Chat.findById(chatId),
        User.findById(userId,"name")
    ])

    if(!chat) return next(new ErrorHandler("Chat not Found",404));


    if(!chat.isGroup) return next(new ErrorHandler("This is not a group chat",400));

    if(chat.creator.toString() !== req.user.toString())
        return next(new ErrorHandler("You are not allwoed to remove the member",404));

    if(chat.members.length <= 3) 
        return next(new ErrorHandler("Group must have at least three members",400));
    

    const allChatMembers = chat.members.map((i)=>i.toString());

    chat.members = chat.members.filter(member => member.toString() !== userId.toString());


    await chat.save();

    emitEvent(req,ALERT,chat.members,{message:`${userThatWillBeRemoved.name} has been removed from the group`,chatId});

    emitEvent(req,REFETCH_CHATS,allChatMembers);

    return res.status(201).json({
        success:true,
        message:"Member removed successfully"
    })

})


const leaveGroup = TryCatch(async (req,res,next)=>{
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not Found",404));

    if(!chat.isGroup) return next(new ErrorHandler("This is not a group chat",400));

    const userId =req.user._id?.toString() || req.user.toString();

    const remainingMembers = chat.members.filter(member => member.toString() !== userId);

    if(remainingMembers.length<3)
        return next(new ErrorHandler("Group must have at least three members",400))

    if(chat.creator.toString() === userId){
         const newCreator = remainingMembers[0]; 
         chat.creator= newCreator;
    }

    chat.members = remainingMembers;
     chat.markModified("members");

    await chat.save();

    const user = await User.findById(req.user, "name");
    const userName = user ? user.name : "A member";

    emitEvent(req,ALERT,chat.members,{message:`User ${userName} leave the group.`,chatId});

    return res.status(201).json({
        success:true,
        message:`${userName} leave the group`
    })

})

const sendAttachments = TryCatch(async (req,res,next)=>{
    const {chatId} = req.body;
    
    const [chat,me] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.user,"name")
    ]);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    const files = req.files || []

    if(files.length <1)
        return next(new ErrorHandler("Please provide attachments",400));

// Upload files to the cloudinary

    const attachments=await uploadFilesToCloudinary(files);

    const messageForDB = {content:"",attachments,sender:me._id,chat:chatId}; 

    const messageForRealTime = {
        ...messageForDB,
        sender:{
            _id:me._id,
            name:me.name,
        }
    }

    const message = await Message.create(messageForDB); 

    emitEvent(req,NEW_MESSAGE,chat.members,{
        message:messageForRealTime,
        chatId
    })

    emitEvent(req,NEW_MESSAGE_ALERT,chat.members,{chatId})


    return res.status(201).json({
        success:true,
        message:message,
    })

})

const getChatDetails = TryCatch(async (req,res,next)=>{
    if(req.query.populate==='true'){
        const chat = await Chat.findById(req.params.id).populate(
            "members","name avatar"
        ).lean();

        if(!chat) return next(new ErrorHandler("Chat not found",404));

        chat.members = chat.members.map(({_id,name,avatar})=>
            ({
                _id,
                name,
                avatar:avatar.url
            })
        );

        return res.status(200).json({
            success:true,
            chat,
        });

    }else{
        const chat = await Chat.findById(req.params.id);

        if(!chat) return next(new ErrorHandler("Chat not found",404));

        return res.status(200).json({
            success:true,
            chat,
        });
    }
})


const renameGroup = TryCatch(async (req,res,next)=>{
    const chatId=req.params.id;
    const {name}= req.body;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    if(!chat.isGroup) return next(new ErrorHandler("Chat can not be renamed",404));

    if(chat.creator.toString() !== req.user.toString()) return next(new ErrorHandler("You are not authorized to change the group name"));

    chat.name=name;

    chat.save();

    emitEvent(req,REFETCH_CHATS,chat.members);

    return res.status(200).json({
        success:true,
        message:`Group name is renamed as ${name}`
    })

})


const deleteChat = TryCatch(async (req,res,next)=>{
    const chatId=req.params.id;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    const members=chat.members;

    if(chat.isGroup && chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("You are not allowed to delete the group",403));
    }

    if(!chat.isGroup && !chat.members.includes(req.user.toString())){
        return next(new ErrorHandler("You are not allowed to delete the group",403));
    }

    // here we have to delete all messages as well as attchements from 
    // cloudinary

    const messagesWithAttachments = await Message.find({chat:chatId,
        attachments:{$exists:true,$ne:[]}
    });

    const public_ids =[];

    messagesWithAttachments.forEach(({attachments})=>{
        attachments.forEach(({public_id})=>{
            public_ids.push(public_id);
        })
    })

    await Promise.all([
        // deleteFile from cloudinary
        deleteFileFromCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({chat:chatId}),
    ]);

    emitEvent(req,REFETCH_CHATS,members);

    return res.status(200).json({
        success:true,
        message:'Chat deleted successfully'
    })


    
})

const getMessages = TryCatch(async (req,res,next)=>{
    const chatId = req.params.id;
    const {page=1} = req.query;

    const limit =20;
    const skip = (page-1)*limit;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not Found",404));

    if(!chat.members.includes(req.user.toString())) 
        return next(new ErrorHandler("You are not allowed to access this chat",403));

    const [message,totalMessagesCount] = await Promise.all([
        Message.find({chat:chatId})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
        .populate("sender","name")
        .lean(),
        Message.countDocuments({chat:chatId})
    ])

    const totalPages= Math.ceil(totalMessagesCount/limit) || 0;

    return res.status(200).json({
        success:true,
        message:message.reverse(),
        totalPages,
    })
})


export {newGroupChat,getMyChat,addMembers,removeMembers,leaveGroup,sendAttachments,getChatDetails,renameGroup,deleteChat,getMessages}
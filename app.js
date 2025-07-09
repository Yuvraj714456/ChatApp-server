import express from'express'
import { connectDB } from './utils/features.js';
import dotenv from 'dotenv'
import { errorMiddleWare } from './middlewares/error.js';
import cookieParser from 'cookie-parser';
import {Server} from 'socket.io'
import {createServer} from "http"
import {v4 as uuid} from 'uuid'
import cors from 'cors'
import {v2 as cloudinary} from 'cloudinary'
import { ACTIVE_USERS, GET_ACTIVE_USERS, NEW_MESSAGE, NEW_MESSAGE_ALERT, START_TYPING, STOP_TYPING } from './constants/events.js';
import { getSockets } from './lib/helper.js';
import { corsOptions } from './constants/config.js';
import { socketAuthenticator } from './middlewares/auth.js';
import { Message } from './models/message.js';


import userRoute from './routes/user.js'
import chatRoute from './routes/chat.js'
import  adminRoute from './routes/admin.js'
import { ErrorHandler } from './utils/utility.js';




dotenv.config();

export const userSocketIDs = new Map();

connectDB(process.env.MONGO_URL);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const app = express();
const server = createServer(app);
const io = new Server(server,{
  cors: {
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set("io",io);



const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));


app.use('/api/v1/user',userRoute);
app.use('/api/v1/chat',chatRoute);
app.use('/api/v1/admin',adminRoute);

app.get('/',(req,res)=>{
    res.send("Hello world");
})

io.use((socket,next)=>{
    cookieParser()(socket.request,
                   socket.request.res || {},
                   async (err)=>{
                    if(err){
                        console.error("Cookie parsing error",err);
                        return next(new ErrorHandler("Authentication err"));
                    }

                    try {
                        await socketAuthenticator(err,socket,next);
                    } catch (error) {
                            return next(new ErrorHandler("Authentication err"));
                    }
    })
})

io.on("connection",(socket)=>{
    const user = socket.user;

    userSocketIDs.set(user._id.toString(),socket.id);

    
    socket.on(NEW_MESSAGE,async ({chatId,members,message})=>{
        const messageForRealTime ={
            content:message,
            _id:uuid(),
            sender:{
                _id:user._id,
                name:user.name
            },
            chat:chatId,
            createdAt:new Date().toISOString(),
        }
        
        const messageForDB = {
            content : message,
            sender:user._id,
            chat:chatId
        }

        const membersSockets = getSockets(members);
        
        io.to(membersSockets).emit(NEW_MESSAGE,{
            chatId,
            message:messageForRealTime
        });
        io.to(membersSockets).emit(NEW_MESSAGE_ALERT,{chatId});

        try {
            await Message.create(messageForDB);
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    })

    socket.on(START_TYPING,({members,chatId})=>{

        const membersSockets = getSockets(members);

        socket.to(membersSockets).emit(START_TYPING,{chatId});
    })

    socket.on(STOP_TYPING,({members,chatId})=>{

        const membersSockets = getSockets(members);

        socket.to(membersSockets).emit(STOP_TYPING,{chatId});
    })


    socket.on(GET_ACTIVE_USERS, () => {
        const activeUsers = Array.from(userSocketIDs.keys());
        socket.emit(ACTIVE_USERS, activeUsers);
    });


    socket.on("disconnect",()=>{
        userSocketIDs.delete(user._id.toString());

        io.emit(ACTIVE_USERS,Array.from(userSocketIDs.keys()));
    })
})

app.use(errorMiddleWare);


server.listen(PORT,()=>{
    console.log("Server is running at on port number 3000");
})

import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import {faker, simpleFaker} from '@faker-js/faker'

const createSingleChats =  async (chatsCount)=>{
    try{
        const users = await User.find().select("_id");

        const chatPromise=[];
        for(let i=0;i<chatsCount;i++){
            for(let j=0;j<chatsCount;j++){
                chatPromise.push(
                    Chat.create({
                        name:faker.lorem.words(2),
                        members:["685ac6f18002a189d77723f4",users[j]]
                    })
                )
            }
        }
        await Promise.all(chatPromise);
        process.exit();
    }catch(err){
        console.error(err);
        process.exit(1);
    }
}

const createGroupChats = async (numsChats)=>{
    try {
        const users = await User.find().select("_id");

        const chatPromise=[];

        for(let i=0;i<numsChats;i++){
            const numMembers = simpleFaker.number.int({min:3,max:users.length});

            const members=[];

            for(let i=0;i<numMembers;i++){
                const randomIndex=Math.floor(Math.random()*users.length);
                const randomUser=users[randomIndex];
                
                if(!members.includes(randomUser)){
                    members.push(randomUser);
                }
            }

            const chat = Chat.create({
                isGroup:true,
                name:faker.lorem.words(1),
                members,
                creator:members[0]
            })

            chatPromise.push(chat);
        }
        await Promise.all(chatPromise);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const createMessages = async (numMessages)=>{
    try{
        const users = await User.find().select("_id");
        const chats = await Chat.find().select("_id");

        const messagesPromise = [];

        for(let i=0;i<numMessages;i++){
            const randomUser= users[Math.floor(Math.random()*users.length)];
            const randomChat= chats[Math.floor(Math.random()*chats.length)];

            messagesPromise.push(
                Message.create({
                    chat:randomChat,
                    sender:randomUser,
                    content:faker.lorem.sentence(),
                    attachments: {
                        url: faker.internet.url(),
                        publicId: faker.string.uuid()
                    }
                })
            );
        }

        await Promise.all(messagesPromise);

        process.exit();
    }catch(err){
        console.log(err);
        process.exit(1);
    }
}

const createMessagesInAChat = async (chatId,numMessages)=>{
    try {

        const users = await User.find().select("_id");

        const messagesPromise=[];

        for (let i = 0; i < numMessages; i++) {
            const randomUser = users[Math.floor(Math.random()*users.length)]

            messagesPromise.push(
                Message.create({
                    chat:chatId,
                    sender:randomUser,
                    content:faker.lorem.sentence(),
                    attachments: {
                        url: faker.internet.url(),
                        publicId: faker.string.uuid()
                    }
                })
            )
        }
        await Promise.all(messagesPromise);

        console.log("Message is created");
        process.exit(1);
        
    } catch (error) {
        console.error(error)
        process.exit(1);
    }
}

export {createSingleChats,createGroupChats,createMessages,createMessagesInAChat}
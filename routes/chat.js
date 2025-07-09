import express from 'express'
import { isAuthenticated } from '../middlewares/auth.js'
import { attachmentsMulter } from '../middlewares/multer.js';
import { 
        addMembers, 
        getMyChat, 
        leaveGroup, 
        newGroupChat, 
        removeMembers, 
        sendAttachments ,
        getChatDetails,
        renameGroup,deleteChat, 
        getMessages
        } from '../controllers/chat.js';
import { 
         newGroupChatValidator,
         validateHandler,
         addMembersValidator, 
         removeMembersValidator, 
         sendAttachmentsValidator, 
         renameGroupValidator, 
         chatIdValidator
        } from '../lib/validators.js';

const app = express.Router();


app.use(isAuthenticated);

app.post('/newgroup',newGroupChatValidator(),validateHandler,newGroupChat);

app.get('/getmychats',getMyChat);


app.put('/addmembers',addMembersValidator(),validateHandler,addMembers);

app.put('/removemembers',removeMembersValidator(),validateHandler,removeMembers);

app.delete('/leave/:id',chatIdValidator(),validateHandler,leaveGroup);

app.post('/message',attachmentsMulter,sendAttachmentsValidator(),validateHandler,sendAttachments);

app.get("/message/:id",chatIdValidator(),validateHandler,getMessages)

app.route('/:id').get(chatIdValidator(),validateHandler,getChatDetails).put(renameGroupValidator(),validateHandler,renameGroup).delete(chatIdValidator(),validateHandler,deleteChat);

export default app;



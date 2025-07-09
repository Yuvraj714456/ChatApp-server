import express from 'express'
import {getMyProfile, 
        login,
        logout,
        newUser, 
        searchNewUsers,
        sendFriendRequest,
        handleFriendRequest,
        getMyNotification,
        getMyfriends} from '../controllers/user.js'
import { singleAvatar } from '../middlewares/multer.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { handleFriendRequestValidator, 
         loginValidator, 
         registerValidator, 
         sendFriendRequestValidator, 
         validateHandler} from '../lib/validators.js';

const app = express.Router();


app.post('/newUser',singleAvatar,
                    registerValidator(),
                    validateHandler, 
                    newUser);


app.post('/login',loginValidator(),
                  validateHandler,
                  login);

// After here user must be loggedin

app.use(isAuthenticated);

app.get('/get-profile', getMyProfile);
app.get('/logout',logout);

app.get('/search',searchNewUsers);

app.put('/sendrequest',sendFriendRequestValidator(),
                       validateHandler,
                       sendFriendRequest);


app.put('/handlerequest',handleFriendRequestValidator(),
                       validateHandler,
                       handleFriendRequest);

app.get('/notifications',getMyNotification);     

app.get('/friends',getMyfriends);
                       

export default app;
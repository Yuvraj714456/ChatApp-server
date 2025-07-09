import {body,validationResult, param} from 'express-validator'
import { ErrorHandler } from '../utils/utility.js';

const registerValidator = ()=>[
    body("name","Please Enter Name").notEmpty(),
    body("username","Please Enter Username").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
    body("confirmPassword","Please Enter confirmPassword").notEmpty(),
];

const loginValidator = ()=>[
    body("username","Please Enter Username").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
];

const newGroupChatValidator =()=> [
    body("name","Please Enter Name").notEmpty(),
    body("members").notEmpty().withMessage("Please Enter Members").isArray({min:2,max:100}).withMessage("Members should be 2-100"),
]

const addMembersValidator = ()=>[
    body("chatId","Please Enter chatId").notEmpty(),
    body("members").notEmpty().withMessage("Please Enter Members").isArray().withMessage("Members should be 1-97"),
]

const removeMembersValidator = ()=>[
    body("chatId","Please Enter chatId").notEmpty(),
    body("userId").notEmpty().withMessage("Please Enter userId")
]

const sendAttachmentsValidator = ()=>[
    body("chatId","Please Enter chatId").notEmpty()
]

const chatIdValidator = ()=>[
    param("id","Invalid Chat ID").isMongoId(),
    param("id","Please enter chat Id").notEmpty()
]

const renameGroupValidator = ()=>[
    param("id","Please enter chat Id").notEmpty(),
    body("name","Please Enter Name").notEmpty()
]

const sendFriendRequestValidator = ()=>[
    body("userId","Please Enter User Id").notEmpty()
]

const handleFriendRequestValidator=()=>[
    body("requestId","Please Enter Request Id").notEmpty(),
    body("handle").
    notEmpty().
    withMessage("Please add accept").
    isBoolean().
    withMessage("accept must be a boolean"),
]

const adminLoginValidator =()=>[
    body("username","Please Enter UserName").notEmpty(),
    body("password","Please Enter password").notEmpty()
]



const validateHandler = (req,res,next)=>{
    const errors=validationResult(req);

    const errorMessage = errors.array().map((error)=>error.msg).join(',');


    if(errors.isEmpty())return next();
    else{
        return next(new ErrorHandler(errorMessage,400))
    }
}





export {
        registerValidator,
        validateHandler,
        loginValidator,
        newGroupChatValidator,
        addMembersValidator,
        removeMembersValidator,
        chatIdValidator,
        sendAttachmentsValidator,
        renameGroupValidator,
        sendFriendRequestValidator,
        handleFriendRequestValidator,
        adminLoginValidator
    }
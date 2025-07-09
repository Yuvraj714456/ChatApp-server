import mongoose,{Schema,Types,model} from "mongoose";

const schema = new Schema({
    name:{
        type:String,
        required:true
    },
    isGroup:{
        type:Boolean,
        default:false,
    },
    creator:{
        type:Types.ObjectId,
        ref:"User",
    },
    members:[
        {
          type:Types.ObjectId,
          ref:"User",  
        }
    ]
    

},{timestamps:true})

console.log(Types.ObjectId);
export const Chat = mongoose.models.Chat || model("Chat",schema);
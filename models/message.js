import mongoose,{Schema,Types,model} from "mongoose";

const schema = new Schema({

    content:String,
    sender:{
        type:Types.ObjectId,
        ref:"User",
        required:true
    },
    chat:{
        type:Types.ObjectId,
        ref:"Chat",
        required:true,
    },
    attachments:[{
        publicId:{
            type:String,
            required:true,
        },
        url:{
            type:String,
            required:true,
        }
    }]
},{
    timestamps:true
})


export const Message = mongoose.models.Message ||  model("Message",schema);
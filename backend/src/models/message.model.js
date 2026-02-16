import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    text: {
        type: String,
    },
    image: {
        type: String,
    },
    replyTo: {
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        text: {
            type: String,
            default: "",
        },
        image: {
            type: String,
            default: "",
        },
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
},
    { timestamps: true }
); 

const Message = mongoose.model("Message", messageSchema);

export default Message;

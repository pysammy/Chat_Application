import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";  
import { getIO, getReceiverSocketId } from "../lib/socket.js";
import mongoose from "mongoose";

const toId = (value) => String(value);

export const getUsersForSideBar = async (req, res, next) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    next(error);
  }
};

export const getmessages = async (req, res, next) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedFor: { $nin: [myId] },
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { text, image, replyToMessageId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    let replyTo;
    if (replyToMessageId) {
      if (!mongoose.Types.ObjectId.isValid(replyToMessageId)) {
        return res.status(400).json({ message: "Invalid reply target identifier" });
      }

      const repliedMessage = await Message.findById(replyToMessageId);
      if (!repliedMessage) {
        return res.status(404).json({ message: "Reply target not found" });
      }

      const senderKey = toId(senderId);
      const receiverKey = toId(receiverId);
      const repliedSender = toId(repliedMessage.senderId);
      const repliedReceiver = toId(repliedMessage.receiverId);
      const belongsToConversation =
        (repliedSender === senderKey && repliedReceiver === receiverKey) ||
        (repliedSender === receiverKey && repliedReceiver === senderKey);

      if (!belongsToConversation) {
        return res.status(400).json({ message: "Invalid reply target for this conversation" });
      }

      replyTo = {
        messageId: repliedMessage._id,
        senderId: repliedMessage.senderId,
        text: repliedMessage.text || "",
        image: repliedMessage.image || "",
      };
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      replyTo,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    const io = getIO();

    if (receiverSocketId && io) {
      io.to(receiverSocketId).emit("message:new", newMessage);
    }

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId && io) {
      io.to(senderSocketId).emit("message:new", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    next(error);       
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;
    const requesterId = toId(req.user._id);
    const scope = req.body?.scope === "everyone" ? "everyone" : "me";

    const existingMessage = await Message.findById(messageId);
    if (!existingMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    const senderId = toId(existingMessage.senderId);
    const receiverId = toId(existingMessage.receiverId);
    const isParticipant = requesterId === senderId || requesterId === receiverId;
    if (!isParticipant) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const io = getIO();
    if (scope === "everyone") {
      if (requesterId !== senderId) {
        return res.status(403).json({ message: "Only the sender can delete for everyone" });
      }

      await Message.findByIdAndDelete(messageId);

      if (io) {
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message:deleted", { messageId, scope: "everyone" });
        }

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message:deleted", { messageId, scope: "everyone" });
        }
      }
    } else {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: req.user._id },
      });

      if (io) {
        const requesterSocketId = getReceiverSocketId(requesterId);
        if (requesterSocketId) {
          io.to(requesterSocketId).emit("message:deleted", {
            messageId,
            scope: "me",
            userId: requesterId,
          });
        }
      }
    }

    res.status(200).json({ message: "Message deleted", messageId, scope });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    next(error);
  }
};

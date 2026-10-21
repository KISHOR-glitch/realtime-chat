import User from "../models/user.model.js";
import Message from "../models/message.mode.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
//fetch eery single user but not ourselves
export const getUsersForSidebar = async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        const filterdUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

        res.status(200).json(filterdUsers);
    } catch (error) {
        console.log("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
//get msg's between two users dynamic value

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [//it means find the msg where sender is me recevr is other or sender is other and reviever is me
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        })

        res.status(200).json(messages);
    }

    catch (error) {
        console.log("error in getMessages controller:", error.message);
        res.status(500).json({ error: "Internal server error" });

    }

}

export const sendMessage = async (req, res) => {//msg can be text or img keep in mind

    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;// renameing the id to recieer id
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            //              upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;

        }
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });
        await newMessage.save();

        //todo:realtime functionlaity goes here => socket.io
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }
        res.status(201).json(newMessage);


    }
    catch (error) {
        console.log("error in send Message controller ", error.message);
        res.status(500).json({ error: "Internal server error" });

    }

}
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: String,
    text: String,
    timestamp: Date
});

messageSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    }
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    clerkId: { type: String, required: true },
    jobs: { type: Array, default: [] }
});

module.exports = mongoose.model('users', UserSchema);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  mobile:   { type: String, required: true },
  deviceId: { type: String, required: true, unique: true },
  email:    { type: String, default: "" },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving (Mongoose v6+ async middleware — no next() callback)
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);

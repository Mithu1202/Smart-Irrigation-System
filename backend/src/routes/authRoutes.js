const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "zonehub_secret_key_2024";

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { fullName, mobile, deviceId, email, password, confirmPassword } = req.body;

    if (!fullName || !mobile || !deviceId || !password) {
      return res.status(400).json({ error: "fullName, mobile, deviceId and password are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const existing = await User.findOne({ deviceId });
    if (existing) {
      return res.status(409).json({ error: "Device ID already registered. Please login." });
    }

    const user = new User({ fullName, mobile, deviceId, email: email || "", password });
    await user.save();

    const token = jwt.sign({ userId: user._id, deviceId: user.deviceId }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobile: user.mobile,
        deviceId: user.deviceId,
        email: user.email,
        handle: "@" + user.fullName.split(" ")[0].toLowerCase(),
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during signup." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { deviceId, password } = req.body;

    if (!deviceId || !password) {
      return res.status(400).json({ error: "deviceId and password are required." });
    }

    const user = await User.findOne({ deviceId });
    if (!user) {
      return res.status(401).json({ error: "No account found with that Device ID." });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    const token = jwt.sign({ userId: user._id, deviceId: user.deviceId }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobile: user.mobile,
        deviceId: user.deviceId,
        email: user.email,
        handle: "@" + user.fullName.split(" ")[0].toLowerCase(),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// GET /api/auth/me  (verify token)
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided." });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
});

module.exports = router;

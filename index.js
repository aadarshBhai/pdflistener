// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // For password hashing
const nodemailer = require('nodemailer'); // For sending emails
const jwt = require('jsonwebtoken'); // For JWT
require('dotenv').config(); // Load environment variables

// Connect to MongoDB
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

// Create User Model
const User = mongoose.model('User', userSchema);

// Initialize Express App
const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the 'public' directory

// Root Route to serve home.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html'); // Adjust the path as necessary
});

// Signup Route
app.post('/signup', async (req, res) => {
  const {
    fullName,
    email,
    password
  } = req.body;

  // Validate input
  if (!fullName || !email || !password) {
    return res.status(400).json({
      message: 'All fields are required.'
    });
  }

  // Check password length
  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters long.'
    });
  }
  try {
    const existingUser = await User.findOne({
      email
    });
    if (existingUser) {
      return res.status(400).json({
        message: 'Email already in use.'
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword
    });
    await newUser.save();
    res.status(201).json({
      message: 'User registered successfully!',
      redirect: '/home.html'
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({
      message: 'Internal server error.'
    });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const {
    email,
    password
  } = req.body;

  // Check password length
  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters long.'
    });
  }
  try {
    const user = await User.findOne({
      email
    });
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid password'
      });
    }
    const token = jwt.sign({
      userId: user._id
    }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });
    res.json({
      message: 'Login successful',
      token,
      redirect: '/home.html'
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      message: 'Internal server error.'
    });
  }
});

// Password Reset Request Route
app.post('/reset-password', async (req, res) => {
  const {
    email
  } = req.body;
  try {
    const user = await User.findOne({
      email
    });
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    const token = jwt.sign({
      userId: user._id
    }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });
    const resetLink = `http://localhost:3000/reset-password/${token}`; // Fixed template literal

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset',
      text: `Click the link to reset your password: ${resetLink}` // Fixed template literal
    };
    await transporter.sendMail(mailOptions);
    res.json({
      message: 'Password reset link sent to your email.'
    });
  } catch (error) {
    console.error('Error during password reset request:', error);
    res.status(500).json({
      message: 'Internal server error.'
    });
  }
});

// Serve Reset Password Page
app.get('/reset-password/:token', (req, res) => {
  const {
    token
  } = req.params;
  try {
    jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    res.sendFile(__dirname + '/public/reset-password.html'); // Serve the reset password form
  } catch (error) {
    console.error('Invalid or expired token:', error);
    res.status(400).send({
      message: 'Invalid or expired token.'
    });
  }
});

// Handle Reset Password Submission
app.post('/reset-password/:token', async (req, res) => {
  const {
    token
  } = req.params;
  const {
    password
  } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword
    });
    res.json({
      message: 'Password reset successful.'
    });
  } catch (error) {
    console.error('Error during password reset:', error);
    res.status(400).json({
      message: 'Invalid or expired token.'
    });
  }
});

// Start the Server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Fixed console log message
});

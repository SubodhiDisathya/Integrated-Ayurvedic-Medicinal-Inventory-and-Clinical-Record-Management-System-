const { db } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.collection('users').add({
      name: name,
      email: email,
      password: hashedPassword,
      role: role || 'staff',
      createdAt: new Date()
    });
    
    res.json({ success: true, message: 'User Registered Successfully!' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ success: false, error: 'User not found!' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Wrong password!' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: userDoc.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: token,
      role: user.role,
      name: user.name,
      email: user.email
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { register, login };
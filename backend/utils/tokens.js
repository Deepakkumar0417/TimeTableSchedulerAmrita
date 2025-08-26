import jwt from 'jsonwebtoken';

const generateToken = (id, res) => {
    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });

    // Optional: Set as cookie if needed
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000 // 1 hour
    });

    return token; // 🔥 THIS IS CRITICAL
};

export default generateToken;

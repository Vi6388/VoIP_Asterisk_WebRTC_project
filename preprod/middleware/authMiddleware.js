const TOKEN = '7fb0f800a8f0'; // The token that will be checked in the requests

// Middleware to check for the token in the Authorization header
function authenticate(req, res, next) {
    // Check for Authorization header
    const token = req.header('Authorization');
    
    // If no token is found, return an error
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authorization token is required' });
    }

    // If token is incorrect, return an error
    if (token !== `Bearer ${TOKEN}`) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }

    // If token is valid, allow the request to proceed
    next();
}

module.exports = authenticate;
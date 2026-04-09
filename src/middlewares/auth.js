import jwt from "jsonwebtoken";
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(400).json({message: 'No se proporcionó un token válido'});

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({message: 'Token inválido o expirado'});
        req.user = user;
        next();
    });
}

export  default  authenticateToken;
import express from 'express';
import comprasRouter from "./routers/comprasRouter.js";
import dotenv from 'dotenv';
import  cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authenticateToken from "./middlewares/auth.js";
import sequelize from './config/database.js'
import User from './models/user.js';
import emailsRouter from "./routers/emailsRouter.js";
import filesRouter from "./routers/filesRouter.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use('/compras', comprasRouter);
app.use('/servicios/emails', emailsRouter);
app.use('/files', filesRouter);

sequelize.authenticate()
    .then(() => console.log('Conexión a MySQL exitosa'))
    .catch(err => console.error('Error de conexión: ', err));

sequelize.sync({ force: false }) //  { force: true } 
    .then(() => console.log('Modelos sincronizados'));

const users = [];

const PORT = process.env.PORT ?? 3001;
const HOST = process.env.HOST ?? '127.0.0.1';
app.listen(PORT,HOST,() => {
    console.log(`Servidor escuchando en el puerto: ${PORT} en el HOST: ${HOST}`);
})

app.get('/api/', (req, res) => {
    res.send('Hola mundo');
})

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({username, password: hashedPassword});

        res.status(201).json({ message: 'Usuario registrado' , user });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar usuario', details: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const {username, password} = req.body;

        const user = await User.findOne({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });

    } catch (error) {
        res.status(500).json({ error: 'Error al autenticar usuario', details: error.message });
    }
});

app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ message: `Hola ${req.user.username}, accediste a una ruta protegida` });
});

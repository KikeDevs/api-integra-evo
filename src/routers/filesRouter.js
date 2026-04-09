import {Router} from 'express';
import multer from 'multer';
import path from 'path';

const filesRouter = new Router();


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/files'); // Carpeta donde se guardará el archivo
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

filesRouter.post('/', upload.single('file'), (req, res) => {

    console.log(req.file)

    res.json({
        message: 'Archivo subido correctamente',
        file: req.file,
        hola: req.file.originalname,
    });
});

export default filesRouter;


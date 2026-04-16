import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from "../config/database.js"

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR  = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'emails_errors.txt');

function logEmailError({ id_pago, id_servicio, destinatario, error }) {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

    const linea = [
        `[${new Date().toISOString()}]`,
        `ID_PAGO=${id_pago ?? 'N/A'}`,
        `ID_SERVICIO=${id_servicio ?? 'N/A'}`,
        `DESTINATARIO=${destinatario ?? 'N/A'}`,
        `ERROR=${error}`,
    ].join(' | ') + '\n';

    fs.appendFileSync(LOG_FILE, linea, 'utf8');
}

export const sendEmail = async (req, res) => {

    const url = "integra.infrahub.services";
    
    const { asunto, descripcion, archivo, users, id_pago, id_servicio} = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ success: false, message: "No se recibieron destinatarios" });
    };

    if (!id_pago) {
        return res.status(400).json({ success: false, message: "Falta el id_pago" });
    }


    const token = crypto.randomBytes(32).toString('hex');

    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const t = await sequelize.transaction();

    await sequelize.query(
        `
        INSERT INTO activos.servicios_pagos_tokens (id_pago, token, expira)
        VALUES (?, ?, ?)
        `,
        {
            replacements: [id_pago, token, expira],
            transaction: t
        }
    );

    const descripcionHtml = descripcion
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');



    try {

        for(const d of users) {

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: d.correo_empresarial,
                subject: asunto,
                html: `
                        <p>Hola, ${d.nombre}! </p>
                        <p>${descripcionHtml}</p>
                        <p style="margin-bottom: 35px">Puedes notificar el pago accediendo al siguiente link de USO ÚNICO:<a href="https://${url}/integra/#!/servicios/subirPago/${token}"><b> Registra el pago aquí</b></a></p>
                        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content:center; gap: 5px;">
                          <p style="font-style: italic; color: #4e73df; margin: 0px"><b>INTEGRA</b> | Sistema web de pagos</p>
                          <p style="margin: 0px"><small>Este mensaje fue generado automáticamente. No respondas este correo</small></p>
                          <img style="width: 60px;" src="/var/www/html/api_evo/public/img/LogoIntegraSVGSnTexto.svg" alt="Logo_integra">
                        </div>`,
                attachments: archivo
                    ? [{ filename: archivo, path: `/var/www/integra/storage/general/${archivo}` }]
                    : []
            };

            await transporter.sendMail(mailOptions);

            await sequelize.query(
                `
                INSERT INTO activos.correos_pagos (id_pago, remitente, destinatario, fecha_enviado, id_servicio)
                VALUES (?, ?, ?, NOW(), ?)
                `,
                {
                    replacements: [
                        id_pago,
                        process.env.EMAIL_USER,     // remitente
                        d.correo_empresarial,
                        id_servicio        // destinatario
                    ],
                    transaction: t
                }
            );
        }
        await t.commit();
        res.status(200).json({ success: true, message: 'Correo enviado correctamente' });
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        logEmailError({
            id_pago,
            id_servicio,
            destinatario: users?.map(u => u.correo_empresarial).join(', '),
            error: error.message
        });
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};


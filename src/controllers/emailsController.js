import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as dns } from 'dns';
import sequelize from "../config/database.js"

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR  = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'emails_errors.txt');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function validarCorreo(correo) {
    if (!EMAIL_REGEX.test(correo)) return { valido: false, motivo: 'invalido' };
    const dominio = correo.split('@')[1];
    try {
        const mx = await dns.resolveMx(dominio);
        if (!mx || mx.length === 0) return { valido: false, motivo: 'sin_mx' };
    } catch {
        return { valido: false, motivo: 'sin_mx' };
    }
    return { valido: true };
}

// 1x1 transparent GIF — devuelto por el pixel de tracking
const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

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

function parseEstatusPago(payload = {}) {
    const rawEstatus =
        payload.id_estatus ??
        payload.id_Estatus ??
        payload.idEstatus ??
        payload.estatus?.id_estatus ??
        payload.pago?.id_estatus;

    if (rawEstatus === undefined || rawEstatus === null) return null;

    const estatus = Number(String(rawEstatus).trim());
    return Number.isFinite(estatus) ? estatus : null;
}

export const getEmailErrors = (_req, res) => {
    if (!fs.existsSync(LOG_FILE)) {
        return res.status(200).json({ success: true, errors: [] });
    }

    const lines = fs.readFileSync(LOG_FILE, 'utf8')
        .split('\n')
        .filter(Boolean);

    const errors = lines.map(line => {
        const parts = {};
        line.split(' | ').forEach(segment => {
            const idx = segment.indexOf('=');
            if (idx === -1) {
                parts.timestamp = segment.replace(/^\[|\]$/g, '');
            } else {
                const key = segment.slice(0, idx).toLowerCase();
                parts[key] = segment.slice(idx + 1);
            }
        });
        return parts;
    });

    res.status(200).json({ success: true, total: errors.length, errors });
};

export const testEmail = async (req, res) => {
    const report = [];
    const mark = (msg) => report.push({ ms: Date.now() - start, paso: msg });
    const start = Date.now();

    const config = {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS ? '***' : '(vacío)'
        }
    };

    mark(`Configuración SMTP: host=${config.host} port=${config.port} secure=${config.secure} user=${config.auth.user}`);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        mark('Verificando conexión SMTP...');
        await transporter.verify();
        mark('Conexión SMTP OK');

        mark('Enviando correo...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'infr.fullstack@hovanet.com',
            subject: 'Test de correo - INTEGRA',
            html: `<p>Este es un correo de prueba enviado desde la API de INTEGRA.</p><p>Hora: ${new Date().toISOString()}</p>`
        });
        mark(`Correo enviado. messageId=${info.messageId} response=${info.response}`);

        res.status(200).json({ success: true, report });
    } catch (error) {
        mark(`ERROR: ${error.message}`);
        res.status(500).json({ success: false, report, error: error.message });
    }
};

export const sendEmail = async (req, res) => {

    const url = "integra.infrahub.services";

    const {
        asunto,
        descripcion,
        archivo,
        users,
        id_pago,
        id_servicio
    } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ success: false, message: "No se recibieron destinatarios" });
    }

    if (!id_pago) {
        return res.status(400).json({ success: false, message: "Falta el id_pago" });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
        `INSERT INTO activos.servicios_pagos_tokens (id_pago, token, expira) VALUES (?, ?, ?)`,
        { replacements: [id_pago, token, expira], transaction: t }
    );

    await sequelize.query(
        `INSERT INTO activos.pagos_eventos (id_pago, evento) VALUES (?, 'link_generado')`,
        { replacements: [id_pago], transaction: t }
    );

    const descripcionHtml = descripcion
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

    const estatusPago = parseEstatusPago(req.body);
    const textoAccionPago = estatusPago === 5 ? 'Justifica el pago aquí' : 'Registra el pago aquí';

    try {
        const smtpDebug = [];

        for (const d of users) {

            // 1. Validar formato y registros MX del correo antes de intentar enviar
            const { valido, motivo } = await validarCorreo(d.correo_empresarial);

            if (!valido) {
                await sequelize.query(
                    `INSERT INTO activos.correos_pagos (id_pago, remitente, destinatario, fecha_enviado, id_servicio, status)
                     VALUES (?, ?, ?, NOW(), ?, ?)`,
                    { replacements: [id_pago, process.env.EMAIL_USER, d.correo_empresarial, id_servicio, motivo], transaction: t }
                );
                smtpDebug.push({ destinatario: d.correo_empresarial, status: motivo, messageId: null, response: null });
                continue;
            }

            // 2. Generar token único de tracking por destinatario
            const trackingToken = crypto.randomBytes(16).toString('hex');

            await sequelize.query(
                `INSERT INTO activos.correos_pagos (id_pago, remitente, destinatario, fecha_enviado, id_servicio, tracking_token, status)
                 VALUES (?, ?, ?, NOW(), ?, ?, 'pendiente')`,
                {
                    replacements: [id_pago, process.env.EMAIL_USER, d.correo_empresarial, id_servicio, trackingToken],
                    transaction: t
                }
            );

            // 3. Construir pixel de tracking con el token único
            const pixelUrl = `${process.env.API_URL}/servicios/emails/track/${trackingToken}`;

            // 4. Enviar el correo con el pixel embebido
            const info = await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: d.correo_empresarial,
                subject: asunto,
                html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${asunto}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef1f8;padding:36px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(78,115,223,0.13);">

          <!-- Banner -->
          <tr>
            <td style="background-color:#4e73df;background-image:linear-gradient(135deg,#4e73df 0%,#224abe 100%);padding:36px 40px 28px;text-align:center;">
              <div style="display:inline-block;background-color:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:14px;">&#128179;</div>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Aviso de pago</h1>
              <p style="margin:0;color:#c9d6ff;font-size:13px;">INTEGRA &mdash; Sistema web de pagos</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 24px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#222222;">Hola, ${d.nombre}</p>
              <p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.75;">${descripcionHtml}</p>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:0 0 12px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="36" valign="top">
                          <div style="width:28px;height:28px;border-radius:50%;background-color:#4e73df;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">1</div>
                        </td>
                        <td style="padding-top:4px;font-size:14px;color:#444444;">Haz clic en el botón de abajo para acceder al enlace seguro.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="36" valign="top">
                          <div style="width:28px;height:28px;border-radius:50%;background-color:#4e73df;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">2</div>
                        </td>
                        <td style="padding-top:4px;font-size:14px;color:#444444;">Sube tu comprobante o completa el formulario de pago.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="36" valign="top">
                          <div style="width:28px;height:28px;border-radius:50%;background-color:#1cc88a;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">&#10003;</div>
                        </td>
                        <td style="padding-top:4px;font-size:14px;color:#444444;">&#161;Listo! Tu pago quedará registrado en el sistema.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-image:linear-gradient(135deg,#4e73df 0%,#224abe 100%);border-radius:8px;box-shadow:0 4px 12px rgba(78,115,223,0.4);">
                          <a href="https://${url}/integra/#!/servicios/subirPago/${token}"
                             style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                            ${textoAccionPago} &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Warning badge -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f6fb;border-top:1px solid #e3e8f4;padding:22px 40px;text-align:center;">
              <img src="https://integra.infrahub.services/integra/assets/img/LogoIntegraSVGSnTexto.svg" alt="INTEGRA" style="height:36px;margin-bottom:10px;">
              <p style="margin:0 0 4px;font-size:12px;color:#888888;">Este mensaje fue generado autom&aacute;ticamente &mdash; por favor no respondas este correo.</p>
              <p style="margin:0;font-size:11px;color:#bbbbbb;">&copy; ${new Date().getFullYear()} INTEGRA &mdash; Todos los derechos reservados</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  <img src="${pixelUrl}" width="1" height="1" style="display:none;mso-hide:all" alt="">
</body>
</html>`,
                attachments: archivo
                    ? [{ filename: archivo, path: `/var/www/integra/storage/general/${archivo}` }]
                    : []
            });

            smtpDebug.push({ destinatario: d.correo_empresarial, messageId: info.messageId, response: info.response });

            // 5. Guardar confirmación SMTP — prueba de que Gmail aceptó el mensaje
            await sequelize.query(
                `UPDATE activos.correos_pagos
                 SET messageId = ?, smtp_response = ?, status = 'enviado'
                 WHERE tracking_token = ?`,
                {
                    replacements: [
                        info.messageId,
                        (info.response ?? '').substring(0, 255),
                        trackingToken
                    ],
                    transaction: t
                }
            );

            await sequelize.query(
                `INSERT INTO activos.pagos_eventos (id_pago, evento, detalle) VALUES (?, 'email_enviado', ?)`,
                {
                    replacements: [id_pago, JSON.stringify({ destinatario: d.correo_empresarial, message_id: info.messageId })],
                    transaction: t
                }
            );
        }

        await t.commit();
        res.status(200).json({ success: true, message: 'Correo enviado correctamente', debug_smtp: smtpDebug });

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

// Llamado por el cliente de correo al renderizar el pixel — registra que el correo fue abierto
export const trackEmail = async (req, res) => {
    // Responder de inmediato con el GIF para no bloquear al cliente de correo
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': PIXEL_GIF.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
    });
    res.end(PIXEL_GIF);

    const { id } = req.params;
    try {
        // AND fecha_abierto IS NULL para no sobreescribir la primera apertura
        await sequelize.query(
            `UPDATE activos.correos_pagos SET fecha_abierto = NOW(), status = 'abierto' WHERE tracking_token = ? AND fecha_abierto IS NULL`,
            { replacements: [id] }
        );
    } catch (err) {
        console.error('Error al registrar apertura de correo:', err.message);
    }
};

// Consulta el estado de envío y apertura de correos, filtrable por id_pago e id_servicio
export const getSentEmails = async (req, res) => {
    const { id_pago, id_servicio } = req.query;

    const conditions = [];
    const replacements = [];

    if (id_pago) {
        conditions.push('id_pago = ?');
        replacements.push(id_pago);
    }
    if (id_servicio) {
        conditions.push('id_servicio = ?');
        replacements.push(id_servicio);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const [rows] = await sequelize.query(
            `SELECT id_correo, id_pago, id_servicio, destinatario, fecha_enviado,
                    messageId, smtp_response, fecha_abierto, bounced, bounce_reason, status
             FROM activos.correos_pagos
             ${where}
             ORDER BY fecha_enviado DESC
             LIMIT 200`,
            { replacements }
        );

        res.status(200).json({
            success: true,
            total: rows.length,
            correos: rows.map(r => ({
                ...r,
                abierto: !!r.fecha_abierto
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Conecta a Gmail IMAP y detecta correos rebotados (MAILER-DAEMON), actualiza bounced en correos_pagos
export const checkBounces = async (_req, res) => {
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        logger: false
    });

    const bounces = [];

    try {
        await client.connect();
        await client.mailboxOpen('INBOX');

        const uids = await client.search({ from: 'mailer-daemon@googlemail.com' }, { uid: true });

        if (uids.length > 0) {
            for await (const msg of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
                const source = msg.source.toString('utf8');

                // Extraer destinatario fallido del header estándar de rebote
                const recipientMatch = source.match(/X-Failed-Recipients:\s*(.+)/i);
                // Buscar todos los Message-ID en el cuerpo — el segundo suele ser el original
                const msgIdMatches = [...source.matchAll(/Message-ID:\s*(<[^>]+>)/gi)];

                const destinatario = recipientMatch?.[1]?.trim() ?? null;
                const originalMsgId = msgIdMatches.length > 1 ? msgIdMatches[1][1] : null;

                let updated = 0;

                if (originalMsgId) {
                    const [, meta] = await sequelize.query(
                        `UPDATE activos.correos_pagos SET bounced = 1, bounce_reason = ?, status = 'rebotado' WHERE messageId = ? AND bounced = 0`,
                        { replacements: [msg.envelope.subject?.substring(0, 255), originalMsgId] }
                    );
                    updated = meta.affectedRows;
                } else if (destinatario) {
                    const [, meta] = await sequelize.query(
                        `UPDATE activos.correos_pagos SET bounced = 1, bounce_reason = ?, status = 'rebotado' WHERE LOWER(destinatario) = LOWER(?) AND bounced = 0`,
                        { replacements: [msg.envelope.subject?.substring(0, 255), destinatario] }
                    );
                    updated = meta.affectedRows;
                }

                bounces.push({
                    destinatario: destinatario ?? 'desconocido',
                    originalMsgId: originalMsgId ?? null,
                    asunto: msg.envelope.subject,
                    fecha: msg.envelope.date,
                    registros_actualizados: updated
                });
            }
        }

        await client.logout();
        res.status(200).json({ success: true, total: bounces.length, bounces });

    } catch (error) {
        try { await client.logout(); } catch (_) {}
        res.status(500).json({ success: false, message: error.message });
    }
};

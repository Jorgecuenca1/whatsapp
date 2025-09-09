import express from 'express';
import { Boom } from '@hapi/boom';
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion 
} from 'baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Variables globales
let sock = null;
let qrData = null;
let isConnected = false;
let autoResponseEnabled = true; // Control de respuestas automáticas

// Crear servidor Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/qr', async (req, res) => {
    try {
        if (isConnected) {
            return res.json({
                success: true,
                connected: true,
                message: 'Ya está conectado a WhatsApp'
            });
        }
        
        if (!qrData) {
            return res.json({
                success: false,
                message: 'Código QR no disponible aún'
            });
        }
        
        // Generar imagen QR en base64
        const qrImage = await QRCode.toBuffer(qrData, {
            type: 'png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300
        });
        
        const qrBase64 = qrImage.toString('base64');
        
        res.json({
            success: true,
            qr: qrBase64,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error generando QR para web:', error);
        res.json({
            success: false,
            error: 'Error generando código QR'
        });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        hasQR: !!qrData
    });
});

app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        stats: {
            messages: 0,
            conversations: 0,
            autoResponseEnabled: autoResponseEnabled
        }
    });
});

// Endpoint para habilitar/deshabilitar respuestas automáticas
app.post('/api/toggle-auto-response', (req, res) => {
    autoResponseEnabled = !autoResponseEnabled;
    console.log(`🤖 Respuestas automáticas: ${autoResponseEnabled ? 'ACTIVADAS' : 'DESACTIVADAS'}`);
    res.json({
        success: true,
        autoResponseEnabled: autoResponseEnabled,
        message: `Respuestas automáticas ${autoResponseEnabled ? 'activadas' : 'desactivadas'}`
    });
});

// API para enviar mensajes desde el formulario web
app.post('/api/send-message', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'Número de teléfono y mensaje son requeridos'
            });
        }
        
        if (!isConnected || !sock) {
            return res.status(503).json({
                success: false,
                error: 'Bot no está conectado a WhatsApp. Por favor escanea el código QR primero.'
            });
        }
        
        // Formatear número
        let cleanNumber = phoneNumber.replace(/\D/g, '');
        if (phoneNumber.startsWith('+')) {
            cleanNumber = phoneNumber.substring(1).replace(/\D/g, '');
        }
        const jid = cleanNumber + '@s.whatsapp.net';
        
        // Enviar mensaje
        await sock.sendMessage(jid, { text: message });
        
        console.log(`📤 Mensaje enviado a ${phoneNumber}: ${message}`);
        
        res.json({
            success: true,
            message: 'Mensaje enviado exitosamente'
        });
        
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar mensaje: ' + error.message
        });
    }
});

// API para enviar mensajes a través de WhatsApp
app.post('/api/whatsapp/send', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber y message son requeridos'
            });
        }
        
        if (!isConnected || !sock) {
            return res.status(503).json({
                success: false,
                error: 'Bot no está conectado a WhatsApp'
            });
        }
        
        // Formatear número
        let cleanNumber = phoneNumber.replace(/\D/g, '');
        if (phoneNumber.startsWith('+')) {
            cleanNumber = phoneNumber.substring(1).replace(/\D/g, '');
        }
        const jid = cleanNumber + '@s.whatsapp.net';
        
        // Enviar mensaje
        await sock.sendMessage(jid, { text: message });
        
        console.log(`📤 Mensaje enviado a ${phoneNumber}`);
        
        res.json({
            success: true,
            message: 'Mensaje enviado exitosamente',
            data: {
                phoneNumber,
                messageLength: message.length,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar mensaje'
        });
    }
});

app.get('/api/whatsapp/info', (req, res) => {
    res.json({
        name: 'WhatsApp Bot Simple',
        version: '1.0.0',
        status: isConnected ? 'connected' : 'disconnected',
        endpoints: {
            send: {
                method: 'POST',
                url: '/api/whatsapp/send',
                parameters: {
                    phoneNumber: 'string',
                    message: 'string'
                }
            }
        }
    });
});

// Función principal del bot
async function startBot() {
    try {
        console.log('🤖 Iniciando WhatsApp Bot Simple...');
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        const { version, isLatest } = await fetchLatestBaileysVersion();
        
        console.log(`📱 Usando WhatsApp v${version.join('.')}, es la última: ${isLatest}`);
        
        sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: state,
            generateHighQualityLinkPreview: true
        });
        
        // Manejar actualizaciones de conexión
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📲 Nuevo código QR generado');
                console.log(`🌐 Ve a http://localhost:${PORT} para ver el QR`);
                qrData = qr;
                isConnected = false;
                
                // Mostrar QR en consola también
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'close') {
                isConnected = false;
                qrData = null;
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Conexión cerrada. Reconectando...', shouldReconnect);
                
                if (shouldReconnect) {
                    await startBot();
                }
            } else if (connection === 'open') {
                console.log('✅ ¡Bot conectado exitosamente!');
                isConnected = true;
                qrData = null;
            }
        });
        
        // Guardar credenciales
        sock.ev.on('creds.update', saveCreds);
        
        // Manejar mensajes
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            for (const msg of messages) {
                if (!msg.message || msg.key.fromMe) continue;
                
                const messageText = msg.message.conversation || 
                                  msg.message.extendedTextMessage?.text || '';
                
                if (messageText) {
                    console.log(`📩 Mensaje recibido de ${msg.key.remoteJid}: ${messageText}`);
                    
                    // Respuesta automática simple (solo si está habilitada)
                    if (autoResponseEnabled) {
                        try {
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: `🤖 Bot recibió: "${messageText}"\n\n_Respuesta automática activada_`
                            });
                            console.log('✅ Respuesta automática enviada');
                        } catch (error) {
                            console.error('Error enviando respuesta:', error);
                        }
                    } else {
                        console.log('🔕 Respuestas automáticas desactivadas - mensaje no respondido');
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error en el bot:', error);
    }
}

// Iniciar servidor Express
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`🌐 Servidor web iniciado en http://localhost:${PORT}`);
    // Iniciar bot después de que el servidor esté listo
    startBot();
});
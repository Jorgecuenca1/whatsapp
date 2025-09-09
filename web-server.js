import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebServer {
    constructor() {
        this.app = express();
        this.port = 3000;
        this.qrData = null;
        this.isConnected = false;
        this.stats = {
            messages: 0,
            conversations: 0,
            startTime: Date.now()
        };
        this.logs = [];
        
        this.setupMiddleware();
        this.setupRoutes();
    }
    
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }
    
    setupRoutes() {
        // Ruta principal
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
        
        // API para obtener el código QR
        this.app.get('/api/qr', async (req, res) => {
            try {
                if (this.isConnected) {
                    return res.json({
                        success: true,
                        connected: true,
                        message: 'Ya está conectado a WhatsApp'
                    });
                }
                
                if (!this.qrData) {
                    return res.json({
                        success: false,
                        message: 'Código QR no disponible aún'
                    });
                }
                
                // Generar imagen QR en base64
                const qrImage = await QRCode.toBuffer(this.qrData, {
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
        
        // API para refrescar QR
        this.app.post('/api/refresh-qr', (req, res) => {
            this.qrData = null;
            this.isConnected = false;
            res.json({ success: true, message: 'QR refresh solicitado' });
        });
        
        // API para estadísticas
        this.app.get('/api/stats', (req, res) => {
            const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
            res.json({
                success: true,
                stats: {
                    ...this.stats,
                    uptime: uptime
                }
            });
        });
        
        // API para logs
        this.app.get('/api/logs', (req, res) => {
            const logsHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Bot Logs</title>
                    <style>
                        body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                        .log-entry { margin: 5px 0; padding: 8px; border-radius: 4px; }
                        .info { background: #0e4f79; }
                        .error { background: #722f37; }
                        .success { background: #14432a; }
                        .timestamp { color: #9cdcfe; }
                    </style>
                </head>
                <body>
                    <h2>📋 Registros del Bot</h2>
                    <div id="logs">
                        ${this.logs.map(log => `
                            <div class="log-entry ${log.type}">
                                <span class="timestamp">[${log.timestamp}]</span> ${log.message}
                            </div>
                        `).join('')}
                    </div>
                    <script>
                        setInterval(() => location.reload(), 5000);
                    </script>
                </body>
                </html>
            `;
            res.send(logsHtml);
        });
        
        // API para estado del bot
        this.app.get('/api/status', (req, res) => {
            res.json({
                connected: this.isConnected,
                hasQR: !!this.qrData,
                uptime: Math.floor((Date.now() - this.stats.startTime) / 1000),
                stats: this.stats
            });
        });
        
        // API para enviar mensajes
        this.app.post('/api/send-message', async (req, res) => {
            try {
                if (!this.isConnected) {
                    return res.json({
                        success: false,
                        error: 'Bot no está conectado a WhatsApp'
                    });
                }
                
                const { phoneNumber, message } = req.body;
                
                if (!phoneNumber || !message) {
                    return res.json({
                        success: false,
                        error: 'Número de teléfono y mensaje son requeridos'
                    });
                }
                
                // Validar formato del número
                const cleanNumber = phoneNumber.replace(/\D/g, '');
                if (cleanNumber.length < 10 || cleanNumber.length > 15) {
                    return res.json({
                        success: false,
                        error: 'El número de teléfono debe tener entre 10 y 15 dígitos'
                    });
                }
                
                // Enviar el mensaje a través del callback
                if (this.sendMessageCallback) {
                    const success = await this.sendMessageCallback(phoneNumber, message);
                    
                    if (success) {
                        this.addLog('success', `📤 Mensaje enviado a ${phoneNumber}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
                        res.json({
                            success: true,
                            message: 'Mensaje enviado exitosamente'
                        });
                    } else {
                        this.addLog('error', `❌ Error enviando mensaje a ${phoneNumber}`);
                        res.json({
                            success: false,
                            error: 'Error al enviar el mensaje'
                        });
                    }
                } else {
                    res.json({
                        success: false,
                        error: 'Servicio de mensajería no disponible'
                    });
                }
                
            } catch (error) {
                console.error('Error en API send-message:', error);
                this.addLog('error', `❌ Error en API send-message: ${error.message}`);
                res.json({
                    success: false,
                    error: 'Error interno del servidor'
                });
            }
        });
        
        // API REST para enviar mensajes (para Postman/aplicaciones externas)
        this.app.post('/api/whatsapp/send', async (req, res) => {
            try {
                const { phoneNumber, message } = req.body;
                
                // Validaciones básicas
                if (!phoneNumber) {
                    return res.status(400).json({
                        success: false,
                        error: 'phoneNumber es requerido',
                        code: 'MISSING_PHONE_NUMBER'
                    });
                }
                
                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'message es requerido',
                        code: 'MISSING_MESSAGE'
                    });
                }
                
                // Validar que el bot esté conectado
                if (!this.isConnected) {
                    return res.status(503).json({
                        success: false,
                        error: 'Bot de WhatsApp no está conectado',
                        code: 'BOT_NOT_CONNECTED'
                    });
                }
                
                // Validar formato del número
                const phoneRegex = /^\+?[1-9]\d{8,14}$/;
                if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
                    return res.status(400).json({
                        success: false,
                        error: 'Formato de número de teléfono inválido. Use formato internacional: +573001234567',
                        code: 'INVALID_PHONE_FORMAT'
                    });
                }
                
                // Validar longitud del mensaje
                if (message.length > 4096) {
                    return res.status(400).json({
                        success: false,
                        error: 'El mensaje es demasiado largo. Máximo 4096 caracteres.',
                        code: 'MESSAGE_TOO_LONG'
                    });
                }
                
                // Intentar enviar el mensaje
                if (this.sendMessageCallback) {
                    const success = await this.sendMessageCallback(phoneNumber, message);
                    
                    if (success) {
                        this.addLog('success', `📤 API: Mensaje enviado a ${phoneNumber}`);
                        
                        res.status(200).json({
                            success: true,
                            message: 'Mensaje enviado exitosamente',
                            data: {
                                phoneNumber: phoneNumber,
                                messageLength: message.length,
                                timestamp: new Date().toISOString()
                            }
                        });
                    } else {
                        this.addLog('error', `❌ API: Error enviando mensaje a ${phoneNumber}`);
                        
                        res.status(500).json({
                            success: false,
                            error: 'Error al enviar el mensaje a WhatsApp',
                            code: 'WHATSAPP_SEND_ERROR'
                        });
                    }
                } else {
                    res.status(503).json({
                        success: false,
                        error: 'Servicio de mensajería no disponible',
                        code: 'MESSAGE_SERVICE_UNAVAILABLE'
                    });
                }
                
            } catch (error) {
                console.error('Error en API /api/whatsapp/send:', error);
                this.addLog('error', `❌ API Error: ${error.message}`);
                
                res.status(500).json({
                    success: false,
                    error: 'Error interno del servidor',
                    code: 'INTERNAL_SERVER_ERROR',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });
        
        // API para obtener información de la API (documentación)
        this.app.get('/api/whatsapp/info', (req, res) => {
            res.json({
                name: 'WhatsApp AI Bot API',
                version: '1.0.0',
                status: this.isConnected ? 'connected' : 'disconnected',
                endpoints: {
                    send: {
                        method: 'POST',
                        url: '/api/whatsapp/send',
                        description: 'Envía un mensaje de WhatsApp',
                        parameters: {
                            phoneNumber: 'string - Número de teléfono con código de país (+573001234567)',
                            message: 'string - Mensaje a enviar (máximo 4096 caracteres)'
                        },
                        example: {
                            phoneNumber: '+573001234567',
                            message: 'Hola, este es un mensaje de prueba desde la API!'
                        }
                    },
                    info: {
                        method: 'GET',
                        url: '/api/whatsapp/info',
                        description: 'Información de la API y estado del bot'
                    },
                    status: {
                        method: 'GET',
                        url: '/api/status',
                        description: 'Estado detallado del bot y estadísticas'
                    }
                },
                usage: {
                    curl: 'curl -X POST http://localhost:3000/api/whatsapp/send -H "Content-Type: application/json" -d \'{"phoneNumber":"+573001234567","message":"Hola desde la API!"}\'',
                    postman: 'POST http://localhost:3000/api/whatsapp/send con body JSON'
                }
            });
        });
    }
    
    // Métodos para actualizar desde el bot principal
    updateQR(qrData) {
        this.qrData = qrData;
        this.isConnected = false;
        this.addLog('info', `📱 Nuevo código QR generado`);
    }
    
    setConnected(connected) {
        this.isConnected = connected;
        const status = connected ? 'conectado' : 'desconectado';
        this.addLog(connected ? 'success' : 'error', `🔗 WhatsApp ${status}`);
        
        if (connected) {
            this.qrData = null; // Limpiar QR cuando se conecta
        }
    }
    
    updateStats(newStats) {
        this.stats = { ...this.stats, ...newStats };
    }
    
    incrementMessage() {
        this.stats.messages++;
    }
    
    updateConversations(count) {
        this.stats.conversations = count;
    }
    
    setSendMessageCallback(callback) {
        this.sendMessageCallback = callback;
    }
    
    addLog(type, message) {
        const timestamp = new Date().toLocaleString('es-ES', {
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        this.logs.push({
            type,
            message,
            timestamp
        });
        
        // Mantener solo los últimos 100 logs
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(-100);
        }
        
        console.log(`[${timestamp}] ${message}`);
    }
    
    start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`🌐 Servidor web iniciado en http://localhost:${this.port}`);
                this.addLog('success', `🌐 Servidor web iniciado en puerto ${this.port}`);
                resolve();
            });
        });
    }
    
    stop() {
        if (this.server) {
            this.server.close();
            this.addLog('info', '🌐 Servidor web detenido');
        }
    }
}

export default WebServer;
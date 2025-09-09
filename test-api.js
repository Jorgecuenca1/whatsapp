import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Simular estado del bot
let botConnected = false;

// API REST para enviar mensajes (para Postman/aplicaciones externas)
app.post('/api/whatsapp/send', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        console.log('📤 API Request recibido:', { phoneNumber, message });
        
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
        
        // Simular envío de mensaje
        console.log(`📤 Enviando mensaje a ${phoneNumber}: ${message}`);
        
        res.status(200).json({
            success: true,
            message: 'Mensaje enviado exitosamente (SIMULADO)',
            data: {
                phoneNumber: phoneNumber,
                messageLength: message.length,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error en API /api/whatsapp/send:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

// API para obtener información de la API (documentación)
app.get('/api/whatsapp/info', (req, res) => {
    res.json({
        name: 'WhatsApp AI Bot API - Test Server',
        version: '1.0.0-test',
        status: 'test-mode',
        endpoints: {
            send: {
                method: 'POST',
                url: '/api/whatsapp/send',
                description: 'Envía un mensaje de WhatsApp (simulado)',
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
            }
        },
        usage: {
            curl: `curl -X POST http://localhost:${port}/api/whatsapp/send -H "Content-Type: application/json" -d '{"phoneNumber":"+573001234567","message":"Hola desde la API!"}'`,
            postman: `POST http://localhost:${port}/api/whatsapp/send con body JSON`
        }
    });
});

app.listen(port, () => {
    console.log(`🧪 Servidor de prueba API iniciado en http://localhost:${port}`);
    console.log(`📖 Documentación en: http://localhost:${port}/api/whatsapp/info`);
    console.log(`📤 Endpoint de envío: http://localhost:${port}/api/whatsapp/send`);
});
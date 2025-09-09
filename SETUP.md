# 🤖 WhatsApp AI Bot - Guía de Configuración

Esta guía te ayudará a configurar y ejecutar el bot de WhatsApp con respuestas automáticas de IA local.

## 📋 Requisitos Previos

### 1. Node.js
- **Versión mínima**: Node.js 17+
- **Descarga**: https://nodejs.org/
- **Verificar instalación**: `node --version`

### 2. Sistema Operativo
- Windows 10/11, macOS, o Linux
- Al menos 4GB de RAM libre
- 10GB de espacio en disco

## 🔧 Instalación Paso a Paso

### 1. Clonar/Descargar el Proyecto
```bash
# Si usas Git
git clone <url-del-repositorio>
cd whatsapp

# O descomprime el archivo ZIP en una carpeta
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
```bash
# Copia el archivo de ejemplo
copy .env.example .env

# Edita el archivo .env con tus configuraciones
notepad .env
```

## 🧠 Configuración de IA Local

### Opción 1: Ollama (Recomendado)

#### Instalar Ollama
1. **Descargar Ollama**:
   - Windows: https://ollama.ai/download/windows
   - macOS: https://ollama.ai/download/mac
   - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`

2. **Instalar un modelo de IA**:
```bash
# Modelo pequeño y rápido (recomendado para empezar)
ollama pull llama2

# Otros modelos disponibles:
ollama pull mistral        # Más inteligente pero más pesado
ollama pull codellama      # Especializado en programación
ollama pull llama2:7b      # Versión específica
```

3. **Verificar instalación**:
```bash
# Debe mostrar los modelos instalados
ollama list

# Probar el modelo
ollama run llama2 "Hola, ¿cómo estás?"
```

4. **Configurar en el bot**:
```javascript
// En config.js, asegúrate de que esté configurado:
ai: {
    provider: 'ollama',
    providers: {
        ollama: {
            enabled: true,
            url: 'http://localhost:11434',
            model: 'llama2', // El modelo que instalaste
        }
    }
}
```

### Opción 2: LM Studio

1. **Descargar LM Studio**: https://lmstudio.ai/
2. **Instalar y ejecutar**
3. **Descargar un modelo** desde la interfaz
4. **Iniciar el servidor local**
5. **Configurar en config.js**:
```javascript
ai: {
    provider: 'lmstudio',
    providers: {
        lmstudio: {
            enabled: true,
            url: 'http://localhost:1234',
        }
    }
}
```

## 🚀 Ejecutar el Bot

### 1. Iniciar el Bot
```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

### 2. Conectar WhatsApp
1. **Ejecuta el bot** y espera a que aparezca el código QR
2. **Abre WhatsApp** en tu teléfono
3. **Ve a Configuración** → **Dispositivos vinculados**
4. **Toca "Vincular un dispositivo"**
5. **Escanea el código QR** que aparece en la consola

### 3. Verificar Conexión
- Deberías ver el mensaje: `✅ Bot conectado exitosamente a WhatsApp!`
- El bot ahora puede recibir y responder mensajes

## 🎮 Comandos del Bot

### Comandos Administrativos
- `/status` - Ver estado del bot
- `/broadcast <mensaje>` - Enviar mensaje a todos los contactos
- `/contacts` - Ver conversaciones activas

### Uso Normal
- Envía cualquier mensaje al bot y recibirás una respuesta automática
- El bot mantiene contexto de la conversación
- Solo responde a mensajes privados (no grupos por defecto)

## ⚙️ Configuración Avanzada

### Personalizar la Personalidad del Bot
Edita `config.js`:
```javascript
ai: {
    personality: 'helpful', // 'helpful', 'casual', 'professional', 'funny'
}
```

### Cambiar Proveedor de IA
```javascript
ai: {
    provider: 'ollama', // Cambiar a 'lmstudio', 'openai', 'gemini'
}
```

### Configurar Respuestas a Grupos
```javascript
bot: {
    respondToGroups: true, // Cambiar a true para responder en grupos
}
```

## 🔍 Solución de Problemas

### Error: "Bot no está listo"
- Asegúrate de que WhatsApp esté conectado correctamente
- Revisa que el código QR se haya escaneado

### Error: "Ollama API error"
- Verifica que Ollama esté ejecutándose: `ollama --version`
- Confirma que el modelo esté instalado: `ollama list`
- Revisa la URL en config.js

### Error: "Cannot find module"
- Ejecuta `npm install` para instalar dependencias
- Verifica que estés usando Node.js 17+

### El bot no responde
- Revisa los logs en la consola
- Verifica la configuración de IA en `config.js`
- Prueba el comando `/status` para verificar que funcione

### Problemas de rendimiento
- Usa un modelo más pequeño (llama2 en lugar de mistral)
- Reduce `maxMessagesPerConversation` en config.js
- Deshabilita el cache si tienes poca RAM

## 📊 Monitoreo

### Ver Estadísticas
- `/status` - Estado general del bot
- Logs en tiempo real en la consola
- Archivo `conversations.json` con historial

### Archivos Importantes
- `auth_info/` - Datos de autenticación de WhatsApp (no borrar)
- `conversations.json` - Historial de conversaciones
- `config.js` - Configuración del bot

## 🔒 Seguridad y Privacidad

### Datos Locales
- Toda la IA corre localmente (con Ollama/LM Studio)
- No se envían datos a servicios externos
- Las conversaciones se guardan solo en tu computadora

### Recomendaciones
- No compartas la carpeta `auth_info/`
- Usa variables de entorno para API keys
- Actualiza regularmente las dependencias

## 🆘 Soporte

Si tienes problemas:
1. Revisa esta guía completa
2. Verifica los logs de error en la consola
3. Comprueba que todos los requisitos estén instalados
4. Reinicia el bot y vuelve a escanear el QR si es necesario

¡Disfruta de tu bot de WhatsApp con IA local! 🎉
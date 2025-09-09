# 📦 GUÍA DE DESPLIEGUE - WhatsApp Bot con Docker

## 📋 **PASO A PASO PARA DESPLEGAR EN TU SERVIDOR**

### **1️⃣ PREPARACIÓN LOCAL**

#### Archivos necesarios:
```
whatsapp/
├── simple-bot.js          # Bot principal
├── package.json           # Dependencias
├── package-lock.json      # Lock de dependencias
├── Dockerfile            # Configuración Docker
├── docker-compose.yml    # Orquestación
├── nginx.conf           # Proxy reverso
├── .env.production      # Variables de entorno
├── .dockerignore        # Archivos a ignorar
└── public/              # Interfaz web
    └── index.html
```

### **2️⃣ PREPARAR TU SERVIDOR**

#### Requisitos del servidor:
- **Sistema Operativo:** Ubuntu 20.04/22.04 o CentOS 8+
- **RAM:** Mínimo 2GB (recomendado 4GB)
- **CPU:** 2 cores mínimo
- **Disco:** 20GB libres
- **Puerto:** 3002 (o 80/443 con nginx)

#### Instalar Docker y Docker Compose:
```bash
# En Ubuntu/Debian:
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker

# En CentOS/RHEL:
sudo yum install docker docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
```

### **3️⃣ SUBIR ARCHIVOS AL SERVIDOR**

#### Opción A: Con Git
```bash
# En tu servidor:
cd /opt
git clone https://github.com/tu-usuario/whatsapp-bot.git
cd whatsapp-bot
```

#### Opción B: Con SCP desde tu PC
```bash
# Desde tu PC Windows (Git Bash):
scp -r C:/Users/HOME/PycharmProjects/whatsapp/* usuario@tu-servidor:/opt/whatsapp-bot/
```

#### Opción C: Con ZIP
```bash
# En tu PC - Crear ZIP:
# (Comprimir la carpeta whatsapp)

# Subir al servidor:
scp whatsapp.zip usuario@tu-servidor:/tmp/

# En el servidor:
cd /opt
unzip /tmp/whatsapp.zip
mv whatsapp whatsapp-bot
cd whatsapp-bot
```

### **4️⃣ CONFIGURACIÓN EN EL SERVIDOR**

```bash
# Ir al directorio del proyecto
cd /opt/whatsapp-bot

# Editar configuración de producción
nano .env.production

# Cambiar permisos
chmod 755 simple-bot.js
chmod -R 755 public/

# Crear directorios necesarios
mkdir -p auth_info conversations ssl
```

### **5️⃣ CONFIGURAR DOMINIO (Opcional)**

Si tienes un dominio:
```bash
# Editar nginx.conf
nano nginx.conf
# Cambiar "tu-dominio.com" por tu dominio real
```

### **6️⃣ CONSTRUIR Y EJECUTAR CON DOCKER**

#### Construcción inicial:
```bash
# Construir imagen
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f whatsapp-bot
```

### **7️⃣ PRIMER ESCANEO DE QR**

```bash
# Ver el QR en consola:
docker-compose logs whatsapp-bot

# O acceder por web:
# http://tu-servidor:3002
# http://tu-dominio.com (si configuraste nginx)
```

### **8️⃣ COMANDOS ÚTILES DE DOCKER**

```bash
# Ver estado
docker-compose ps

# Detener
docker-compose stop

# Iniciar
docker-compose start

# Reiniciar
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f

# Entrar al contenedor
docker exec -it whatsapp-ai-bot sh

# Actualizar código
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### **9️⃣ CONFIGURAR INICIO AUTOMÁTICO**

```bash
# Crear servicio systemd
sudo nano /etc/systemd/system/whatsapp-bot.service
```

Contenido del servicio:
```ini
[Unit]
Description=WhatsApp Bot Docker
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/whatsapp-bot
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Activar servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-bot
sudo systemctl start whatsapp-bot
```

### **🔟 MONITOREO Y MANTENIMIENTO**

#### Ver estadísticas:
```bash
# Uso de recursos
docker stats whatsapp-ai-bot

# Espacio en disco
docker system df

# Limpiar imágenes no usadas
docker system prune -a
```

#### Backup de datos:
```bash
# Hacer backup de autenticación y conversaciones
tar -czf backup-$(date +%Y%m%d).tar.gz auth_info/ conversations/

# Restaurar backup
tar -xzf backup-20240908.tar.gz
```

### **🔒 CONFIGURAR SSL (HTTPS)**

#### Opción 1: Con Let's Encrypt
```bash
# Instalar certbot
sudo apt install certbot -y

# Generar certificado
sudo certbot certonly --standalone -d tu-dominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem /opt/whatsapp-bot/ssl/cert.pem
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem /opt/whatsapp-bot/ssl/key.pem

# Descomentar configuración SSL en nginx.conf
# Reiniciar servicios
docker-compose restart nginx
```

### **📊 ENDPOINTS DE LA API**

Una vez desplegado, tendrás disponible:

- **Interfaz Web:** `http://tu-servidor:3002`
- **API Status:** `http://tu-servidor:3002/api/status`
- **API Send:** `POST http://tu-servidor:3002/api/whatsapp/send`
- **API Info:** `http://tu-servidor:3002/api/whatsapp/info`
- **Toggle Auto-Response:** `POST http://tu-servidor:3002/api/toggle-auto-response`

### **🚨 SOLUCIÓN DE PROBLEMAS**

#### Error: Puerto en uso
```bash
# Ver qué usa el puerto
sudo netstat -tlnp | grep 3002
# Matar proceso si es necesario
sudo kill -9 <PID>
```

#### Error: Sin permisos Docker
```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar
```

#### Error: QR no se genera
```bash
# Limpiar autenticación
docker-compose down
rm -rf auth_info/*
docker-compose up -d
```

### **✅ VERIFICACIÓN FINAL**

1. Accede a `http://tu-servidor:3002`
2. Escanea el código QR
3. Prueba enviar un mensaje desde la interfaz
4. Prueba la API con curl:
```bash
curl -X POST http://tu-servidor:3002/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+573001234567","message":"Hola desde servidor!"}'
```

### **📝 NOTAS IMPORTANTES**

- **Seguridad:** Cambia los puertos por defecto si es posible
- **Firewall:** Abre solo los puertos necesarios (3002, 80, 443)
- **Backup:** Realiza backups regulares de `auth_info/` y `conversations/`
- **Monitoreo:** Configura alertas para caídas del servicio
- **Actualizaciones:** Mantén Docker y las dependencias actualizadas

---

## 🎉 **¡LISTO! Tu bot está en producción**

Si tienes problemas, revisa los logs con:
```bash
docker-compose logs -f --tail=100
```
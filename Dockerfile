# Usar imagen oficial de Node.js
FROM node:18-alpine

# Instalar dependencias del sistema necesarias para Puppeteer/Chrome
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Establecer variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Crear directorios necesarios
RUN mkdir -p auth_info conversations public

# Exponer puerto
EXPOSE 3002

# Comando para iniciar la aplicación
CMD ["node", "simple-bot.js"]
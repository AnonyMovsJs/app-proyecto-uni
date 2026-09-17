# Etapa 1: Build de la app Angular
FROM node:20-alpine AS build
WORKDIR /app

# Copiar paquetes e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código fuente y compilar para producción
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servir con Nginx Alpine ligero
FROM nginx:alpine
# Copiar el build compilado al directorio web de Nginx
COPY --from=build /app/dist/app-proyecto-uni/browser /usr/share/nginx/html

# Copiar configuración personalizada para Angular SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Cliente Web - Sistema de Gestión de Ventas, Créditos y Chatbot con IA

Este proyecto es la aplicación cliente (frontend) construida con **Angular 19**. Funciona como la interfaz de usuario para el sistema de ventas, créditos y notificaciones, interactuando directamente con la API REST del backend de Spring Boot.

Diseñado con un enfoque modular, brinda paneles interactivos con diseño responsivo para administradores y clientes.

---

## 🚀 Características del Frontend

*   **Autenticación de Dos Factores (2FA):** Flujo de login seguro con validación de credenciales (JWT) y verificación posterior mediante código SMS enviado por Twilio.
*   **Panel de Administración (Admin Dashboard):**
    *   Registro y administración de usuarios.
    *   Gestión de ventas y planes de crédito automáticos.
    *   Visualización de amortizaciones y control de cuotas.
*   **Panel de Clientes (Client Dashboard):**
    *   Seguimiento en tiempo real de compras realizadas.
    *   Estado de créditos y calendario de vencimientos de cuotas.
    *   Simulación y registro de pagos.
*   **Interfaz de Chatbot Integrada:** Un widget de chat flotante en tiempo real que se conecta con la IA para soporte dinámico al usuario.
*   **Descarga de Reportes PDF:** Módulos dedicados para descargar comprobantes de venta, de pagos y reportes generales generados por el servidor.
*   **Seguridad en el Cliente:**
    *   **Guards:** Protección de rutas según el rol (Admin/Cliente).
    *   **Interceptor de Tokens:** Adjunta automáticamente el token JWT en las cabeceras de cada petición HTTP.

---

## 🛠️ Tecnologías y Librerías

*   **Framework Principal:** Angular 19.2.3
*   **Lenguaje:** TypeScript / HTML5 / CSS3
*   **Comunicación HTTP:** Angular HttpClient (con interceptores y reactividad basada en RxJS)
*   **Gestor de Paquetes:** npm

---

## 📂 Estructura del Proyecto

El código fuente principal está organizado bajo `src/app`:

```text
├── auth/                 # Componente de Login y autenticación inicial
├── business/             # Vistas de negocio organizadas por rol
│   ├── admin/            # Dashboards de administración, ventas y créditos
│   ├── cliente/          # Dashboards de cliente, compras, cuotas y pagos
│   └── profile/          # Vista y edición del perfil del usuario
├── chatbot/              # Componente y diseño de la interfaz del Chatbot de IA
├── guards/               # Guardianes de ruta para restringir acceso no autorizado
├── interceptors/         # Interceptor para inyección del token Bearer JWT
├── shared/               # Componentes compartidos, interfaces y servicios API
│   ├── models/           # Interfaces y modelos TypeScript (User, Venta, Pago, etc.)
│   └── services/         # Servicios de Angular para consumo de APIs REST
└── verify-sms/           # Pantalla de verificación de segundo factor de seguridad
```

---

## ⚙️ Configuración y Ejecución Local

### 1. Requisitos previos
Es necesario tener instalado **Node.js** (versión v18 o superior recomendada) y **Angular CLI**.

### 2. Instalar dependencias
Ubicado en la raíz del proyecto frontend, instalá las dependencias necesarias:
```bash
npm install
```

### 3. Levantar el servidor de desarrollo
Para iniciar la aplicación localmente en modo desarrollo, ejecutá:
```bash
ng serve
```
Una vez levantado, ingresá desde tu navegador a: `http://localhost:4200/`.

---


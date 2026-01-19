# Lavaseco Orquideas - Sistema de Gestión Premium

Sistema completo de gestión para lavandería con arquitectura offline-first, diseñado para ofrecer una experiencia premium y sin interrupciones.

## 🚀 Características Principales

### ✨ Módulos Implementados

- **Recepción Rápida** - Creación express de facturas en mostrador
- **Facturación Completa** - Sistema avanzado con pagos, abonos y notas
- **Logística - Organizar Entrada** - Verificación item por item con alertas de urgencia
- **Logística - Prendas Faltantes** - Gestión de items pendientes de recibir
- **Entrega** - Finalización del servicio y entrega al cliente

### 🔥 Tecnologías

- **Next.js 16** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS 4** - Estilos modernos y responsivos
- **Framer Motion** - Animaciones fluidas
- **Dexie.js** - Base de datos local (IndexedDB)
- **Supabase** - Backend y sincronización en la nube
- **jsPDF** - Generación de PDFs

### 💎 Características Técnicas

- ✅ **Offline-First** - Funciona sin internet, sincroniza automáticamente
- ✅ **Dual PDF** - Ticket 80mm (térmicas) y Carta (estándar)
- ✅ **Item Tracking** - Seguimiento granular de cada prenda
- ✅ **Smart Alerts** - Sistema inteligente de alertas por urgencia
- ✅ **Auto-Save** - Guardado automático de borradores
- ✅ **Activity Logs** - Historial completo de acciones

## 📦 Instalación

### Requisitos Previos

- Node.js 18+ 
- npm o pnpm
- Cuenta de Supabase (para sincronización)

### Pasos

1. **Clonar el repositorio**
```bash
git clone [url-del-repo]
cd lavaseco-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear archivo `.env` con:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# Database
DATABASE_URL="file:./dev.db"

# Opcional: APIs adicionales
OPENAI_API_KEY=tu_api_key_opcional
```

4. **Inicializar base de datos**
```bash
npx prisma generate
npx prisma db push
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🎯 Uso Rápido

### Flujo Completo

1. **Recepción** (`/dashboard/reception`)
   - Crear factura rápida con datos del cliente
   - Agregar prendas con cantidades y precios
   - Definir fecha de entrega
   - Generar PDF automáticamente

2. **Organizar Entrada** (`/dashboard/logistics/organize`)
   - Revisar facturas pendientes
   - Marcar cada prenda como "Recibido" o "Falta"
   - Completar revisión cuando todo esté listo

3. **Prendas Faltantes** (`/dashboard/logistics/missing`)
   - Ver items que no llegaron
   - Marcar como "Ya llegó" cuando aparezcan

4. **Entrega** (`/dashboard/delivery`)
   - Ver prendas listas para entregar
   - Registrar pagos finales si hay saldo
   - Entregar al cliente

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Desarrollo con Turbo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linter
```

### Script de Inicio Rápido (Windows)

Ejecutar `iniciar.bat` para:
- Abrir navegador automáticamente
- Iniciar servidor de desarrollo
- Ver logs en consola

## 📁 Estructura del Proyecto

```
lavaseco-app/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── reception/        # Módulo de recepción
│   │   │   ├── billing-a/        # Facturación completa
│   │   │   ├── logistics/        # Logística
│   │   │   │   ├── organize/     # Organizar entrada
│   │   │   │   └── missing/      # Prendas faltantes
│   │   │   └── delivery/         # Entrega
│   │   └── login/                # Autenticación
│   ├── components/
│   │   ├── billing/              # Componentes de facturación
│   │   ├── dashboard/            # Componentes del dashboard
│   │   └── ui/                   # Componentes UI base
│   ├── hooks/
│   │   ├── useInvoices.ts        # Hook principal de facturas
│   │   ├── useInvoiceSync.ts     # Sincronización offline
│   │   └── useDebounce.ts        # Utilidades
│   ├── lib/
│   │   ├── actions/              # Server actions
│   │   ├── billing/              # Lógica de negocio
│   │   └── pdfGenerator.ts       # Generación de PDFs
│   └── prisma/
│       └── schema.prisma         # Esquema de base de datos
├── public/                       # Assets estáticos
├── iniciar.bat                   # Script de inicio (Windows)
└── package.json
```

## 🔐 Autenticación

El sistema incluye autenticación básica:

- **Usuario:** Configurado en Supabase
- **Contraseña:** Configurada en Supabase

Para desarrollo local, puedes usar el modo de prueba o configurar usuarios en Supabase.

## 📊 Base de Datos

### Modelos Principales

- **User** - Usuarios del sistema
- **Order** (Invoice) - Facturas/Órdenes
- **OrderItem** - Items de cada factura
- **Client** - Clientes
- **PaymentLog** - Historial de pagos

### Sincronización

El sistema usa una arquitectura híbrida:
- **Local:** Dexie.js (IndexedDB) para operación offline
- **Cloud:** Supabase para sincronización y backup
- **Sync:** Automático cada 60 segundos cuando hay conexión

## 🎨 Personalización

### Colores del Tema

Editar `tailwind.config.ts`:

```typescript
colors: {
  orchid: {
    50: '#faf5ff',
    100: '#f3e8ff',
    // ... más tonos
    900: '#581c87',
  }
}
```

### Logo

Reemplazar archivo en `public/logo.png`

## 🐛 Solución de Problemas

### Error: "Cannot find module 'prisma'"

```bash
npx prisma generate
```

### Error: "Supabase connection failed"

Verificar variables de entorno en `.env`

### PDFs no se generan

Verificar que jsPDF está instalado:
```bash
npm install jspdf jspdf-autotable
```

## 📝 Próximas Mejoras

- [ ] Tests automatizados (Jest + React Testing Library)
- [ ] Módulo de reportes y estadísticas
- [ ] Notificaciones push
- [ ] App móvil (PWA/React Native)
- [ ] Integración con pasarelas de pago
- [ ] Sistema de inventario

## 🤝 Contribuir

Este es un proyecto privado. Para contribuir, contactar al administrador.

## 📄 Licencia

Propietario: Lavaseco Orquideas
Todos los derechos reservados.

## 🆘 Soporte

Para soporte técnico, contactar a: [email de soporte]

---

**Versión:** 1.0.0
**Última actualización:** Enero 2026
**Desarrollado con ❤️ para Lavaseco Orquideas**

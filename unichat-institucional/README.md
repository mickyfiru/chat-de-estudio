# UniChat Institucional

Aplicación web de chat académico en tiempo real para estudiantes. Permite conversar por salas temáticas, ver compañeros conectados, compartir archivos, insertar emojis y conservar un historial local por sala.

## Objetivo

Integrar JavaScript avanzado en una experiencia completa: comunicación mediante WebSockets, manipulación del DOM, validación de formularios, eventos, bibliotecas externas, almacenamiento local y diseño responsivo.

## Tecnologías utilizadas

- HTML5, CSS3 y JavaScript puro
- Node.js y Express
- Socket.IO para comunicación bidireccional en tiempo real
- localStorage para el historial del navegador
- sessionStorage para recordar temporalmente el nombre del usuario

## Bibliotecas integradas

- **Toastify:** notificaciones visuales no intrusivas.
- **SweetAlert2:** alertas de validación claras y accesibles.
- **emoji-picker-element:** selector de emojis cargado desde CDN, con emojis rápidos de respaldo.
- **Socket.IO:** gestión de WebSockets, salas, reconexión y eventos.

## Funcionalidades principales

- Entrada con validación del nombre.
- Seis salas académicas independientes.
- Mensajes en tiempo real limitados a la sala activa.
- Cambio de sala con notificaciones de entrada y salida.
- Lista actualizada de usuarios conectados.
- Indicador “usuario está escribiendo”.
- Mensajes propios y ajenos con estilos diferenciados.
- Selector de emojis.
- Archivos e imágenes compartidos como datos temporales.
- Historial local independiente por sala.
- Buscador por texto, autor, archivo o sala.
- Scroll infinito en bloques de 20 mensajes.
- Notificaciones visuales y sonido.
- Interfaz profesional, accesible y responsiva.

## Estructura de carpetas

```text
unichat-institucional/
├── package.json
├── server.js
├── README.md
└── public/
    ├── index.html
    ├── css/
    │   └── styles.css
    ├── js/
    │   └── app.js
    └── assets/
        └── notification.mp3 (opcional)
```

## Instalación

Se requiere Node.js 18 o una versión posterior.

```bash
npm install
```

## Ejecución

```bash
npm start
```

Después, abrir:

```text
http://localhost:3000
```

Para desarrollo con reinicio automático:

```bash
npm run dev
```

## Cómo probar el chat en dos pestañas

1. Ejecutar el servidor.
2. Abrir `http://localhost:3000` en dos pestañas.
3. Entrar con nombres diferentes, por ejemplo “Camila” y “Diego”.
4. Seleccionar la misma sala y enviar mensajes.
5. Comprobar mensajes, indicador de escritura, usuarios conectados y archivos.
6. Cambiar una pestaña a otra sala y verificar que los mensajes ya no se mezclan.

## WebSockets y Socket.IO

WebSocket mantiene una conexión bidireccional abierta entre navegador y servidor. A diferencia de una petición HTTP tradicional, el servidor puede enviar información inmediatamente sin esperar una nueva consulta del cliente. Socket.IO simplifica esta comunicación con eventos, reconexión y salas. En este proyecto, cada conversación corresponde a una sala y el servidor emite los mensajes únicamente a sus integrantes.

## localStorage

`localStorage` conserva información en el navegador incluso después de recargar la página. UniChat guarda hasta 200 mensajes por sala con estas claves:

- `chatHistory_General`
- `chatHistory_ProgramacionWeb`
- `chatHistory_BaseDeDatos`
- `chatHistory_TrabajosYTareas`
- `chatHistory_AvisosAcademicos`
- `chatHistory_AyudaEstudiantil`

El historial es local: cada navegador conserva su propia copia. El servidor no utiliza base de datos.

## Sonido de notificación

El proyecto funciona sin un archivo de audio: genera un tono breve con Web Audio. Para personalizarlo, agrega un MP3 corto como `public/assets/notification.mp3` y cambia `NOTIFICATION_AUDIO_URL` a `"/assets/notification.mp3"` en `public/js/app.js`. Algunos navegadores bloquean sonido hasta que la persona interactúa con la página.

## Pruebas realizadas

- Validación de nombre vacío, espacios y menos de tres caracteres.
- Entrada y desconexión de usuarios.
- Mensajes entre dos clientes en la misma sala.
- Aislamiento de mensajes entre salas.
- Cambio de sala y actualización de presencia.
- Indicador de escritura y desaparición a los dos segundos.
- Envío de imágenes y otros archivos de hasta 1,5 MB.
- Persistencia y recuperación del historial por sala.
- Búsqueda con y sin resultados.
- Carga progresiva de mensajes en bloques de 20.
- Comportamiento responsivo de menú y panel de usuarios.

## Preguntas de cierre

### 1. ¿Qué desafíos enfrentaste durante el desarrollo y cómo los superaste?

El reto principal fue mantener sincronizados usuario, sala, presencia e historial sin duplicar eventos. Se centralizó el estado del usuario en el servidor, se validó cada evento y se identificó cada mensaje con un valor único. Para archivos se usó FileReader y se limitó el tamaño, evitando almacenamiento permanente y cargas excesivas.

### 2. ¿Cómo mejoró la integración de bibliotecas la experiencia?

SweetAlert2 convirtió errores de formulario en mensajes claros; Toastify permitió avisos sin interrumpir la conversación; el selector de emojis hizo la comunicación más expresiva; y Socket.IO resolvió salas, eventos y reconexiones con una API sencilla.

### 3. ¿Qué aprendiste sobre la comunicación en tiempo real?

La comunicación en tiempo real exige pensar en eventos y estado compartido: quién está conectado, dónde está y quién debe recibir cada dato. El mismo modelo puede utilizarse en colaboración de documentos, seguimiento de pedidos, paneles en vivo, videojuegos o sistemas de soporte.

### 4. ¿Cómo contribuyeron la planificación y la documentación?

Separar backend, interfaz, eventos y almacenamiento evitó mezclar responsabilidades. Definir nombres de eventos y estructura de datos antes de programar hizo más simple probar dos clientes y localizar errores. El README permite instalar, ejecutar y evaluar el proyecto sin depender de explicaciones externas.

### 5. ¿Qué mejoras se podrían implementar?

Se podrían agregar autenticación universitaria, base de datos, mensajes privados, permisos para docentes, carga real de archivos, cifrado, moderación, confirmaciones de lectura, edición de mensajes, pruebas automatizadas y despliegue con HTTPS.

## Consideraciones

- Los usuarios conectados se guardan temporalmente en memoria.
- Los archivos no se almacenan en el servidor.
- Debido a los límites de localStorage, los archivos se restringen a 1,5 MB.
- Las bibliotecas visuales se cargan desde CDN; existe un respaldo básico para validaciones y emojis.

# EPN Clicker

Juego de estrategia / clicker para reconstruir el campus de la Universidad Politécnica.

## Guía de ejecución

### Requisitos
- Node.js instalado (versión 18+ recomendada)
- Conexión a internet para instalar dependencias

### Instalación
1. Abre una terminal en la carpeta del proyecto `c:\AplicacionesWeb\JS-NODE\ProyectoJuego`
2. Ejecuta:
```bash
npm install
```

### Ejecutar en desarrollo
```bash
npm run dev
```

Luego abre el enlace que muestre Vite en el navegador (normalmente `http://localhost:5173`).

### Empaquetar para producción
```bash
npm run build
```

### Vista previa de producción
```bash
npm run preview
```

## Controles

- `Clic` sobre elementos del campus y de la UI para interactuar.
- Arrastra edificios desde la paleta del panel lateral hacia el campus para colocarlos.
- `W`, `A`, `S`, `D` o las flechas del teclado para mover la cámara.
- `Rodar la rueda del ratón` para hacer zoom dentro y fuera.
- Botón `Pausar` en la interfaz para pausar/reanudar el juego.
- Botón `💾 Guardar` para guardar el progreso manualmente.
- Botón `↺` para reiniciar la partida y borrar el guardado actual.

## Estructura del proyecto

- `index.html` - Página principal que carga el juego.
- `package.json` - Dependencias y comandos de npm.
- `src/main.js` - Configuración de Phaser y lanzamiento del juego.

### Carpeta `src`
- `data/` - Datos de economía, edificios, misiones, quiz y puntos de colocación.
- `managers/` - Lógica de eventos, guardado, misiones y estado del juego.
- `objects/` - Clases para objetos de juego como `StudentManager`.
- `scenes/` - Escenas principales del juego:
  - `BootScene.js`
  - `MenuScene.js`
  - `GameScene.js`
  - `UIScene.js`
  - `DialogueScene.js`
- `ui/` - Interfaz de tutorial y popups.
- `utils/` - Utilidades auxiliares como formato de números.

### Carpeta `public/`
- Recursos estáticos como audio, imágenes y otros datos necesarios en tiempo de ejecución.

## Créditos

Integrantes:
- Kevin Palacios
- Francisco Villalba
- Carlos Troya

---

_Disfruta reconstruyendo el campus y optimizando tu producción en EPN Clicker._

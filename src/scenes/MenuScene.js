import Phaser from "phaser";

// Escena inicial del juego. Aquí el jugador puede iniciar la partida.
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu"); // Identificador único de esta escena.
  }

  create() {
    const { width, height } = this.scale;

    // Fondo de la pantalla de menú.
    this.cameras.main.setBackgroundColor(0x121212);
    this.add.rectangle(width / 2, height / 2, 640, 320, 0x1e2430, 0.95).setStrokeStyle(2, 0xffffff, 0.12);

    // Título principal del juego.
    this.add.text(width / 2, height / 2 - 80, "EPN Clicker", {
      fontFamily: "Arial",
      fontSize: "56px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Texto descriptivo debajo del título.
    this.add.text(width / 2, height / 2 - 20, "Construye tu primer edificio y reclama monedas", {
      fontSize: "20px",
      color: "#d0d7ff"
    }).setOrigin(0.5);

    // Botón de inicio.
    const startButton = this.add.rectangle(width / 2, height / 2 + 80, 240, 64, 0x5c79ff).setInteractive({ cursor: "pointer" });
    const startText = this.add.text(width / 2, height / 2 + 80, "Comenzar", {
      fontSize: "26px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Al hacer clic en el botón o texto se inicia la escena del juego.
    startButton.on("pointerdown", () => this.scene.start("game"));
    startText.on("pointerdown", () => this.scene.start("game"));
  }
}

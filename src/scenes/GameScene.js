import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
    this.worldObjects = [];
    this.uiObjects = [];
    this.playerCoins = 0;
    this.placedBuilding = null;
    this.sidebarOpen = false;
    this.sidebarWidth = 290;

    this.worldWidth = 3000;
    this.worldHeight = 2200;
  }

  preload() {
    this.load.image(
      "campusMap",
      new URL("../assets/MapaCampus.png", import.meta.url).href,
    );

    this.load.image(
      "building",
      new URL("../assets/SistemasEdificio.png", import.meta.url).href,
    );
  }

  create() {
    const { width, height } = this.scale;

    // Configuración de cámaras
    this.cameras.main.setBackgroundColor(0x10131c);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);

    // Posición inicial de cámara
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;

    // Crear secciones
    this.createCampusWorld();
    this.createHUD();
    this.createSidebar();
    this.createCameraControls();

    this.updateUpgradeText();

    this.scale.on("resize", this.resizeLayout, this);
  }

  // =========================
  // C. MUNDO / CAMPUS
  // =========================
  createCampusWorld() {
    this.dropSpotX = 1500;
    this.dropSpotY = 1010;
    this.dropSpotPoints = [
      { x: this.dropSpotX, y: this.dropSpotY - 145 },
      { x: this.dropSpotX + 230, y: this.dropSpotY },
      { x: this.dropSpotX, y: this.dropSpotY + 145 },
      { x: this.dropSpotX - 230, y: this.dropSpotY },
    ];

    // Fondo del campus
    this.addWorldObject(
      this.add
        .image(this.worldWidth / 2, this.worldHeight / 2, "campusMap")
        .setDisplaySize(this.worldWidth, this.worldHeight),
    );

    // Zonas decorativas
    // Zona válida para construir
    this.dropSpot = this.addWorldObject(this.add.graphics());
    this.drawDropSpot(false);

    this.dropSpotText = this.addWorldObject(
      this.add
        .text(this.dropSpotX, this.dropSpotY, "Construir aquí", {
          fontSize: "22px",
          color: "#d6e0ff",
          fontFamily: "Arial",
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5),
    );
  }

  // =========================
  // A. HUD SUPERIOR
  // =========================
  createHUD() {
    const { width } = this.scale;

    this.hud = this.add.container(0, 0);
    this.hud.setScrollFactor(0);

    const bg = this.add.rectangle(width / 2, 45, width, 90, 0x232b41, 0.97);
    this.addUIObject(bg);

    this.coinsText = this.add.text(30, 25, "Monedas: 0", {
      fontSize: "24px",
      color: "#f5f5f5",
      fontFamily: "Arial",
      fontStyle: "bold",
    });
    this.addUIObject(this.coinsText);

    this.statusText = this.add.text(
      30,
      60,
      "Arrastra el edificio desde la paleta hacia el campus.",
      {
        fontSize: "16px",
        color: "#c8d0ff",
        fontFamily: "Arial",
      },
    );
    this.addUIObject(this.statusText);

    this.hud.add([
      bg,
      this.coinsText,
      this.statusText,
    ]);
  }

  // =========================
  // B. SIDEBAR IZQUIERDA
  // =========================
  createSidebar() {
    this.sidebar = this.add.container(0, 0);
    this.sidebar.setScrollFactor(0);
    this.sidebar.x = this.sidebarOpen ? 0 : -this.sidebarWidth;

    const bg = this.add
      .rectangle(145, 370, 290, 560, 0x1f263a, 0.97)
      .setStrokeStyle(2, 0xffffff, 0.08);

    const toggleButton = this.add
      .rectangle(314, 370, 48, 96, 0x5c79ff, 0.97)
      .setStrokeStyle(2, 0xffffff, 0.18)
      .setInteractive({ cursor: "pointer" });

    this.sidebarToggleText = this.add
      .text(314, 370, this.sidebarOpen ? "<" : ">", {
        fontSize: "30px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" });

    const title = this.add
      .text(145, 105, "Edificios", {
        fontSize: "28px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(145, 140, "Arrastra al campus", {
        fontSize: "16px",
        color: "#9eb1ff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    const card = this.add
      .rectangle(145, 330, 248, 390, 0x2b3554)
      .setStrokeStyle(2, 0xffffff, 0.1);

    const cardTitle = this.add
      .text(145, 175, "Facultad de Sistemas", {
        fontSize: "17px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.paletteBuilding = this.add
      .image(145, 275, "building")
      .setDisplaySize(130, 130)
      .setInteractive({ draggable: true, cursor: "grab" });

    this.paletteBuilding.level = 1;
    this.paletteBuilding.coinsPerTick = 1;
    this.paletteBuilding.productionInterval = 1000;
    this.paletteBuilding.unclaimed = 0;

    this.productionRateText = this.add
      .text(145, 375, this.getProductionRateText(), {
        fontSize: "16px",
        color: "#c8d0ff",
        fontFamily: "Arial",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    this.upgradePanel = this.add
      .rectangle(145, 455, 210, 74, 0x6d8cff, 0.98)
      .setStrokeStyle(3, 0xffffff, 0.22)
      .setInteractive({ cursor: "pointer" });

    this.upgradeText = this.add
      .text(145, 435, "Mejorar Facultad", {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" });

    this.upgradeCostText = this.add
      .text(145, 465, "Costo: 10 monedas", {
        fontSize: "14px",
        color: "#edf2ff",
        fontFamily: "Arial",
        align: "center",
      })
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" });

    this.sidebar.add([
      bg,
      toggleButton,
      this.sidebarToggleText,
      title,
      subtitle,
      card,
      cardTitle,
      this.paletteBuilding,
      this.productionRateText,
      this.upgradePanel,
      this.upgradeText,
      this.upgradeCostText,
    ]);

    this.addUIObject(this.sidebar);

    toggleButton.on("pointerdown", () => this.toggleSidebar());
    this.sidebarToggleText.on("pointerdown", () => this.toggleSidebar());
    this.upgradePanel.on("pointerdown", () => this.upgradeBuilding());
    this.upgradeText.on("pointerdown", () => this.upgradeBuilding());
    this.upgradeCostText.on("pointerdown", () => this.upgradeBuilding());

    this.input.setDraggable(this.paletteBuilding);

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;

      if (!this.placedBuilding) {
        const worldPoint = this.cameras.main.getWorldPoint(
          pointer.x,
          pointer.y,
        );
        this.highlightDropSpot(worldPoint.x, worldPoint.y);
      }
    });

    this.input.on("dragend", (pointer, gameObject) => {
      this.clearDropHighlight();

      if (this.placedBuilding) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (this.isInsideDropSpot(worldPoint.x, worldPoint.y)) {
        this.placeBuilding(this.dropSpotX, this.dropSpotY);
      } else {
        gameObject.x = 145;
        gameObject.y = 275;
      }
    });
  }

  // =========================
  // CONTROLES DE CÁMARA
  // =========================
  toggleSidebar() {
    if (!this.sidebar) return;

    this.sidebarOpen = !this.sidebarOpen;

    if (this.sidebarToggleText) {
      this.sidebarToggleText.setText(this.sidebarOpen ? "<" : ">");
    }

    this.tweens.add({
      targets: this.sidebar,
      x: this.sidebarOpen ? 0 : -this.sidebarWidth,
      duration: 240,
      ease: "Sine.easeOut",
    });
  }

  createCameraControls() {
    this.cursors = this.input.keyboard.createCursorKeys();

    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      const cam = this.cameras.main;

      if (deltaY > 0) {
        cam.zoom = Math.max(0.55, cam.zoom - 0.05);
      } else {
        cam.zoom = Math.min(1.2, cam.zoom + 0.05);
      }
    });
  }

  update() {
    const cam = this.cameras.main;
    const speed = 8 / cam.zoom;

    if (this.cursors.left.isDown || this.keys.A.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown || this.keys.D.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown || this.keys.W.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown || this.keys.S.isDown) cam.scrollY += speed;
  }

  resizeLayout(gameSize) {
    const width = gameSize.width;

    if (this.hud) {
      this.hud.removeAll(true);
      this.createHUD();
    }

    if (this.sidebar) {
      this.sidebar.removeAll(true);
      this.createSidebar();
    }

    this.updateUpgradeText();
  }

  highlightDropSpot(x, y) {
    if (!this.dropSpot) return;

    if (this.isInsideDropSpot(x, y)) {
      this.drawDropSpot(true);
      this.dropSpotText.setColor("#ffffff");
    } else {
      this.clearDropHighlight();
    }
  }

  clearDropHighlight() {
    if (!this.dropSpot) return;

    this.drawDropSpot(false);

    if (this.dropSpotText) {
      this.dropSpotText.setColor("#d6e0ff");
    }
  }

  drawDropSpot(isHighlighted) {
    if (!this.dropSpot) return;

    const fillColor = isHighlighted ? 0x5c79ff : 0xffffff;
    const fillAlpha = isHighlighted ? 0.22 : 0.08;
    const strokeWidth = isHighlighted ? 4 : 3;
    const strokeColor = isHighlighted ? 0xffffff : 0x9eb1ff;
    const strokeAlpha = isHighlighted ? 0.4 : 0.25;

    this.dropSpot.clear();
    this.dropSpot.fillStyle(fillColor, fillAlpha);
    this.dropSpot.lineStyle(strokeWidth, strokeColor, strokeAlpha);
    this.dropSpot.beginPath();
    this.dropSpot.moveTo(this.dropSpotPoints[0].x, this.dropSpotPoints[0].y);

    for (let i = 1; i < this.dropSpotPoints.length; i++) {
      this.dropSpot.lineTo(this.dropSpotPoints[i].x, this.dropSpotPoints[i].y);
    }

    this.dropSpot.closePath();
    this.dropSpot.fillPath();
    this.dropSpot.strokePath();
  }

  isInsideDropSpot(x, y) {
    return Phaser.Geom.Polygon.Contains(
      new Phaser.Geom.Polygon(this.dropSpotPoints),
      x,
      y,
    );
  }

  placeBuilding(x, y) {
    const b = this.addWorldObject(
      this.add
        .image(x, y, "building")
        .setDisplaySize(400, 400)
        .setInteractive({ cursor: "pointer" }),
    );

    b.level = this.paletteBuilding.level;
    b.coinsPerTick = this.paletteBuilding.coinsPerTick;
    b.productionInterval = this.paletteBuilding.productionInterval;
    b.unclaimed = 0;

    this.placedBuilding = b;

    if (this.paletteBuilding) {
      this.paletteBuilding.destroy();
      this.paletteBuilding = null;
    }

    if (this.dropSpot) {
      this.dropSpot.destroy();
      this.dropSpot = null;
    }

    if (this.dropSpotText) {
      this.dropSpotText.destroy();
      this.dropSpotText = null;
    }

    this.placedBuilding.levelText = this.addWorldObject(
      this.add
        .text(x, y + 115, `Nivel: ${b.level}`, {
          fontSize: "18px",
          color: "#c8d0ff",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    this.unclaimedText = this.addWorldObject(
      this.add
        .text(x, y - 120, "", {
          fontSize: "20px",
          color: "#050400",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    this.statusText.setText(
      "Edificio colocado. Haz clic en él para reclamar monedas.",
    );
    this.updateUpgradeText();

    b.on("pointerdown", () => this.claimCoins());

    b.productionTimer = this.time.addEvent({
      delay: b.productionInterval,
      loop: true,
      callback: () => {
        b.unclaimed += b.coinsPerTick;
        this.showFloatingCoin(b.x, b.y, b.coinsPerTick);
        this.updateUnclaimedText();
      },
    });

    this.createStudents();
  }

  createStudents() {
    this.students = [];

    for (let i = 0; i < 6; i++) {
      const student = this.addWorldObject(
        this.add.circle(
          700 + i * 80,
          1050 + Phaser.Math.Between(-35, 35),
          9,
          0xffcc66,
        ),
      );

      this.tweens.add({
        targets: student,
        x: 2300,
        duration: 9000 + i * 1200,
        ease: "Linear",
        yoyo: true,
        repeat: -1,
      });

      this.students.push(student);
    }
  }

  showFloatingCoin(x, y, amount) {
    const coin = this.addWorldObject(
      this.add
        .text(x, y - 130, `+${amount}`, {
          fontSize: "20px",
          color: "#ffeb3b",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    this.tweens.add({
      targets: coin,
      y: coin.y - 45,
      alpha: 0,
      duration: 800,
      onComplete: () => coin.destroy(),
    });
  }

  updateUnclaimedText() {
    if (!this.placedBuilding || !this.unclaimedText) return;

    this.unclaimedText.setText(
      this.placedBuilding.unclaimed > 0
        ? `Sin reclamar: ${this.placedBuilding.unclaimed}`
        : "",
    );

    this.unclaimedText.x = this.placedBuilding.x;
    this.unclaimedText.y = this.placedBuilding.y - 120;
  }

  claimCoins() {
    if (!this.placedBuilding) return;

    const amount = this.placedBuilding.unclaimed;
    if (amount <= 0) return;

    this.playerCoins += amount;

    this.placedBuilding.unclaimed = 0;

    this.coinsText.setText(`Monedas: ${this.playerCoins}`);

    this.updateUnclaimedText();

    const pop = this.addWorldObject(
        this.add.text(this.placedBuilding.x, this.placedBuilding.y - 80, `+${amount}`, {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        }).setOrigin(0.5)
    );

    this.tweens.add({
      targets: pop,
      y: pop.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => pop.destroy(),
    });
  }

  upgradeBuilding() {
    if (!this.placedBuilding) return;

    const cost = 10 * this.placedBuilding.level;

    if (this.playerCoins < cost) {
      this.statusText.setText("No tienes suficientes monedas para mejorar.");
      return;
    }

    this.playerCoins -= cost;
    this.placedBuilding.level += 1;
    this.placedBuilding.coinsPerTick += 1;

    this.placedBuilding.productionInterval = Math.max(
      300,
      Math.round(this.placedBuilding.productionInterval * 0.85),
    );

    if (this.placedBuilding.productionTimer) {
      this.placedBuilding.productionTimer.remove(false);
    }

    this.placedBuilding.productionTimer = this.time.addEvent({
      delay: this.placedBuilding.productionInterval,
      loop: true,
      callback: () => {
        this.placedBuilding.unclaimed += this.placedBuilding.coinsPerTick;
        this.showFloatingCoin(
          this.placedBuilding.x,
          this.placedBuilding.y,
          this.placedBuilding.coinsPerTick,
        );
        this.updateUnclaimedText();
      },
    });

    this.coinsText.setText(`Monedas: ${this.playerCoins}`);

    if (this.placedBuilding.levelText) {
      this.placedBuilding.levelText.setText(
        `Nivel: ${this.placedBuilding.level}`,
      );
    }

    this.statusText.setText("Edificio mejorado correctamente.");
    this.updateUpgradeText();
  }

  updateUpgradeText() {
    if (!this.upgradeText || !this.upgradeCostText) return;

    this.upgradeText.setText("Mejorar Facultad");

    if (this.productionRateText) {
      this.productionRateText.setText(this.getProductionRateText());
    }

    if (!this.placedBuilding) {
      this.upgradeCostText.setText("Coloca un edificio primero");
      return;
    }

    const cost = 10 * this.placedBuilding.level;
    this.upgradeCostText.setText(`Costo: ${cost} monedas`);
  }

  getProductionRateText() {
    const source = this.placedBuilding || this.paletteBuilding;

    if (!source) {
      return "x0 por segundo";
    }

    const rate = source.coinsPerTick / (source.productionInterval / 1000);
    const roundedRate = Math.round(rate * 10) / 10;
    const displayRate = Number.isInteger(roundedRate)
      ? roundedRate.toString()
      : roundedRate.toFixed(1);

    return `x${displayRate} por segundo`;
  }

  addWorldObject(obj) {
    this.worldObjects.push(obj);

    if (this.uiCamera) {
      this.uiCamera.ignore(obj);
    }

    return obj;
  }

  addUIObject(obj) {
    this.uiObjects.push(obj);

    this.cameras.main.ignore(obj);

    return obj;
  }
}

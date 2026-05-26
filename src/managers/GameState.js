import { passiveCoinsPerTick } from '../data/Economy.js';

export default class GameState {
  constructor() {
    this.coins = 0;
    this.totalCoinsEarned = 0;
    this.totalUpgrades = 0;
    this.placedBuildings = {};
    this.achievements = new Set();
    this.missions = {
      active: [],
      completed: new Set(),
      progress: {
        totalCoinsEarned: 0,
        totalBuildings: 0,
        totalUpgrades: 0,
        quizCorrect: 0,
        quizAnswered: 0,
      },
    };
    this.lastSaved = null;
  }

  loadFrom(data) {
    this.coins = data.coins ?? 0;
    this.totalCoinsEarned = data.totalCoinsEarned ?? 0;
    this.totalUpgrades = data.totalUpgrades ?? 0;
    this.placedBuildings = data.placedBuildings ?? {};
    Object.values(this.placedBuildings).forEach(b => {
      b.students = b.students ?? 0;
      b.unclaimed = b.unclaimed ?? 0;
    });
    this.achievements = new Set(data.achievements ?? []);
    this.lastSaved = data.lastSaved ?? null;

    if (data.missions) {
      this.missions.completed = new Set(data.missions.completed ?? []);
      this.missions.progress = { ...this.missions.progress, ...(data.missions.progress ?? {}) };
    }
  }

  toSaveData() {
    return {
      coins: this.coins,
      totalCoinsEarned: this.totalCoinsEarned,
      totalUpgrades: this.totalUpgrades,
      placedBuildings: this._serializeBuildings(),
      achievements: [...this.achievements],
      missions: {
        completed: [...this.missions.completed],
        progress: { ...this.missions.progress },
      },
      lastSaved: Date.now(),
    };
  }

  _serializeBuildings() {
    const out = {};
    Object.entries(this.placedBuildings).forEach(([id, b]) => {
      out[id] = {
        typeId: b.typeId,
        level: b.level,
        coinsPerTick: b.coinsPerTick,
        productionInterval: b.productionInterval,
        students: b.students ?? 0,
      };
    });
    return out;
  }

  get totalProduction() {
    return Object.values(this.placedBuildings)
      .reduce((sum, b) => sum + passiveCoinsPerTick(b) / (b.productionInterval / 1000), 0);
  }

  get campusLevel() {
    const buildings = Object.keys(this.placedBuildings).length;
    return Math.max(1, buildings + Math.floor(this.totalUpgrades / 3));
  }
}

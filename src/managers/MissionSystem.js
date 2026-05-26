import { MISSION_POOL } from '../data/MissionPool.js';
import { randInt } from '../utils/Random.js';

export default class MissionSystem {
  constructor(game, state) {
    this.game  = game;
    this.state = state;
    this.active = [];
  }

  init() {
    const completed = this.state.missions.completed;
    const saved     = this.state.missions.active ?? [];

    // Restore saved active missions or pick fresh ones
    const pool = MISSION_POOL.filter(m => !completed.has(m.id));
    this.active = saved.length > 0
      ? pool.filter(m => saved.includes(m.id))
      : this._pick(3);

    if (this.active.length < 3) {
      const more = this._pick(3 - this.active.length);
      this.active.push(...more);
    }

    this._syncToState();

    ['coins-updated', 'building-placed', 'building-upgraded', 'quiz-result'].forEach(ev => {
      this.game.events.on(ev, () => this._checkAll());
    });
  }

  onAction(type, delta = 1) {
    const p = this.state.missions.progress;
    if (type === 'totalCoinsEarned') p.totalCoinsEarned = this.state.totalCoinsEarned;
    else if (type === 'totalBuildings') p.totalBuildings = Object.keys(this.state.placedBuildings).length;
    else if (type === 'totalUpgrades')  p.totalUpgrades  = this.state.totalUpgrades;
    else if (type in p) p[type] += delta;
    this._checkAll();
  }

  _checkAll() {
    const done = this.active.filter(m => this._progress(m) >= m.target);
    done.forEach(m => this._complete(m));
  }

  _complete(mission) {
    this.state.missions.completed.add(mission.id);
    this.active = this.active.filter(m => m.id !== mission.id);

    this.state.coins            += mission.reward;
    this.state.totalCoinsEarned += mission.reward;

    const replacements = this._pick(1);
    this.active.push(...replacements);
    this._syncToState();

    this.game.events.emit('mission-done', mission);
    this.game.events.emit('coins-updated');
  }

  _progress(m) {
    const p = this.state.missions.progress;
    return p[m.type] ?? 0;
  }

  _pick(n) {
    const used      = new Set([...this.state.missions.completed, ...this.active.map(m => m.id)]);
    const available = MISSION_POOL.filter(m => !used.has(m.id));
    const result    = [];
    const pool      = [...available];
    while (result.length < n && pool.length > 0) {
      const idx = randInt(0, pool.length - 1);
      result.push({ ...pool[idx] });
      pool.splice(idx, 1);
    }
    return result;
  }

  _syncToState() {
    this.state.missions.active = this.active.map(m => m.id);
  }

  getActive() {
    return this.active;
  }

  getProgress(mission) {
    return Math.min(this._progress(mission), mission.target);
  }
}

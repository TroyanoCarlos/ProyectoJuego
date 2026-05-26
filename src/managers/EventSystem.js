import { QUIZ_DATA } from '../data/QuizData.js';
import { DROP_SPOTS } from '../data/DropSpots.js';
import { randInt, randFrom } from '../utils/Random.js';

const EVENT_DELAY_MIN = 90000;
const EVENT_DELAY_MAX = 150000;

export default class EventSystem {
  constructor(game, state) {
    this.game     = game;
    this.state    = state;
    this.active   = false;
    this.quizOpen = false;
    this.eventOpen = false;
    this.scheduled = false;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this._schedule();
  }

  stop() {
    this.active = false;
    this.scheduled = false;
    this.eventOpen = false;
    this.quizOpen = false;
  }

  _schedule() {
    if (!this.active || this.scheduled || this.eventOpen || this.quizOpen) return;
    this.scheduled = true;
    const delay = randInt(EVENT_DELAY_MIN, EVENT_DELAY_MAX);
    // Store delay so GameScene can create the timer with scene.time
    this.game.events.emit('event:schedule', { delay });
  }

  // Called by GameScene when the timer fires
  onTimerFired() {
    this.scheduled = false;
    if (!this.active || this.quizOpen || this.eventOpen) { this._schedule(); return; }

    const facultyId = 'sistemas';
    const systemsBuilding = Object.values(this.state.placedBuildings).find(b => b.typeId === facultyId);
    if (!systemsBuilding) { this._schedule(); return; }

    const data      = QUIZ_DATA[facultyId] ?? QUIZ_DATA.sistemas;
    const pos       = this._systemsEventPosition();
    const question  = randFrom(data.questions);

    this.eventOpen = true;
    this.game.events.emit('event:spawn', { pos, facultyId, data, question });
  }

  _systemsEventPosition() {
    const spot = DROP_SPOTS.find(s => s.typeId === 'sistemas');
    if (!spot) return { x: 1470, y: 1030 };
    return {
      x: spot.x + 230,
      y: spot.y + 110,
    };
  }

  // Called by GameScene when user clicks an event icon
  openQuiz(facultyId, question) {
    if (this.quizOpen) return;
    this.eventOpen = false;
    this.quizOpen = true;
    this.game.events.emit('event:quiz-open', { facultyId, question });
  }

  closeQuiz() {
    if (!this.active) return;
    this.quizOpen = false;
    this.eventOpen = false;
    this._schedule();
  }

  resolveQuiz(correct, facultyId) {
    const placed  = Object.values(this.state.placedBuildings).find(b => b.typeId === facultyId);
    const bonus   = correct ? (placed ? 50 * placed.level : 50) : Math.max(5, placed ? Math.floor(5 * placed.level) : 5);

    this.state.coins            += bonus;
    this.state.totalCoinsEarned += bonus;

    const p = this.state.missions.progress;
    if (correct) p.quizCorrect += 1;
    p.quizAnswered += 1;

    this.game.events.emit('quiz-result', { correct, bonus });
    this.game.events.emit('coins-updated');
  }
}

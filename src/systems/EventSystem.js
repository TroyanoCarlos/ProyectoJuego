import Phaser from 'phaser';
import { QUIZ_DATA } from '../data/QuizData.js';
import { randInt, randFrom } from '../utils/Random.js';

const EVENT_POSITIONS = [
  { x: 820,  y: 960  },
  { x: 1180, y: 860  },
  { x: 1820, y: 860  },
  { x: 2180, y: 960  },
  { x: 1500, y: 1250 },
  { x: 1050, y: 1100 },
  { x: 1950, y: 1100 },
];

export default class EventSystem {
  constructor(game, state) {
    this.game     = game;
    this.state    = state;
    this.active   = false;
    this.quizOpen = false;
  }

  start() {
    this.active = true;
    this._schedule();
  }

  stop() {
    this.active = false;
  }

  _schedule() {
    if (!this.active) return;
    const delay = randInt(30000, 55000);
    // Store delay so GameScene can create the timer with scene.time
    this.game.events.emit('event:schedule', { delay });
  }

  // Called by GameScene when the timer fires
  onTimerFired() {
    if (!this.active || this.quizOpen) { this._schedule(); return; }

    const facultyId = this._pickFaculty();
    const data      = QUIZ_DATA[facultyId];
    const pos       = randFrom(EVENT_POSITIONS);
    const question  = randFrom(data.questions);

    this.game.events.emit('event:spawn', { pos, facultyId, data, question });
  }

  _pickFaculty() {
    const placed = Object.values(this.state.placedBuildings);
    return placed.length > 0 ? randFrom(placed).typeId : 'sistemas';
  }

  // Called by GameScene when user clicks an event icon
  openQuiz(facultyId, question) {
    if (this.quizOpen) return;
    this.quizOpen = true;
    this.game.events.emit('event:quiz-open', { facultyId, question });
  }

  closeQuiz() {
    this.quizOpen = false;
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

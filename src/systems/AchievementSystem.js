const ACHIEVEMENTS = [
  { id: 'first_build',  title: '¡Constructor!',     desc: 'Coloca tu primer edificio',          check: s => Object.keys(s.placedBuildings).length >= 1 },
  { id: 'first_upgrade',title: '¡Mejorado!',        desc: 'Mejora un edificio por primera vez', check: s => s.totalUpgrades >= 1 },
  { id: 'coins_100',    title: 'Ahorrador',          desc: 'Gana 100 monedas en total',          check: s => s.totalCoinsEarned >= 100 },
  { id: 'coins_1k',     title: 'Millonario EPN',     desc: 'Gana 1 000 monedas en total',        check: s => s.totalCoinsEarned >= 1000 },
  { id: 'coins_10k',    title: 'Empresario',         desc: 'Gana 10 000 monedas en total',       check: s => s.totalCoinsEarned >= 10000 },
  { id: 'full_campus',  title: '🎓 Campus Completo', desc: 'Construye en los 4 terrenos',        check: s => Object.keys(s.placedBuildings).length >= 4 },
  { id: 'quiz_master',  title: 'Académico',          desc: 'Responde 10 quizzes correctamente',  check: s => (s.missions.progress.quizCorrect ?? 0) >= 10 },
];

export default class AchievementSystem {
  constructor(game, state) {
    this.game  = game;
    this.state = state;

    // Re-check on any relevant game event
    ['coins-updated', 'building-placed', 'building-upgraded'].forEach(ev => {
      game.events.on(ev, () => this.check());
    });
    game.events.on('quiz-result', () => this.check());
  }

  check() {
    for (const ach of ACHIEVEMENTS) {
      if (!this.state.achievements.has(ach.id) && ach.check(this.state)) {
        this.state.achievements.add(ach.id);
        this.game.events.emit('achievement', ach);
      }
    }
  }
}

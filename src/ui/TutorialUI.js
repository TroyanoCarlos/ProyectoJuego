import { BUILDING_TYPES } from '../data/BuildingTypes.js';

export function currentTutorialSteps() {
  return [
    { title: 'Bienvenido al Campus EPN', text: 'Tu mision es reconstruir la Politecnica.\nEmpieza con pocos recursos, genera monedas\ny convierte el campus en una universidad viva.' },
    { title: '1. Abre la paleta', text: 'Pulsa la pestana lateral para ver los edificios\ndisponibles. Cada tarjeta muestra su costo\ny las monedas que genera por clic.' },
    { title: '2. Construye en el mapa', text: 'Arrastra un edificio desde la paleta hasta\nsu unico espacio de construccion marcado.\nCada edificio tiene un lugar asignado.' },
    { title: '3. Genera monedas', text: 'Haz clic sobre un edificio construido para\nganar monedas. Los edificios nuevos son\nmetas importantes porque desbloquean una\nproduccion base mucho mayor.' },
    { title: '4. Mejora edificios', text: 'Selecciona un edificio y presiona "Mejorar".\nMejorar aumenta las monedas por clic y\ntambien sube el valor pasivo de sus estudiantes.' },
    { title: '5. Admite estudiantes', text: 'Presiona "Admitir estudiante" para sumar\nproduccion automatica. Cada estudiante cuesta\nmas que el anterior y cada edificio puede tener 20.' },
    { title: 'Objetivo', text: 'Reconstruye la Politecnica construyendo todos\nlos edificios y facultades. Luego puedes seguir\njugando, mejorando y admitiendo estudiantes.' },
  ];
}

export function maybeShowCampusRebuiltPopup(scene) {
  const doneId = 'campus_rebuilt_popup';
  if (scene._state.achievements.has(doneId)) return;

  const builtTypes = new Set(Object.values(scene._state.placedBuildings).map(b => b.typeId));
  const allBuilt = BUILDING_TYPES.every(type => builtTypes.has(type.id));
  if (!allBuilt) return;

  scene._state.achievements.add(doneId);
  scene.registry.get('save')?.save(scene._state);
  showCampusRebuiltPopup(scene);
}

export function showCampusRebuiltPopup(scene) {
  const { width: W, height: H } = scene.scale;
  const cx = W / 2, cy = H / 2;
  const objs = [];
  const add = o => { objs.push(o); return o; };

  add(scene.add.rectangle(cx, cy, W, H, 0x000000, 0.68).setDepth(95));
  add(scene.add.rectangle(cx, cy, 520, 260, 0x0d1220, 0.98).setStrokeStyle(3, 0xf5c518, 0.9).setDepth(96));
  add(scene.add.text(cx, cy - 82, 'Felicitaciones', {
    fontSize: '26px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#f5c518',
  }).setOrigin(0.5).setDepth(97));
  add(scene.add.text(cx, cy - 20,
    'Has reconstruido la Politecnica.\n\nSi deseas puedes seguir jugando,\nmejorando edificios y anadiendo mas estudiantes.', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'Arial', align: 'center', lineSpacing: 7,
    }).setOrigin(0.5).setDepth(97));

  const btn = add(scene.add.rectangle(cx, cy + 88, 180, 42, 0x5c79ff).setInteractive({ cursor: 'pointer' }).setDepth(97));
  const btnTxt = add(scene.add.text(cx, cy + 88, 'Continuar', {
    fontSize: '16px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
  }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(98));
  const close = () => objs.forEach(o => { if (o?.active) o.destroy(); });
  btn.on('pointerdown', close);
  btnTxt.on('pointerdown', close);
}

export function showTutorial(scene) {
  if ((localStorage.getItem('epn_tutorial_done') && !scene.registry.get('tutorial-after-intro')) || scene._tutorialOpen) return;
  scene.registry.set('tutorial-after-intro', false);
  scene._tutorialOpen = true;

  const { width: W, height: H } = scene.scale;
  const cx = W / 2, cy = H / 2;
  const steps = currentTutorialSteps();
  let step = 0;
  const objs = [];
  const add = o => { objs.push(o); return o; };

  add(scene.add.rectangle(cx, cy, W, H, 0x000000, 0.65).setDepth(90));
  add(scene.add.rectangle(cx, cy, 500, 290, 0x0d1220).setStrokeStyle(2, 0x5c79ff, 0.8).setDepth(91));
  const titleTxt = add(scene.add.text(cx, cy - 88, steps[0].title, {
    fontSize: '18px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5).setDepth(92));
  const bodyTxt = add(scene.add.text(cx, cy - 20, steps[0].text, {
    fontSize: '14px', color: '#c8d0ff', fontFamily: 'Arial', align: 'center', lineSpacing: 6,
  }).setOrigin(0.5).setDepth(92));
  const indicator = add(scene.add.text(cx, cy + 78, `1 / ${steps.length}`, {
    fontSize: '12px', color: '#4a5a7a', fontFamily: 'Arial',
  }).setOrigin(0.5).setDepth(92));
  const btn = add(scene.add.rectangle(cx, cy + 112, 180, 38, 0x5c79ff).setInteractive({ cursor: 'pointer' }).setDepth(92));
  const btnTxt = add(scene.add.text(cx, cy + 112, 'Siguiente ->', {
    fontSize: '15px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
  }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(93));

  const advance = () => {
    step++;
    if (step >= steps.length) {
      objs.forEach(o => { if (o?.active) o.destroy(); });
      localStorage.setItem('epn_tutorial_done', '1');
      scene._tutorialOpen = false;
      return;
    }
    titleTxt.setText(steps[step].title);
    bodyTxt.setText(steps[step].text);
    indicator.setText(`${step + 1} / ${steps.length}`);
    if (step === steps.length - 1) btnTxt.setText('Empezar');
  };

  btn.on('pointerdown', advance);
  btnTxt.on('pointerdown', advance);
}

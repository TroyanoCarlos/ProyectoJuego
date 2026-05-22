const KEY = 'epn_clicker_v2';

export default class SaveSystem {
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.toSaveData()));
    } catch { /* storage full */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  clear() {
    localStorage.removeItem(KEY);
    localStorage.removeItem('epn_tutorial_done');
  }
}

export const MAX_BUILDING_LEVEL = 10;
export const MAX_STUDENTS_PER_BUILDING = 20;

export const CLICK_UPGRADE_MULTIPLIER = 1.32;
export const PASSIVE_PER_STUDENT_RATE = 0.35;
export const UPGRADE_COST_EXPONENT = 2.05;
export const STUDENT_COST_BASE_MULTIPLIER = 0.7;
export const STUDENT_COST_LEVEL_EXPONENT = 0.65;
export const STUDENT_COST_GROWTH = 1.32;

export function passiveCoinsPerStudent(bData) {
  return Math.max(1, Math.ceil(bData.coinsPerTick * PASSIVE_PER_STUDENT_RATE));
}

export function passiveCoinsPerTick(bData) {
  return (bData.students ?? 0) * passiveCoinsPerStudent(bData);
}

export function studentCost(type, bData) {
  const levelPressure = Math.pow(bData.level ?? 1, STUDENT_COST_LEVEL_EXPONENT);
  return Math.ceil(
    type.upgradeBaseCost *
    STUDENT_COST_BASE_MULTIPLIER *
    levelPressure *
    Math.pow(STUDENT_COST_GROWTH, bData.students ?? 0)
  );
}

export function upgradeCost(type, bData) {
  return Math.ceil(type.upgradeBaseCost * Math.pow(bData.level, UPGRADE_COST_EXPONENT));
}

export function upgradedClickIncome(bData) {
  return Math.ceil(bData.coinsPerTick * CLICK_UPGRADE_MULTIPLIER);
}

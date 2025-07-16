export const EXP_POINTS = {
  hard: { perfect: 200, withMistakes: 100 },
  medium: { perfect: 100, withMistakes: 50 },
  easy: { perfect: 50, withMistakes: 25 },
};

export type Difficulty = keyof typeof EXP_POINTS;

export const calculateExperience = (difficulty: Difficulty, correctAtFirstTry: boolean) => {
  return correctAtFirstTry ? EXP_POINTS[difficulty].perfect : EXP_POINTS[difficulty].withMistakes;
};

export const calculateLevel = (exp: number): number => {
  let level = 0;
  while (10 * Math.pow(level, 2) + 100 * level + 150 < exp) {
    level++;
  }
  return level;
};

export const calculateXpToNextLevel = (exp: number, currentLevel: number): number => {
  const nextLevelExp = 10 * Math.pow(currentLevel, 2) + 100 * currentLevel + 150;
  return nextLevelExp - exp;
};

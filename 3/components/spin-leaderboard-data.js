// Fictional, fixed fixtures for the local leaderboard UI demo. These are not
// real players, verified records, or scores from the current game session.
const DEMO_PLAYERS = Object.freeze([
  ['Maya Chen', 'MC', 875420],
  ['Luca Moretti', 'LM', 748900],
  ['Aisha Rahman', 'AR', 692180],
  ['Oliver Bennett', 'OB', 638450],
  ['Sofia Alvarez', 'SA', 589760],
  ['Noah Kim', 'NK', 522300],
  ['Priya Kapoor', 'PK', 478620],
  ['Mateo Rossi', 'MR', 461170],
  ['Emilia Novak', 'EN', 442800],
  ['Kenji Tanaka', 'KT', 429360],
  ['Amara Okafor', 'AO', 417950],
  ['Hugo Laurent', 'HL', 403210],
  ['Ingrid Berg', 'IB', 387640],
  ['Rafael Costa', 'RC', 364820],
  ['Yuna Park', 'YP', 343190],
  ['Elena Petrova', 'EP', 319870],
  ['Tomas Silva', 'TS', 298460],
  ['Fatima Hassan', 'FH', 273140],
  ['Adam Kowalski', 'AK', 257920],
  ['Leila Zahid', 'LZ', 248630],
  ['Daniel Weber', 'DW', 236150],
  ['Nia Williams', 'NW', 218790],
  ['Viktor Lind', 'VL', 205470],
  ['Chloe Martin', 'CM', 196380],
  ['Samir Patel', 'SP', 189620],
  ['Lucia Greco', 'LG', 182940],
  ["Ben O'Connor", 'BO', 176310],
  ['Eva Jensen', 'EJ', 168750],
  ['Arjun Mehta', 'AM', 154680],
  ['Clara Dubois', 'CD', 142930],
  ['Gabriel Santos', 'GS', 123540],
  ['Hana Sato', 'HS', 108270],
  ['Malik Diop', 'MD', 95420],
  ['Freya Nielsen', 'FN', 78650],
  ['Idris Kamara', 'IK', 63780],
  ['Nora Fischer', 'NF', 52410],
  ['Diego Vega', 'DV', 43690],
  ['Zoya Ali', 'ZA', 28750],
  ['Theo Pappas', 'TP', 16280],
  ['Sara Mikkelsen', 'SM', 12640],
  ['Omar Farouk', 'OF', 7380],
  ['Ana Ionescu', 'AI', 5120],
  ['Felix Braun', 'FB', 3860],
  ['Dalia Said', 'DS', 1840],
  ['Pavel Sokolov', 'PS', 1070],
  ['Linh Nguyen', 'LN', 740],
  ['Jasper de Vries', 'JV', 510],
  ['Mirela Popescu', 'MP', 290],
  ['Esra Yilmaz', 'EY', 78],
  ['Jonas Eriksen', 'JE', 16]
]);

/** Create one 50-row demo table, choosing You's rank once for this table. */
export function createDemoLeaderboard(random = Math.random) {
  const sample = Number(random());
  const bounded = Number.isNaN(sample) ? 0 : Math.min(1, Math.max(0, sample));
  const youIndex = 2 + Math.min(2, Math.floor(bounded * 3));
  return DEMO_PLAYERS.map(([name, initials, score], index) => ({
    rank: index + 1,
    name: index === youIndex ? 'You' : name,
    initials: index === youIndex ? 'YO' : initials,
    score,
    isYou: index === youIndex
  }));
}

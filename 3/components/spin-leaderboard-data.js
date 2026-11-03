// Fictional, fixed fixtures for the local leaderboard UI demo. These are not
// real players, verified records, or scores from the current game session.
const DEMO_PLAYERS = Object.freeze([
  ['Maya Chen', 'MC', 1804200],
  ['Luca Moretti', 'LM', 1572800],
  ['Aisha Rahman', 'AR', 1296400],
  ['Oliver Bennett', 'OB', 1087650],
  ['Sofia Alvarez', 'SA', 972840],
  ['Noah Kim', 'NK', 931570],
  ['Priya Kapoor', 'PK', 887230],
  ['Mateo Rossi', 'MR', 867410],
  ['Emilia Novak', 'EN', 842860],
  ['Kenji Tanaka', 'KT', 818730],
  ['Amara Okafor', 'AO', 794260],
  ['Hugo Laurent', 'HL', 767980],
  ['Ingrid Berg', 'IB', 744510],
  ['Rafael Costa', 'RC', 719820],
  ['Yuna Park', 'YP', 691360],
  ['Elena Petrova', 'EP', 667430],
  ['Tomas Silva', 'TS', 641870],
  ['Fatima Hassan', 'FH', 618940],
  ['Adam Kowalski', 'AK', 592760],
  ['Leila Zahid', 'LZ', 569280],
  ['Daniel Weber', 'DW', 541630],
  ['Nia Williams', 'NW', 517490],
  ['Viktor Lind', 'VL', 489720],
  ['Chloe Martin', 'CM', 467840],
  ['Samir Patel', 'SP', 439610],
  ['Lucia Greco', 'LG', 417950],
  ["Ben O'Connor", 'BO', 389860],
  ['Eva Jensen', 'EJ', 367420],
  ['Arjun Mehta', 'AM', 341780],
  ['Clara Dubois', 'CD', 318690],
  ['Gabriel Santos', 'GS', 289530],
  ['Hana Sato', 'HS', 267840],
  ['Malik Diop', 'MD', 239620],
  ['Freya Nielsen', 'FN', 217490],
  ['Idris Kamara', 'IK', 189760],
  ['Nora Fischer', 'NF', 167320],
  ['Diego Vega', 'DV', 139680],
  ['Zoya Ali', 'ZA', 117540],
  ['Theo Pappas', 'TP', 89420],
  ['Sara Mikkelsen', 'SM', 68750],
  ['Ana Ionescu', 'AI', 56320],
  ['Omar Farouk', 'OF', 43690],
  ['Felix Braun', 'FB', 12640],
  ['Dalia Said', 'DS', 7380],
  ['Pavel Sokolov', 'PS', 5120],
  ['Linh Nguyen', 'LN', 1840],
  ['Jasper de Vries', 'JV', 740],
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

// Fictional, fixed fixtures for the local leaderboard UI demo. These are not
// real players, verified records, or scores from the current game session.
// Temporary 20k playtest scores span every reward tier; original fixtures are in Git.
const DEMO_PLAYERS = Object.freeze([
  ['Maya Chen', 'MC', 1804200],
  ['Luca Moretti', 'LM', 1572800],
  ['Aisha Rahman', 'AR', 435600],
  ['Oliver Bennett', 'OB', 426800],
  ['Sofia Alvarez', 'SA', 415600],
  ['Noah Kim', 'NK', 406800],
  ['Priya Kapoor', 'PK', 395600],
  ['Mateo Rossi', 'MR', 386800],
  ['Emilia Novak', 'EN', 375600],
  ['Kenji Tanaka', 'KT', 366800],
  ['Amara Okafor', 'AO', 355600],
  ['Hugo Laurent', 'HL', 346800],
  ['Ingrid Berg', 'IB', 335600],
  ['Rafael Costa', 'RC', 326800],
  ['Yuna Park', 'YP', 315600],
  ['Elena Petrova', 'EP', 306800],
  ['Tomas Silva', 'TS', 295600],
  ['Fatima Hassan', 'FH', 286800],
  ['Adam Kowalski', 'AK', 275600],
  ['Leila Zahid', 'LZ', 266800],
  ['Daniel Weber', 'DW', 255600],
  ['Nia Williams', 'NW', 246800],
  ['Viktor Lind', 'VL', 235600],
  ['Chloe Martin', 'CM', 226800],
  ['Samir Patel', 'SP', 215600],
  ['Lucia Greco', 'LG', 206800],
  ["Ben O'Connor", 'BO', 195600],
  ['Eva Jensen', 'EJ', 186800],
  ['Arjun Mehta', 'AM', 175600],
  ['Clara Dubois', 'CD', 166800],
  ['Gabriel Santos', 'GS', 155600],
  ['Hana Sato', 'HS', 146800],
  ['Malik Diop', 'MD', 135600],
  ['Freya Nielsen', 'FN', 126800],
  ['Idris Kamara', 'IK', 115600],
  ['Nora Fischer', 'NF', 106800],
  ['Diego Vega', 'DV', 95600],
  ['Zoya Ali', 'ZA', 86800],
  ['Theo Pappas', 'TP', 75600],
  ['Sara Mikkelsen', 'SM', 66800],
  ['Ana Ionescu', 'AI', 55600],
  ['Omar Farouk', 'OF', 46800],
  ['Felix Braun', 'FB', 35600],
  ['Dalia Said', 'DS', 26800],
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

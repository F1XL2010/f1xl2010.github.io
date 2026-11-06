/**
 * One shared set of safe operating limits for newly generated F1XL workbooks.
 *
 * Keep these figures together.  A limit must not be changed in one formula or
 * screen without the connected Season Master and Division calculations using
 * the same value.
 */
const F1XL_CAPACITY = Object.freeze({
  teams: 12,
  raceEntries: 24,
  seasonEntrants: 500,
  seasonDriversPerDivision: 40,
  divisions: 8,
  rounds: 22
});

/** Historical scoring rules which are facts of a season rather than choices
 * for the operator preparing a workbook. Keeping them here makes the narrow
 * eligibility window visible to every generated Division and repair path. */
const F1XL_SCORING_RULES = Object.freeze({
  fastestLapBonus: Object.freeze({
    firstSeason: 20,
    lastSeason: 25,
    points: 1,
    maximumPosition: 10,
    session: 'Race'
  })
});

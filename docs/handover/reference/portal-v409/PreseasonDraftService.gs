/** Principal order preparation. A saved live pick locks the order against redraws. */
const F1XL_PRESEASON_DRAFT = Object.freeze({
  name: 'Draft Order', headers: ['Division', 'Pick', 'Team', 'Team Principal'],
  marker: 'F1XL Draft Order v1'
});

function preseasonDraftHasPicks_(book) {
  const sheet = book.getSheetByName('Draft Picks');
  return !!(sheet && sheet.getLastRow() > 1 && sheet.getRange(2,1,sheet.getLastRow()-1,1).getDisplayValues().some(function(r) { return !!r[0]; }));
}

function preseasonDraftContext_(season) {
  const c = preseasonPlacementContext_(season), p = c.placement;
  const principals = preseasonPrincipalsContext_(season);
  const allTeams = principals.teamValues.slice(0, principals.count).map(function(r) {
    return {team: String(r[0]), principal: String(r[4]), type: String(r[5])};
  });
  const missing = [], seenTeams = {}, seenPrincipals = {};
  if (p.state !== 'Confirmed') missing.push('Confirm the current placement board before preparing the draft order.');
  if (!allTeams.length) missing.push('Set the teams and principals in Team principals.');
  allTeams.forEach(function(t, i) {
    if (!t.team) missing.push('Choose a team for slot ' + (i + 1) + '.');
    if (t.team && seenTeams[t.team.toLowerCase()]) missing.push('Remove the duplicate ' + t.team + ' team.');
    seenTeams[t.team.toLowerCase()] = true;
    if (['Full team', 'Free agent team'].indexOf(t.type) < 0) missing.push('Choose the team type for ' + (t.team || 'slot ' + (i + 1)) + '.');
    if (t.type !== 'Free agent team') {
      if (!t.principal) missing.push('Add the principal for ' + (t.team || 'slot ' + (i + 1)) + '.');
      if (t.principal && seenPrincipals[t.principal.toLowerCase()]) missing.push('Check the repeated principal ' + t.principal + ' before drawing the order.');
      seenPrincipals[t.principal.toLowerCase()] = true;
    }
  });
  const teams = allTeams.filter(function(t) { return t.type !== 'Free agent team'; });
  if (!teams.length && allTeams.length) missing.push('At least one team needs a principal to take part in the draft.');
  const table = preseasonPlacementTable_(c.book, F1XL_PRESEASON_DRAFT);
  const meta = table.sheet && table.sheet.getLastRow() ? seasonPlanningValues_(table.sheet.getRange('G1:H5')) : [];
  if (meta.length && (meta[0][0] !== F1XL_PRESEASON_DRAFT.marker || String(meta[0][1]) !== c.season ||
      meta[1][0] !== 'Source revision' || meta[2][0] !== 'Order revision' || meta[3][0] !== 'Drawn at' || meta[4][0] !== 'Saved at')) {
    throw new Error('Draft Order metadata has an unrecognised layout. Check the Master before continuing.');
  }
  const sourceRevision = intakeHash_([c.revision, allTeams]);
  const rows = table.rows.map(function(r) { return {division: Number(r[0]), pick: Number(r[1]), team: String(r[2]), principal: String(r[3])}; });
  const orderRevision = intakeHash_(rows.map(function(r) { return [r.division, r.pick, r.team, r.principal]; }));
  const review = rows.length && (missing.length || meta[1][1] !== sourceRevision || meta[2][1] !== orderRevision);
  c.draft = {table: table, meta: meta, teams: teams, excluded: allTeams.filter(function(t) { return t.type === 'Free agent team'; }),
    missing: missing, rows: rows, sourceRevision: sourceRevision, state: rows.length ? (review ? 'Review needed' : 'Saved') : 'Not drawn'};
  c.revision = intakeHash_([sourceRevision, table.rows, meta]);
  return c;
}

function preseasonDraftResponse_(c) {
  const d = c.draft;
  let canRetain = false;
  if (d.rows.length && !d.missing.length) {
    try { preseasonDraftValidateRows_(d.rows, d.teams, c.placement.board.length); canRetain = true; }
    catch (error) { /* Old team/division arrangements stay visible, but cannot be confirmed. */ }
  }
  return {season: c.season, url: c.book.getUrl(), revision: c.revision, state: d.state,
    teams: d.teams, excluded: d.excluded, missing: d.missing, hasPicks:preseasonDraftHasPicks_(c.book),
    rows: d.rows.slice().sort(function(a, b) { return a.division - b.division || a.pick - b.pick; }), canRetain: canRetain,
    drawnAt: d.meta.length ? d.meta[3][1] : '', savedAt: d.meta.length ? d.meta[4][1] : '',
    divisions: c.placement.board.map(function(b) {
      const drivers = c.placement.drivers.filter(function(p) { return p.placement.decision === 'Placed' && p.placement.division === b.number; });
      return {number: b.number, tierOne: drivers.filter(function(p) { return p.placement.tier === 1; }).length,
        tierTwo: drivers.filter(function(p) { return p.placement.tier === 2; }).length,
        partTime: drivers.filter(function(p) { return p.commitment === 'No'; }).length};
    }), message: ''};
}

function getPreseasonDraft(season) { fapAssertEntry_('getPreseasonDraft');
  return preseasonDraftResponse_(preseasonDraftContext_(season));
}

/** Fisher–Yates gives each principal an equal chance of the first position. */
function preseasonDraftShuffle_(values) {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)), value = result[i];
    result[i] = result[j]; result[j] = value;
  }
  return result;
}

/** Each column is a permutation. Complementary pairs balance exactly.
 * For odd division counts >=3, a balanced triple comes first; remaining pairs
 * preserve its totals. Even team counts with odd division counts necessarily
 * have integer totals differing by one. One division is just the random draw.
 */
function preseasonDraftPositions_(count, divisions) {
  if (!Number.isInteger(count) || count < 1 || count > F1XL_CAPACITY.teams ||
      !Number.isInteger(divisions) || divisions < 1 || divisions > F1XL_CAPACITY.divisions) throw new Error('Choose supported team and division counts.');
  const identity = Array.from({length: count}, function(_, i) { return i + 1; });
  if (divisions === 1) return [identity];
  const columns = [];
  if (divisions % 2) {
    const half = Math.floor(count / 2);
    const second = identity.map(function(_, i) { return (i + half) % count + 1; });
    const third = identity.map(function(v, i) {
      return count % 2 ? 3 * (count + 1) / 2 - v - second[i] :
        (i < half ? count - 1 - 2 * i : count - 2 * (i - half));
    });
    columns.push(identity, second, third);
  }
  while (columns.length < divisions) {
    const first = columns.length ? preseasonDraftShuffle_(identity) : identity;
    columns.push(first, first.map(function(v) { return count + 1 - v; }));
  }
  return columns;
}

function previewPreseasonDraft(input) { fapAssertEntry_('previewPreseasonDraft');
  const c = preseasonDraftContext_(input.season); intakeRequireRevision_(input, c);
  if (preseasonDraftHasPicks_(c.book)) throw new Error('The live draft has saved picks. Keep its principal order; undo the saved picks before drawing a replacement.');
  if (c.draft.missing.length) throw new Error(c.draft.missing.join(' '));
  const teams = preseasonDraftShuffle_(c.draft.teams), positions = preseasonDraftPositions_(teams.length, c.placement.board.length);
  const result = preseasonDraftResponse_(c);
  result.rows = [];
  positions.forEach(function(column, index) {
    teams.forEach(function(t, i) { result.rows.push({division: index + 1, pick: column[i], team: t.team, principal: t.principal}); });
  });
  result.rows.sort(function(a, b) { return a.division - b.division || a.pick - b.pick; });
  result.drawnAt = new Date().toISOString(); result.state = 'Preview';
  result.message = 'Random draw prepared. Review the order, then save it to the Season Master.';
  return result;
}

function preseasonDraftValidateRows_(rows, teams, divisions) {
  if (!Array.isArray(rows) || rows.length !== teams.length * divisions) throw new Error('The draft order must include every participating team once per division.');
  const seen = {};
  rows.forEach(function(r) {
    const team = teams.find(function(t) { return t.team === r.team && t.principal === r.principal; });
    if (!team || !Number.isInteger(r.division) || r.division < 1 || r.division > divisions || !Number.isInteger(r.pick) || r.pick < 1 || r.pick > teams.length) {
      throw new Error('The draft order does not match the current teams and divisions. Generate a fresh preview.');
    }
    const teamKey = r.division + '/team/' + r.team, pickKey = r.division + '/pick/' + r.pick;
    if (seen[teamKey] || seen[pickKey]) throw new Error('Each division must contain every team and picking position exactly once.');
    seen[teamKey] = true; seen[pickKey] = true;
  });
  const totals = teams.map(function(t) { return rows.filter(function(r) { return r.team === t.team; }).reduce(function(sum, r) { return sum + r.pick; }, 0); });
  if (divisions > 1 && Math.max.apply(null, totals) - Math.min.apply(null, totals) > 1) throw new Error('This draft order is not balanced. Generate a fresh preview before saving.');
}

function savePreseasonDraft(input) { fapAssertEntry_('savePreseasonDraft');
  return withApplicationLock_(function() {
    const c = preseasonDraftContext_(input.season); intakeRequireRevision_(input, c);
    if (c.draft.missing.length) throw new Error(c.draft.missing.join(' '));
    preseasonDraftValidateRows_(input.rows, c.draft.teams, c.placement.board.length);
    const canonical = function(rows) { return rows.map(function(r) { return [Number(r.division),Number(r.pick),r.team,r.principal]; }).sort(function(a,b) { return a[0]-b[0] || a[1]-b[1]; }); };
    if (preseasonDraftHasPicks_(c.book) && JSON.stringify(canonical(input.rows)) !== JSON.stringify(canonical(c.draft.rows))) throw new Error('The live draft has saved picks. Its principal order cannot be changed.');
    const drawnAt = String(input.drawnAt || '');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(drawnAt) || isNaN(Date.parse(drawnAt))) throw new Error('Generate a draft preview before saving.');
    const rows = input.rows.slice().sort(function(a, b) { return a.division - b.division || a.pick - b.pick; })
      .map(function(r) { return [r.division, r.pick, r.team, r.principal]; });
    const values = [F1XL_PRESEASON_DRAFT.headers].concat(rows);
    let sheet = c.draft.table.sheet;
    if (!sheet) sheet = c.book.insertSheet(F1XL_PRESEASON_DRAFT.name);
    const height = Math.max(values.length, sheet.getLastRow(), 5);
    while (values.length < height) values.push(['', '', '', '']);
    if (height > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), height - sheet.getMaxRows());
    intakeCommit_([{range: sheet.getRange(1, 1, height, 4), values: values, text: true},
      {range: sheet.getRange('G1:H5'), text: true, values: [
        [F1XL_PRESEASON_DRAFT.marker, c.season], ['Source revision', c.draft.sourceRevision],
        ['Order revision', intakeHash_(rows)], ['Drawn at', drawnAt], ['Saved at', new Date().toISOString()]
      ]}]);
    // If presenters already exist, a direct-to-Sheets prediction grid is
    // refreshed at the same moment as the confirmed order.
    try { preseasonDraftPickPredictionEnsure_(c.season,preseasonPredictionContext_(c.season).presenters); }
    catch(error) { if(c.book.getSheetByName('Presenter Predictions'))throw error; }
    const result = getPreseasonDraft(c.season);
    result.message = 'Draft order saved to the Season Master.';
    return result;
  });
}

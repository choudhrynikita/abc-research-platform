const JOURNAL_CSV = `date,setup,direction,entry,invalidation,r_rupees,size,result_r,process_grade,emotion_1_to_5,followed_plan,notes
2026-09-01,example-range,long,24100,23980,5000,40,0.0,A,2,yes,delete this row and log live trades
`;

const SIZING_TXT = `ABC Knowledge Centre — Position size
Equity: __________
1R % of equity: __________   →  1R rupees = __________
Entry: __________
Invalidation: __________
Risk per unit = |entry − invalidation| = __________
Size = 1R rupees / risk per unit = __________
For defined-risk options: size = 1R / max loss per spread
`;

const POLICY_TXT = `ABC Knowledge Centre — One-page risk policy
Universe I trade: 
Forbidden products:
Seat (investor / swing / F&O):
1R as % of equity:
Max open heat (R):
Daily loss cap (R):
Weekly loss cap (R):
Drawdown protocol:
No adding to losers: YES
Kill switch (what I do when a cap hits):
Review cadence:
Accountability (who I tell if I break this):
Signed: __________  Date: __________
`;

const WATCHLIST_CSV = `ticker,thesis_12_words,ruin_driver,invalidation,liquidity_note,next_event,last_review
`;

function worksheetFile(kind) {
  if (kind === "journal") {
    return { name: "abc-trade-journal.csv", type: "text/csv;charset=utf-8", body: JOURNAL_CSV };
  }
  if (kind === "sizing") {
    return { name: "abc-position-size.txt", type: "text/plain;charset=utf-8", body: SIZING_TXT };
  }
  if (kind === "policy") {
    return { name: "abc-risk-policy.txt", type: "text/plain;charset=utf-8", body: POLICY_TXT };
  }
  if (kind === "watchlist") {
    return { name: "abc-watchlist.csv", type: "text/csv;charset=utf-8", body: WATCHLIST_CSV };
  }
  return null;
}

module.exports = { worksheetFile, JOURNAL_CSV, SIZING_TXT, POLICY_TXT, WATCHLIST_CSV };

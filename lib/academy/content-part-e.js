const { expandLesson } = require("./expand");

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "technicals-09": {
    lead: "A gap is a hole in the tape: the next print is not next to the last one. On event days, that hole is the lesson — the pattern from yesterday is optional.",
    covers: ["Spot the four common gap types.", "Treat Budget, results and RBI days as a different market.", "Use opening range as a map, not a religion."],
    blocks: [
      { t: "p", text: "A gap up through resistance can be strength — or leftover short-covering. A gap down through a well-defended low is often the start of a new path, not a 'discount'. Write which it is before you buy the dip." },
      { t: "ul", items: ["Common gap — inside a range, often fills.", "Breakaway gap — leaves a base; filling is not required.", "Exhaustion gap — late in a trend, often fades.", "Event gap — results, policy; the chart did not know the number."] },
      { t: "callout", kind: "idea", title: "Opening range", text: "The first 15–30 minutes on Nifty set a box. Many desks only trade a break or a failed break of that box. If you cannot say which, you are guessing in the noisiest half-hour of the day." },
    ],
    takeaways: ["Gaps are information about overnight auction.", "Event days need smaller size or defined-risk options.", "Opening range is a map for the cash session."],
    quiz: { q: "A stock gaps 8% higher on a result and never looks back. That is most like a:", options: ["Common gap that must fill today", "Breakaway or event gap — filling is not owed to you", "Guarantee of a higher close next month", "Put-call parity trade"], answer: 1, why: "Event gaps need not fill. Hoping for a fill is not a strategy." },
  },
  "technicals-10": {
    lead: "One timeframe is a close-up. Three timeframes are a map. Mixing them without a rule is how people fade a weekly melt-up with a five-minute hammer.",
    covers: ["Assign a job to each timeframe.", "Let the higher one set bias.", "Use the lower one only as a trigger."],
    blocks: [
      { t: "ul", items: ["Weekly / daily — regime and levels.", "Hourly / 15-min — structure for the session.", "3-min / 1-min — execution, not a new thesis."] },
      { t: "p", text: "If weekly is a grind higher and the 5-minute looks toppy, a short is a scalping idea against the tide. Size it as such, or skip it. Do not promote it to a 'swing short' because the candle is pretty." },
    ],
    takeaways: ["HTF bias first.", "LTF is a trigger.", "Conflict means smaller size or no trade."],
    quiz: { q: "The weekly chart is a clear uptrend. A 5-minute shooting star is:", options: ["A mandate to short the month", "At most a short-term fade, if your rules allow it", "Proof the weekly is wrong", "A buy signal for delivery"], answer: 1, why: "Lower timeframe cannot overrule the regime by itself." },
  },
  "technicals-11": {
    lead: "An index can rise on a handful of heavyweights while most stocks fall. Breadth tells you whether the army is marching or the generals are posing.",
    covers: ["Advance–decline as a health check.", "New highs versus new lows.", "Do not confuse Nifty with 'the market'."],
    blocks: [
      { t: "p", text: "If Nifty is at a high and fewer than a third of Nifty 500 names are above their 50-day average, leadership is narrow. That can last — until it does not. Treat it as a risk note, not an automatic short." },
      { t: "callout", kind: "india", title: "India", text: "Bank Nifty can drag or lift the headline index. Always ask: is this a market, or a three-stock story?" },
    ],
    takeaways: ["Breadth is the health of a rally.", "Narrow leadership raises gap risk.", "Nifty ≠ equal-weight India."],
    quiz: { q: "Nifty makes a new high while most stocks make lower highs. This is:", options: ["Proof of a healthy bull", "Narrow leadership — a risk note", "A buy signal for every midcap", "SEBI intervention"], answer: 1, why: "Few names can carry an index. That is not the same as a broad advance." },
  },
  "technicals-12": {
    lead: "A chart without a written playbook is decoration. Turn what you just learned into if-then lines you can audit next month.",
    covers: ["Write three setups maximum.", "Each setup needs trigger, stop, size.", "Review weekly or the playbook dies."],
    blocks: [
      { t: "p", text: "Example: 'If daily is a range and price tags the lower third on falling volume, I buy a break back above the prior bar, stop under the swing, 0.5R.' That is a playbook. 'I like Bank Nifty' is not." },
    ],
    takeaways: ["Few setups, fully specified.", "If you cannot write it, you cannot review it.", "The playbook is the course made personal."],
    quiz: { q: "A usable TA playbook line must include:", options: ["A celebrity tweet", "Condition, trigger, invalidation and size", "At least five indicators", "A lucky colour"], answer: 1, why: "Otherwise it is a vibe." },
  },

  "fundamentals-09": {
    lead: "Profit on the P&L can hide in receivables and inventory. Working capital is where reported earnings become — or fail to become — cash.",
    covers: ["Cash conversion cycle.", "Receivables, inventory, payables.", "When growth is just more credit to customers."],
    blocks: [
      { t: "formula", expr: "CCC ≈ DIO + DSO − DPO", meaning: "Days inventory + days sales outstanding − days payables. A rising CCC with falling cash is a warning even if EPS is up." },
      { t: "p", text: "A retailer that 'grows' by stuffing the channel will show sales and also a pile of inventory. A capital-light software firm may have negative working capital (customers pay first). Compare CCC to the business model, not to a universal number." },
    ],
    takeaways: ["EPS without cash is a story.", "CCC must fit the model.", "Watch receivables growing faster than sales."],
    quiz: { q: "Sales up 20% and receivables up 55% most likely means:", options: ["A flawless compounder", "Collections or credit quality may be slipping", "Working capital is irrelevant", "A bonus issue"], answer: 1, why: "Top line financed by IOUs is not the same as cash." },
  },
  "fundamentals-10": {
    lead: "A DCF is a set of assumptions written in rupees. If you cannot name growth, margins, reinvestment and the discount rate, you do not have a DCF — you have a target price from a PDF.",
    covers: ["Free cash flow to the firm versus equity.", "Terminal value is most of the number — treat it with suspicion.", "Write the implied growth of the current price first."],
    blocks: [
      { t: "p", text: "Simple path: forecast five years of FCF, then a terminal using a modest growth rate (often near nominal GDP, not 15% forever). Discount at a rate that includes equity risk. Then ask: what growth is the market already paying for at today's price?" },
      { t: "callout", kind: "caution", title: "Honesty", text: "If changing WACC by 1% flips the value by 40%, say so. Sensitivity is the output, not an embarrassment." },
    ],
    takeaways: ["DCF is assumption maths.", "Terminal value dominates.", "Reverse-engineer the price before you argue cheap/dear."],
    quiz: { q: "The largest piece of a typical DCF is usually:", options: ["Year-1 FCF", "The terminal value", "Last year's dividend", "STT"], answer: 1, why: "Most present value sits in the far tail. That is why the terminal growth rate is the argument." },
  },
  "fundamentals-11": {
    lead: "A 22× P/E versus a peer at 28× is not automatically cheap. Different growth, payout, leverage and accounting can explain the whole gap.",
    covers: ["Line up like with like.", "Adjust for one-offs and extra leverage.", "Never average a bank with an FMCG on the same multiple."],
    blocks: [
      { t: "table", caption: "Ask before you call it cheap", headers: ["Check", "Why"], rows: [["Growth and ROE", "High-ROE compounders deserve a higher multiple"], ["Leverage", "Debt can juice EPS"], ["One-offs", "A land sale is not operating profit"], ["Cycle", "Peak-margin metals are not 'cheap' at 8×"]] },
    ],
    takeaways: ["Comps need a common business.", "Cheap versus a wrong peer is a trap.", "Cycle-adjust peak earnings."],
    quiz: { q: "Comparing a leveraged NBFC to a cash-rich IT firm on P/E alone is:", options: ["Best practice", "Usually misleading", "Required by SEBI", "A DCF"], answer: 1, why: "Different models, different multiples." },
  },
  "fundamentals-12": {
    lead: "In India, who owns the company and what they pledged often matters as much as last quarter's EBITDA.",
    covers: ["Promoter holding and pledge.", "Related-party transactions.", "Where to read it (shareholding, annual report, exchange filings)."],
    blocks: [
      { t: "p", text: "A 40% pledge on promoter stock is a hidden call option for the lender. If the price falls, forced selling can become the story. Related-party sales to a promoter entity can move profit off or onto the listed company. Read the related-party note. It is not optional colour." },
      { t: "callout", kind: "india", title: "Filings", text: "Shareholding pattern (exchange), annual report notes, and pledged-share disclosures are primary. Screenshots of 'unpledged now' tweets are not." },
    ],
    takeaways: ["Promoter pledge is a risk factor.", "Related parties can rewrite the P&L.", "Use exchange filings, not rumours."],
    quiz: { q: "Promoter stock pledged at high loan-to-value is mainly a risk of:", options: ["Higher dividends", "Forced selling if the price falls", "Lower STT", "Automatic buybacks"], answer: 1, why: "The lender can sell. That supply hits the tape." },
  },

  "options-09": {
    lead: "The option chain is a table of live prices, open interest and implied vol by strike. It is a map of where people have placed bets — not a magnet that price must visit.",
    covers: ["Spot, ATM, OI and volume.", "Call vs put walls as hypotheses.", "IV by strike (skew) at a glance."],
    blocks: [
      { t: "p", text: "On NSE's chain, find the expiry, find ATM (nearest strike to spot), then look at OI. A pile of call OI at 24,500 may be written calls (resistance hypothesis) or leftover hedges. Treat it as positioning, then watch whether price respects it." },
      { t: "callout", kind: "idea", title: "PCR", text: "Put-call ratios on OI or volume are temperature, not timing. Extremes can stay extreme on a one-way week." },
    ],
    takeaways: ["Chain = prices + positioning.", "OI is not a force field.", "Always note the expiry you are reading."],
    quiz: { q: "Large put OI at a strike most honestly means:", options: ["Price cannot go below it", "Many put contracts exist there — defence, hedges or speculation", "FIIs have bought the cash market", "IV is zero"], answer: 1, why: "OI is quantity. The story is a hypothesis." },
  },
  "options-10": {
    lead: "A weekly option is a short-dated bet. A monthly is a slower one. Same strike, different clock, different Greek personality.",
    covers: ["Theta and gamma rise as expiry nears.", "Weekly premium is cheaper and dies faster.", "Do not copy a monthly structure onto a weekly without resizing."],
    blocks: [
      { t: "p", text: "Selling a 1% OTM weekly put 'because last month's monthly worked' ignores that weekly gamma can explode on a 200-point Nifty day. If you use weeklies, size as if a gap is normal. If you cannot watch them, use later expiries or defined wings." },
    ],
    takeaways: ["Tenor is part of the structure.", "Weeklies = more gamma, more theta.", "Resize when you change expiry."],
    quiz: { q: "All else equal, a 2-day option versus a 30-day option at the same strike has:", options: ["Less gamma and less theta", "More gamma and faster theta", "The same Greeks", "No IV"], answer: 1, why: "Short-dated options are twitchy." },
  },
  "options-11": {
    lead: "Put-call parity is the no-arbitrage link between a European call, put, cash and the forward. When it breaks, desks trade the box — not a YouTube 'hack'.",
    covers: ["Call − put ≈ forward value − strike (discounted).", "Why you cannot get a free synthetic.", "India: index options are European, cash-settled."],
    blocks: [
      { t: "formula", expr: "C − P = DF × (F − K)", meaning: "For European options, the call-put difference tracks the forward versus strike. Exact discounting depends on rates and dividends." },
      { t: "p", text: "Buying a call and selling a put at the same strike is a synthetic long forward. If that package is mispriced versus futures, arb desks lean on it. Retail usually pays the spread instead of harvesting it." },
    ],
    takeaways: ["Parity ties calls, puts and forwards.", "Synthetics are not free.", "Know European vs American before you quote parity."],
    quiz: { q: "Long ATM call + short ATM put (same expiry) is closest to:", options: ["A risk-free bond", "A synthetic long forward / futures", "A calendar spread", "A covered call"], answer: 1, why: "That is the classic synthetic." },
  },
  "options-12": {
    lead: "You can be right on Nifty's direction and still lose if you paid too much for implied volatility. Sometimes the trade is the vol, not the index.",
    covers: ["Implied versus realised.", "IV crush after events.", "When a straddle is a vol statement."],
    blocks: [
      { t: "p", text: "If India VIX is elevated into an event, option premiums are fat. Buying a straddle needs a move larger than what is already priced. Selling a straddle needs the move to stay inside what is priced — and you need wings if you cannot take the tail." },
      { t: "lab", name: "payoff" },
    ],
    takeaways: ["IV is a price of movement.", "Event IV often dies when the news is out.", "Direction and vol are two different bets."],
    quiz: { q: "You buy a straddle into results. The stock barely moves. You likely lose because of:", options: ["Demat charges only", "IV crush and theta even if spot is near your strikes", "A bonus issue", "T+1"], answer: 1, why: "The expensive vol was the product you bought." },
  },

  "strategies-01": {
    lead: "A strategy is a structure that expresses a view with a known max loss (or a known reason you refuse the unknown one). 'I am bullish' is not a strategy.",
    covers: ["Name direction, range or volatility.", "Prefer defined risk until you can prove otherwise.", "Write max loss in rupees before you send the order."],
    blocks: [
      { t: "table", caption: "View → family", headers: ["View", "Family to study"], rows: [["Bullish, defined risk", "Bull call, bull put (credit)"], ["Bearish, defined risk", "Bear put, bear call"], ["Range, elevated IV", "Iron condor / short strangle with wings"], ["Big move, cheap IV", "Long straddle / strangle"], ["Mildly bullish, own stock", "Covered call"]] },
      { t: "p", text: "The next eleven chapters build these one at a time with Nifty-style numbers. Do not skip to condors if you cannot draw a vertical." },
    ],
    takeaways: ["View first, structure second.", "Max loss in rupees is the first cell on the card.", "Undefined risk is a choice, not a default."],
    quiz: { q: "The first line of a strategy card should be:", options: ["The credit you hope to keep", "The view and the rupee max loss", "A lucky strike", "Yesterday's VIX"], answer: 1, why: "Structure exists to express a view at a known cost of being wrong." },
  },
  "strategies-02": {
    lead: "A bull call spread buys a call and sells a higher call. A bear put spread buys a put and sells a lower put. You pay a debit. You cap both pain and glory.",
    covers: ["Debit = max loss.", "Width minus debit = max gain.", "Break-even sits inside the width."],
    blocks: [
      { t: "example", title: "Nifty bull call", body: "Spot 24,100. Buy 24,100 CE at 62.5, sell 24,300 CE at 18. Debit 44.5. Lot 65. Max loss = 44.5 × 65 = ₹2,892. Max gain = (200 − 44.5) × 65 = ₹10,107. Break-even 24,144.5. You are bullish, but not 'unlimited bullish'." },
      { t: "lab", name: "payoff" },
    ],
    takeaways: ["Verticals are defined-risk direction.", "You sold the far wing to fund the near one.", "Width is a design choice, not a default 200 points."],
    quiz: { q: "Max loss on a bull call you paid ₹44.5 for is:", options: ["Unlimited", "The debit (plus costs)", "The width plus the debit", "Zero"], answer: 1, why: "You already paid the worst case at entry, costs aside." },
  },
  "strategies-03": {
    lead: "A bull put spread sells a put and buys a lower put. You collect a credit. You want spot to stay above the short strike. The long put is the insurance you must not skip.",
    covers: ["Credit = max gain.", "Width minus credit = max loss.", "A credit is not 'free money'."],
    blocks: [
      { t: "example", title: "Bull put", body: "Sell 23,900 PE at 48, buy 23,700 PE at 22. Credit 26. Width 200. Max loss = 174 points × 65 ≈ ₹11,310. If you only saw ₹1,690 credit, you sized the nightmare 6× too small." },
    ],
    takeaways: ["Credit spreads win if you are right and patient.", "Size from max loss, not credit.", "The long wing must be liquid enough to actually hedge."],
    quiz: { q: "You should size a credit spread off:", options: ["The credit received", "Maximum loss if the long wing holds", "Lot luck", "Open interest at ATM"], answer: 1, why: "The loss is the width minus credit." },
  },
  "strategies-04": {
    lead: "A covered call is long shares plus a short call. A cash-secured put is a short put with cash to buy the stock. Both are income ideas with equity-like downside.",
    covers: ["Covered call caps upside.", "Cash-secured put: you may have to buy.", "Not a substitute for a stop on a bad business."],
    blocks: [
      { t: "p", text: "If you own 100 shares of a liquid name at ₹1,400 and sell the ₹1,500 call, you keep the premium if it stays below 1,500 and you give up gains above that. If the stock is a deteriorating business, the premium will not save you. These are for names you are willing to hold or to buy." },
    ],
    takeaways: ["Yield overlays on equity you accept.", "Assignment is a feature, not a bug.", "Do not overwrite a name you cannot own."],
    quiz: { q: "A cash-secured short put means you:", options: ["Cannot lose", "Have cash ready to buy the stock if assigned", "Are long a call", "Avoid SPAN"], answer: 1, why: "You sold the right to put the stock to you." },
  },
  "strategies-05": {
    lead: "Long straddle: buy ATM call and put. Long strangle: buy OTM call and put. You need a large move or a vol expansion. Short versions flip the risk.",
    covers: ["Long vol needs movement beyond the premium.", "Short vol needs a range — and a plan for the tail.", "Always know the combined debit or credit."],
    blocks: [
      { t: "p", text: "If the straddle costs 180 Nifty points, spot must move more than 180 by expiry (plus costs) for the long to win at expiry. Before expiry, a jump in IV can help the long even if spot is quiet — and crush the long when the event passes." },
      { t: "lab", name: "payoff" },
    ],
    takeaways: ["Straddles are vol and move bets.", "Price the required move before you buy.", "Naked short straddles are a job, not a hobby."],
    quiz: { q: "A long straddle at expiry profits if:", options: ["Spot pins ATM", "Spot moves more than the total premium paid (costs aside)", "VIX falls", "You hold CNC"], answer: 1, why: "You need the combined intrinsic to beat the debit." },
  },
  "strategies-06": {
    lead: "An iron condor is a short OTM put spread plus a short OTM call spread. You want a range. You collect a credit. The wings cap the nightmare.",
    covers: ["Four strikes, one view: 'inside'.", "Max loss = width − credit.", "Manage as short volatility with a fence."],
    blocks: [
      { t: "example", title: "Sketch", body: "Spot 24,100. Sell 23,800 PE, buy 23,600 PE, sell 24,400 CE, buy 24,600 CE. Credit 42. Width 200. Max loss ≈ 158 points × 65 ≈ ₹10,270 per set. If Nifty trends, one side is a vertical you already understood in chapter 2." },
    ],
    takeaways: ["Condor = two verticals.", "Range + defined risk.", "Do not sell the wings 'to save money' — that is how condors become straddles."],
    quiz: { q: "Dropping the long wings on a condor turns it into:", options: ["A safer trade", "A short strangle with undefined-looking tails", "A covered call", "A G-Sec"], answer: 1, why: "Wings are the insurance." },
  },
  "strategies-07": {
    lead: "A butterfly shorts the body and longs the wings, centred on a pin. An iron fly is a short straddle plus long wings. Tighter range, fatter theta, nastier gamma near the body.",
    covers: ["Pin risk at the short strike.", "Small credit/debit, large sensitivity near expiry.", "Not a beginner first structure."],
    blocks: [
      { t: "p", text: "If you cannot watch a position into expiry week, a wide condor is usually kinder than a fly sitting on ATM. Flies pay you to be right about a magnet that may not exist." },
    ],
    takeaways: ["Flies are pin trades.", "Gamma is sharp near the body.", "Skip if you cannot manage expiry."],
    quiz: { q: "An iron fly is closest to:", options: ["A long stock", "A short straddle with wings", "A bond ladder", "A SIP"], answer: 1, why: "Short ATM, long further strikes." },
  },
  "strategies-08": {
    lead: "Calendars sell the near expiry and buy the far expiry at the same strike. You are trading time and term-structure of IV, not just up or down.",
    covers: ["Near expiry dies faster — that is the thesis.", "A spike in near-term IV can hurt.", "Diagonals mix strike and expiry."],
    blocks: [
      { t: "p", text: "A typical calendar: sell this week's 24,100 CE, buy next month's 24,100 CE. You want quiet in the front and a live option in the back. If the front explodes in IV (event), the short can bite before the long catches up." },
    ],
    takeaways: ["Calendars are term-structure trades.", "Front-month events are dangerous to short.", "Diagonals add a directional tilt."],
    quiz: { q: "A calendar mainly bets on:", options: ["Only a crash", "Time decay of the front versus the back, and vol term structure", "Dividends only", "STT refunds"], answer: 1, why: "Different clocks, same strike." },
  },
  "strategies-09": {
    lead: "A ratio spread sells more options than it buys. The extra shorts fund the debit — and reopen a tail. That tail has retired more traders than it has made famous.",
    covers: ["Know the unhedged extra short.", "A 'cheap' debit can hide unlimited-looking risk.", "If you need the extra credit, you cannot afford the structure."],
    blocks: [
      { t: "callout", kind: "caution", title: "Skip until later", text: "Master verticals and condors first. Ratio call spreads into a melt-up are how people meet RMS at 2:30 pm." },
    ],
    takeaways: ["Ratios sell extra tail.", "Cheap entry is not cheap risk.", "You can live a full career without them."],
    quiz: { q: "A 1×2 call ratio (long 1, short 2 higher) has:", options: ["Defined upside always", "A short extra call that can run", "No Greeks", "Only credit risk like a G-Sec"], answer: 1, why: "The extra short is the story." },
  },
  "strategies-10": {
    lead: "An adjustment is a new trade. Rolling a loser because you cannot accept 1R often turns 1R into 3R with extra fees.",
    covers: ["Decide adjustments in the playbook, not in pain.", "Rolling down and out is optional.", "Flattening is always a valid order."],
    blocks: [
      { t: "p", text: "If the condor is breached and you 'add a credit spread the other way', you may have built an iron butterfly you never wanted, with margin you did not plan. Write the two allowed adjustments before entry. If today's idea is not on that list, exit." },
    ],
    takeaways: ["Adjustments need a pre-written menu.", "Hope-rolls are new risk.", "Exit is a professional adjustment."],
    quiz: { q: "The most underrated adjustment is:", options: ["Doubling the lots", "Closing the structure", "Removing the long wings", "Switching to a friend's account"], answer: 1, why: "Flattening realises the planned loss or leftover credit." },
  },
  "strategies-11": {
    lead: "Pick the structure from the view and from IV, not from last week's winner on social media.",
    covers: ["Direction + IV high/low + how far you can be wrong.", "A table you can screenshot into your journal."],
    blocks: [
      { t: "table", caption: "Chooser", headers: ["If you think…", "Consider"], rows: [["Up, IV not crazy", "Bull call or bull put"], ["Down, want defined risk", "Bear put or bear call"], ["Range, IV rich", "Iron condor"], ["Big move, IV cheap", "Long straddle/strangle"], ["Own stock, mildly bullish", "Covered call"], ["Will not watch expiry", "Avoid flies and naked weeklies"]] },
    ],
    takeaways: ["Chooser first, click second.", "IV regime changes the family.", "If you will not watch it, do not sell short-dated gamma."],
    quiz: { q: "Elevated IV and a range view points first to:", options: ["Long ATM straddle", "Defined-risk short premium (condor / credit spreads)", "Naked weekly straddle as a hobby", "A delivery CNC buy"], answer: 1, why: "You want to sell rich optionality with a fence." },
  },
  "strategies-12": {
    lead: "If it is not on one page, it will be renegotiated in a red hour. Fill a strategy card before the order.",
    covers: ["View, structure, strikes, expiry, max loss, 1R, adjustment menu, kill switch."],
    blocks: [
      { t: "ul", items: ["Underlying and expiry date (not 'week ahead').", "CE/PE and strikes.", "Debit or credit in rupees.", "Max loss and margin.", "What invalidates the view.", "Allowed adjustments (or 'none').", "Daily loss cap still applies."] },
      { t: "callout", kind: "desk", title: "Link", text: "This card is the same discipline as ABC's live Nifty strategy desk: named expiry, named CE/PE, named strikes." },
    ],
    takeaways: ["One page, filled before the click.", "Expiry and side in words.", "The cap on the account still sits above the structure."],
    quiz: { q: "A strategy card that omits max loss is:", options: ["Agile", "Incomplete — you do not yet have a strategy", "A hedge", "Enough if OI is high"], answer: 1, why: "Without max loss you cannot size." },
  },
});

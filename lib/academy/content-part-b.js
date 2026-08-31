const { expandLesson } = require("./expand");

const NSE = { label: "NSE — Learn", href: "https://www.nseindia.com/learn" };
const NSEFO = { label: "NSE F&O", href: "https://www.nseindia.com/products-services/equity-derivatives-overview" };

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "technicals-01": {
    lead: "A chart is a tape of prints. It is an excellent language for 'what happened' and a mediocre crystal ball. Treat it as the former and you will stay employable.",
    blocks: [
      { t: "p", text: "Price has already incorporated what the last transactors knew or believed. Technicals help you describe structure — trend, range, failed breakouts — so you can place risk. They do not repeal valuation, events, or the fact that many patterns were fitted on history." },
      { t: "callout", kind: "caution", title: "Indicator soup", text: "Five oscillators on one screen is not confirmation. It is the same price, lagged five ways. If RSI, MACD and Stochastic disagree, you did not find a 'hidden signal'. You found lag." },
      { t: "callout", kind: "idea", title: "Honest use", text: "Use charts to locate invalidation: 'If this swing low goes, my path idea is wrong.' That sentence is worth more than a candlestick encyclopedia." },
    ],
    takeaways: ["Charts describe path; they do not guarantee future path.", "One idea of structure beats six overlapping oscillators.", "Invalidation is the professional output of a chart."],
    quiz: { q: "The most professional reason to open a chart is to:", options: ["Predict tomorrow's close to the rupee", "Locate structure and an invalidation price", "Prove a TV view", "Avoid reading the business"], answer: 1, why: "Risk lives at a price. The chart helps you name it." },
  },
  "technicals-02": {
    lead: "A candle is four numbers — open, high, low, close — drawn so your eye can see the fight inside a bar. It is not a personality.",
    blocks: [
      { t: "diagram", name: "candle" },
      { t: "p", text: "The body is open-to-close. The wicks are the extremes that did not hold. A long upper wick at a known supply zone is 'buyers failed to hold the high'. A hammer after a washout is 'sellers failed to hold the low'. Context first; cartoon names second." },
      { t: "ul", items: ["Market structure: higher highs and higher lows = uptrend until it isn't.", "Break of structure: a decisive close beyond a prior swing, not a one-tick poke.", "Range: two-way trade between accepted high and low."] },
    ],
    takeaways: ["OHLC is the data; the drawing is a UI.", "Wicks are rejected prices.", "Structure is swings, not a single magical candle."],
    quiz: { q: "A long upper wick at resistance most honestly says:", options: ["The stock will gap up tomorrow", "Auction went higher and was rejected", "RSI is oversold", "Promoters bought"], answer: 1, why: "The wick is rejected auction, not a prophecy." },
  },
  "technicals-03": {
    lead: "Trend is a sequence of swings. Range is accepted value. Support and resistance are areas where the other side showed up before — they are not force fields.",
    blocks: [
      { t: "diagram", name: "structure" },
      { t: "p", text: "Draw zones, not razor lines. A 20-point band on Nifty is more honest than a line at 24,350.00. Prior highs become supply until they are accepted; prior lows become demand until they are accepted. Acceptance is time and volume spent, not a wick." },
      { t: "callout", kind: "idea", title: "Failed break", text: "A breakout that cannot hold is information. Many of the best shorts are failed highs; many of the best longs are failed breakdowns. The pattern is the failure, not the first poke." },
    ],
    takeaways: ["Zones beat pixellated lines.", "Acceptance > a single print.", "Failed breaks are trades; hopes are not."],
    quiz: { q: "Support is best treated as:", options: ["A guarantee the price cannot go lower", "An area of prior demand that may or may not return", "SEBI's floor", "The 200 DMA only"], answer: 1, why: "Prior demand is a hypothesis, not a law." },
  },
  "technicals-04": {
    lead: "Volume is participation. Price without volume can be a thin opinion. Price with expanding volume is more people agreeing — or fleeing.",
    blocks: [
      { t: "p", text: "On NSE, watch session volume versus a 20-day average, and whether the move is on rising or falling participation. A breakout on dying volume is a candidate for failure. A washout on climactic volume can be a transfer from weak to strong hands — or the start of something worse. Volume does not vote on value; it votes on urgency." },
      { t: "callout", kind: "india", title: "F&O volume vs cash", text: "Index options notional can dwarf cash. Do not read Nifty options volume as 'the cash market agrees'. They are related tapes, not the same tape." },
    ],
    takeaways: ["Volume = urgency, not truth.", "Breakouts want participation.", "Do not mix cash and options volume as one number."],
    quiz: { q: "A range break on shrinking volume is most often:", options: ["The healthiest trend start", "A candidate for a failed break", "Proof of delivery buying", "A circuit filter"], answer: 1, why: "Thin breaks fail more." },
  },
  "technicals-05": {
    lead: "Averages lag. That is the feature. They tell you where the mean of a window sat — not where tomorrow lives.",
    blocks: [
      { t: "formula", expr: "SMAₙ = (P₁ + … + Pₙ) / n", meaning: "Simple mean of the last n closes. EMA weights recent bars more. Neither predicts; both summarise." },
      { t: "p", text: "VWAP is the volume-weighted average of the session (or anchored from an event). Institutions use it as a participation benchmark: buying below VWAP is 'better than the day's average print' only in a mechanical sense. It is not a buy signal carved on a tablet." },
      { t: "callout", kind: "caution", title: "Ribbon religion", text: "A 9/21/50/200 stack that 'aligns' after a 30% rally is often just a description of the rally you already missed." },
    ],
    takeaways: ["Averages summarise a window.", "VWAP is a benchmark, not a deity.", "Do not wait for eight averages to agree on a late trend."],
    quiz: { q: "VWAP is:", options: ["A SEBI-mandated fair value", "A volume-weighted average of prints in the chosen window", "The same as book value", "Always a short signal"], answer: 1, why: "It is a weighted mean of trades." },
  },
  "technicals-06": {
    lead: "RSI asks how complete recent gains were versus losses. MACD asks how two moving averages are separating. Both are transformations of price. They cannot know an RBI decision.",
    blocks: [
      { t: "p", text: "Wilder's RSI (typically 14) oscillates 0–100. 'Overbought' in a strong trend can stay overbought. Using RSI 70 as an automatic short is how people fade a one-way market. MACD histogram shrinking means momentum of the average spread is cooling — not that a top is in." },
      { t: "callout", kind: "idea", title: "Divergence", text: "Price higher, RSI lower is a warning of cooling thrust. It can persist. Treat it as a reason to tighten risk, not as a market-order short." },
    ],
    takeaways: ["Oscillators lag transformations of the same tape.", "Overbought can persist in trend.", "Divergence is a risk note, not a trigger by itself."],
    quiz: { q: "RSI at 75 in a months-long uptrend most likely means:", options: ["A guaranteed crash tomorrow", "Recent closes have been strong relative to recent losses", "The company is overvalued", "FII selling"], answer: 1, why: "RSI measures recent thrust, not valuation." },
  },
  "technicals-07": {
    lead: "Head-and-shoulders, flags, cups: they are cartoons of supply and demand. Some have modest edges in studies. None pay rent if you ignore costs, selection bias, and the setups that did not complete.",
    blocks: [
      { t: "p", text: "If you log 50 pattern trades with entry, stop, target, and whether you cherry-picked after the fact, you will learn more than from 50 Twitter screenshots. Base rates matter: many 'perfect' triangles break the wrong way." },
      { t: "callout", kind: "caution", title: "Hindsight drawing", text: "If the pattern is only obvious after the move, you did not have a pattern. You had a caption." },
    ],
    takeaways: ["Patterns need rules and a log.", "Costs eat textbook edges.", "If you cannot define invalidation, you do not have a pattern trade."],
    quiz: { q: "A pattern without a pre-defined invalidation is:", options: ["Advanced price action", "A story", "A hedge", "A SEBI circular"], answer: 1, why: "No invalidation, no trade — only a narrative." },
  },
  "technicals-08": {
    lead: "A checklist turns a chart from a Rorschach test into a decision. Write it before the open.",
    blocks: [
      { t: "ul", items: ["Bias: trend, range, or event day?", "Level: where is the idea wrong?", "Trigger: what print or close activates it?", "Size: R defined before entry.", "Catalyst: is there a number today that makes structure irrelevant?", "Liquidity: can you exit?", "Forbidden: no chasing the first 90 seconds without a plan."] },
      { t: "callout", kind: "desk", title: "Audit", text: "Once a week, score the checklist against the journal. If you skip the same line every time, that line is your leak." },
    ],
    takeaways: ["Checklist before the open.", "Trigger ≠ bias.", "The skipped line is the leak."],
    quiz: { q: "The checklist item that most often saves an account is:", options: ["A prettier colour scheme", "Pre-defined invalidation and size", "More indicators", "A lucky number"], answer: 1, why: "Risk is named in advance." },
  },

  "futures-01": {
    lead: "A derivative's first job is risk transfer. Hedgers pay to lock a price. Speculators and market-makers sit on the other side. If you do not know which seat you occupy, the contract will decide for you.",
    blocks: [
      { t: "p", text: "Futures are standardised forward contracts: you agree a price now for a later settlement, marked to market daily. You are not 'buying Nifty cheap'. You are running a leveraged bet on the index with a maintenance margin." },
      { t: "callout", kind: "idea", title: "Why they exist", text: "A producer locking sale price, a fund overlaying beta, an importer locking USDINR — those are economic uses. Your discretionary long is optional. Their hedge is often not." },
    ],
    takeaways: ["Futures transfer risk on a timetable.", "Daily MTM is the discipline.", "Know if you are hedging or speculating."],
    quiz: { q: "The original economic purpose of futures is primarily:", options: ["Retail lottery tickets", "Standardised risk transfer and price locking", "Avoiding KYC", "Eliminating STT"], answer: 1, why: "Hedging and discovery came first." },
    sources: [NSEFO],
  },
  "futures-02": {
    lead: "Lot size × tick × multiplier is how a 'small' index move becomes a large rupee P&L. Read the contract specification before you admire the chart.",
    blocks: [
      { t: "table", caption: "Read the spec", headers: ["Field", "Why it matters"], rows: [["Underlying", "Index vs single stock vs commodity"], ["Lot size", "Your notional = lots × lot size × price"], ["Tick", "Minimum price step; tick value in rupees"], ["Expiry", "Weekly / monthly; last trading day"], ["Settlement", "Cash vs physical intent"], ["Freeze quantity", "Max you can send in one order"]] },
      { t: "p", text: "Stock futures lots were redesigned over years so notional stays meaningful. Never assume last year's lot. Check the circular." },
    ],
    takeaways: ["Notional, not premium, is the size of a future.", "Specs change; verify.", "Freeze quantity is an exchange control, not a suggestion."],
    quiz: { q: "Futures P&L for a given tick is determined by:", options: ["Your opinion of RSI", "Lot size and the rupee value of a tick", "Face value of the share only", "The broker's logo"], answer: 1, why: "Contract maths, not feelings." },
    sources: [NSEFO],
  },
  "futures-03": {
    lead: "Mark-to-market is daily cash. SPAN + exposure margins are the collateral. If you cannot pay MTM, the broker reduces you. That is the product working as designed.",
    blocks: [
      { t: "formula", expr: "Day P&L ≈ (today's settlement − prior settlement) × lot × lots", meaning: "Futures are revalued every day. Profits credit; losses debit. Overnight gaps still settle." },
      { t: "p", text: "Initial margin is not the maximum you can lose. A limit-down gap can exceed posted margin. Extra 'buffer' is adult behaviour, not cowardice." },
      { t: "callout", kind: "caution", title: "Peak margin", text: "Intraday peak margin rules mean you cannot hide from margin between prints. Calendar-spread credits can also jump when correlations break." },
    ],
    takeaways: ["MTM is cash, daily.", "Margin ≠ max loss.", "Keep a buffer above SPAN."],
    quiz: { q: "Posted SPAN margin on a Nifty future is:", options: ["The most you can lose", "Collateral against daily MTM — losses can exceed it in a gap", "A guaranteed profit", "STT"], answer: 1, why: "Gaps do not respect your posted number." },
  },
  "futures-04": {
    lead: "Basis is futures minus cash (or the other way around, be consistent). Roll is how you migrate from the dying month to the next. Expiry week is a different market.",
    blocks: [
      { t: "p", text: "Contango (futures above cash) and backwardation (below) have stories — rates, dividends, convenience yield, hedging pressure. For index futures, fair value is roughly cash plus cost of carry minus expected dividends. Cheap/rich versus fair value is an arb desk's language, not a retail 'buy the discount' slogan." },
      { t: "callout", kind: "india", title: "Expiry", text: "Weekly index expiries concentrate gamma and weirdness. If you do not have a roll plan, you will donate to those who do." },
    ],
    takeaways: ["Basis has a fair-value story.", "Roll is a cost or a credit — measure it.", "Expiry week is not your ordinary Tuesday."],
    quiz: { q: "Holding a last-day in-the-money stock future into expiry without a plan is:", options: ["Always clever", "A settlement/assignment event you must understand in advance", "Risk-free", "The same as a delivery CNC buy"], answer: 1, why: "Expiry has rules. Learn them before the bell." },
  },
  "futures-05": {
    lead: "Index futures are a clean beta bet. Stock futures add single-name gap risk, wider basis, and possible ban-list drama.",
    blocks: [
      { t: "ul", items: ["Index: diversified, liquid, still leveraged.", "Stock: corporate actions, circuit filters, MWPL, delivery-intent stories.", "Beta overlay: funds use index futures to add or cut market exposure without selling cash names."] },
      { t: "p", text: "A stock future that looks 'cheap to cash' can stay cheap because it is hard to borrow or because you cannot arb it cleanly. Do not assume cash-and-carry is free money without the borrow and the costs." },
    ],
    takeaways: ["Index vs stock futures are different risk species.", "Ban list and circuits belong to stock F&O.", "Cheap basis is not always an arb."],
    quiz: { q: "Market-wide position limits (MWPL) and F&O bans apply mainly to:", options: ["Nifty index options only", "Stock derivatives when open interest hits thresholds", "Gold ETFs", "Your savings account"], answer: 1, why: "Single-stock F&O has MWPL." },
  },
  "futures-06": {
    lead: "A hedge is a size problem first. One Nifty lot against a ₹2 crore cash book is theatre. Match the beta-adjusted notional, or admit you are speculating.",
    blocks: [
      { t: "formula", expr: "Hedge lots ≈ (Portfolio value × β) / (Index × lot size)", meaning: "Rough overlay. Beta 1.0, ₹1 crore, Nifty 25,000, lot 65 → about 6 lots. Recalculate; this is a sketch, not your RMS." },
      { t: "p", text: "Short index futures against longs reduces market risk and keeps single-name risk. It does not save you if your stocks collapse versus the index (basis risk). Puts as hedges have a known premium; futures hedges have unknown MTM." },
    ],
    takeaways: ["Hedge ratio is maths.", "Basis risk remains.", "A token lot is not a hedge."],
    quiz: { q: "One Nifty lot against a multi-crore book is:", options: ["A perfect hedge", "Mostly symbolic unless notionals match", "Illegal", "A bond"], answer: 1, why: "Notional match defines a hedge." },
  },
  "futures-07": {
    lead: "Leverage is how a correct idea still kills you. The market can stay wrong longer than your margin can stay solvent.",
    blocks: [
      { t: "p", text: "A 1.2% Nifty day is background noise in delivery. On 10× notional it is a career event. People remember the 12% month; they forget the path that would have stopped them out on Tuesday." },
      { t: "callout", kind: "caution", title: "Intraday 'extra' leverage", text: "Broker MIS leverage is a loan with a very short temper. Treat peak intraday buying power as a temptation metric, not a target." },
    ],
    takeaways: ["Leverage converts volatility into survival risk.", "Path matters when you are geared.", "MIS extra leverage is not free edge."],
    quiz: { q: "The silent account killer in futures is usually:", options: ["Too much reading", "Size relative to equity and gaps", "T+1", "Dividends"], answer: 1, why: "Size × gap = ruin." },
  },
  "futures-08": {
    lead: "When stock F&O open interest hits market-wide limits, the name can go into a ban period: you may not increase positions. Exits and reductions only.",
    blocks: [
      { t: "p", text: "MWPL exists so a single name's derivatives cannot become a systemic crowding problem. Check ban lists daily if you run stock F&O. Entering a banned name, or adding, is how you meet RMS the hard way." },
      { t: "callout", kind: "source", title: "Read the circular", text: "NSE publishes MWPL and ban period files. Screenshots in groups lag. Use the exchange." },
    ],
    takeaways: ["Ban = no new risk.", "MWPL is a crowding brake.", "Primary source is the exchange file."],
    quiz: { q: "During an F&O ban period you generally may:", options: ["Freely add lots", "Only reduce or close, not increase", "Ignore RMS", "Convert to crypto"], answer: 1, why: "Ban restricts increasing exposure." },
    sources: [NSEFO],
  },

  "options-01": {
    lead: "A call is the right to buy. A put is the right to sell. The seller of that right collects premium and wears the obligation. Rights versus obligations is the whole subject.",
    blocks: [
      { t: "diagram", name: "payoff-long-call" },
      { t: "p", text: "Buyers have a known debit and unknown upside (call) or protection (put). Sellers have a known credit and a short option-shaped risk. European-style cash-settled index options in India do not get exercised early the way some American stock options can — know your style." },
      { t: "callout", kind: "india", title: "Index vs stock options", text: "Nifty options are cash-settled, European. Stock options have different settlement/exercise mechanics. Do not mix the rulebooks." },
    ],
    takeaways: ["Right vs obligation.", "Buyer: defined debit. Seller: defined credit, not defined pain.", "Contract style matters."],
    quiz: { q: "Selling a call means you:", options: ["Own a right with no duty", "Have the obligation if assigned/settled in the money", "Cannot lose", "Avoid SPAN"], answer: 1, why: "Short calls carry obligation." },
  },
  "options-02": {
    lead: "If you cannot draw the expiry payoff with a pencil, you do not understand the structure. Software should confirm the sketch, not replace it.",
    blocks: [
      { t: "diagram", name: "payoff-long-put" },
      { t: "ul", items: ["Long call — hockey stick up; loss = premium.", "Long put — hockey stick down; loss = premium.", "Short call/put — inverted; profit capped at premium.", "Vertical spread — two strikes, defined max gain and loss.", "Iron condor / butterfly — defined range bets."] },
      { t: "p", text: "At expiry, time value dies. Before expiry, the live P&L is the mark — Greeks explain why it does not match the expiry cartoon yet." },
    ],
    takeaways: ["Draw expiry first.", "Live P&L ≠ expiry cartoon until the end.", "Defined-risk means you can name both wings."],
    quiz: { q: "A bull call spread's maximum loss is:", options: ["Unlimited", "The net debit paid (plus costs)", "The width plus the debit", "Zero"], answer: 1, why: "You paid a debit for a defined wing." },
  },
  "options-03": {
    lead: "Premium = intrinsic + time value. Moneyness says whether intrinsic exists. Theta is the rent time value pays to the seller — until implied volatility or a move overrules the calendar.",
    blocks: [
      { t: "formula", expr: "Intrinsic(call) = max(S − K, 0)", meaning: "Put intrinsic is max(K − S, 0). Everything else is time value, including IV." },
      { t: "p", text: "ITM, ATM, OTM are relative to spot (or forward, if you are precise). A weekly 2% OTM put can be a cheap lottery; a monthly ATM straddle is a volatility statement. Do not use one personality for all moneyness." },
    ],
    takeaways: ["Split intrinsic and time.", "Theta is not a salary if IV explodes.", "Moneyness changes the job of the option."],
    quiz: { q: "A far OTM weekly call with two days left is mostly:", options: ["Intrinsic value", "Time/volatility value that can go to zero fast", "A bond", "A share"], answer: 1, why: "No intrinsic; time is the whole premium." },
  },
  "options-04": {
    lead: "Implied volatility is the number the market plugs into a model to justify the premium. It is not 'how much it will move'. It is 'how expensive optionality is right now'.",
    blocks: [
      { t: "p", text: "High IV means fat premiums (good for defined-risk selling if you understand tail risk; painful for buyers). IV crush after an event is why people lose on the correct direction. The smile/skew: OTM puts often trade richer than a lognormal model because people pay for crashes." },
      { t: "callout", kind: "idea", title: "India VIX", text: "India VIX is a 30-day implied volatility index on Nifty. It is a temperature, not a timing oracle. Mean reversion of VIX is a research claim with exceptions — crashes reset the mean." },
    ],
    takeaways: ["IV is a price of optionality.", "Directionally right + IV crush = still red.", "Skew exists because left tails are feared."],
    quiz: { q: "You buy a straddle into results and the stock barely moves. You likely lose because of:", options: ["STT only", "IV crush and theta even if the close is near your strikes", "Demat charges", "Bonus shares"], answer: 1, why: "Event IV collapses when the news is out." },
  },
  "options-05": {
    lead: "Greeks are the local slopes of the pricing function. They are maps of sensitivity, not personalities.",
    blocks: [
      { t: "table", caption: "First-order desk", headers: ["Greek", "Asks"], rows: [["Delta", "How much premium if spot moves ₹1 (share-equivalent)"], ["Gamma", "How fast delta changes"], ["Theta", "Carry per day if nothing else moves"], ["Vega", "Sensitivity to IV"], ["Rho", "Rates — usually second-order for short-dated Nifty"]] },
      { t: "p", text: "A short-gamma book makes money if realised volatility is quiet and dies if the tape gaps. Know your gamma sign before you know your 'view'." },
      { t: "diagram", name: "greeks" },
    ],
    takeaways: ["Delta is exposure; gamma is how it mutates.", "Short gamma needs calm; long gamma needs movement.", "Vega is the IV lever."],
    quiz: { q: "A short straddle is typically:", options: ["Long gamma, long vega", "Short gamma, short vega", "Delta-neutral forever without hedges", "A delivery investment"], answer: 1, why: "You sold optionality." },
  },
  "options-06": {
    lead: "Spreads, condors and butterflies exist to cap the nightmare wing. You pay for that cap with a smaller credit or a debit. There is no free defined-risk money.",
    blocks: [
      { t: "ul", items: ["Vertical: same type, two strikes — directional defined risk.", "Iron condor: short OTM put spread + short OTM call spread — range.", "Iron butterfly: short ATM straddle, long wings — tighter range, fatter theta, nastier gamma at the pin.", "Calendars/diagonals: different expiries — you are trading term structure, not just direction."] },
      { t: "callout", kind: "caution", title: "Pin risk and gaps", text: "Defined risk is defined at expiry under the model of settlement. A gap through your short strike still hurts until the long wing catches it — and the long wing can be illiquid." },
    ],
    takeaways: ["Wings are insurance.", "Range trades are short volatility with a cap.", "Liquidity of the long wing is part of the structure."],
    quiz: { q: "An iron condor is primarily a bet that:", options: ["Spot explodes", "Spot stays inside a range and short optionality pays you, with wings capping tail loss", "Dividends rise", "SEBI bans the stock"], answer: 1, why: "It is a defined-range short-vol structure." },
  },
  "options-07": {
    lead: "Exercise is using the right. Assignment is being on the other side of that. Settlement is how the exchange turns it into cash or shares. Know the calendar.",
    blocks: [
      { t: "p", text: "Cash-settled European index options settle to a special/expiry value — you cannot 'take delivery of Nifty'. Stock options can involve physical settlement in the specified scheme. Do not hold a short ITM stock option into expiry because you 'forgot'." },
      { t: "callout", kind: "india", title: "Read the circular", text: "Physical settlement of stock derivatives has been the direction of policy for years. Your broker's RMS may square you before you learn the hard way." },
    ],
    takeaways: ["Index: cash. Stock: know physical rules.", "Short ITM into expiry is a decision, not an accident.", "Broker RMS may close you first."],
    quiz: { q: "Nifty options at expiry are generally:", options: ["Physically delivering 50 shares", "Cash-settled to the official expiry value", "Converted to bonds", "Tax-free"], answer: 1, why: "Index options cash-settle." },
  },
  "options-08": {
    lead: "Size the book by the nightmare, not the credit. A ₹8,000 credit that can become a ₹1.3 lakh SPAN-plus-gap hole is not an 8,000-rupee trade.",
    blocks: [
      { t: "ul", items: ["Defined-risk: max loss per spread × number of spreads ≤ 1R.", "Undefined-looking shorts: haircut as if the wing you 'would have bought' is on.", "Correlation: five short premium names is one vol bet.", "Daily loss cap in R, not in 'one more adjustment'."] },
      { t: "callout", kind: "desk", title: "Worksheet", text: "Before each structure: max loss, margin, delta at entry, what you do if spot gaps 1.5× ATR. If any cell is blank, you are not sized. You are hoping." },
    ],
    takeaways: ["Nightmare defines size.", "Credits are not the risk.", "Adjustments are optional; ruin is not."],
    quiz: { q: "The correct denominator for an options structure's size is:", options: ["The credit received", "Maximum plausible loss (and margin path)", "The lot's lucky number", "Yesterday's profit"], answer: 1, why: "Risk is the loss, not the credit." },
  },
});

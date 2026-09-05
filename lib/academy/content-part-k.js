const { expandLesson } = require("./expand");

const NSE = { label: "NSE", href: "https://www.nseindia.com" };
const SEBI = { label: "SEBI", href: "https://www.sebi.gov.in" };
const RBI = { label: "RBI", href: "https://www.rbi.org.in" };
const MCX = { label: "MCX", href: "https://www.mcxindia.com" };

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "microstructure-01": {
    lead: "Price is not a number hanging in the air. It is the last print where a buyer and a seller agreed. Everything advanced — VWAP, impact, expiry pins — starts from how that print is made in India.",
    covers: [
      "The book is bids and offers with size, not a single last.",
      "India is mostly a lit, order-driven market.",
      "Your order type is a speech act: it tells the book how desperate you are.",
    ],
    blocks: [
      { t: "p", text: "On NSE cash and F&O you see a five-level market depth: five bids, five offers, quantities attached. That is not the whole iceberg. It is a window. A 24,180 Nifty future 'last' with 40 lots on the offer and 4 on the bid is a different tape from the same last with 400 on the bid. Last is a headline. Depth is the paragraph." },
      { t: "p", text: "Order-driven means computers match contra orders by price-time priority. There is no NYSE-style specialist assigning a fair price. If you lift the offer, you paid the offer. If you join the bid, you wait. Market orders in a thin name are a confession that time matters more to you than price — and the book will charge you for that confession." },
      { t: "table", caption: "What the five-level book is trying to say", headers: ["You see", "Often means", "Does not mean"], rows: [
        ["Stacked bids, thin offers", "Dip-buyers present for now", "A floor that cannot gap"],
        ["Offers refresh as you lift", "A seller (or algo) is working size", "The day is over"],
        ["Both sides empty at the touch", "Event, halt, or a name nobody owns", "A free fill"],
      ] },
      { t: "callout", kind: "india", title: "No dark pool romance", text: "Indian cash and F&O are overwhelmingly on-exchange. Block and bulk deals exist; they are disclosed, not a secret cellar. Do not import US dark-pool folklore onto Nifty weeklies." },
      { t: "example", title: "One lot, two speeches", body: "You need 1 lot Nifty 24,200 CE. The ask is 41.50 × 80, bid 41.00 × 20. A market buy pays 41.50 and teaches the tape you would not wait. A limit 41.15 may fill if a seller leans, or miss if the next print is 42. The ₹0.35 × 65 = ₹22.75 is not the point. The point is whether your edge survives paying the offer every time." },
    ],
    takeaways: ["Last is a print, not a valuation.", "Depth is a hypothesis that can vanish.", "Order type is part of the strategy."],
    quiz: { q: "Lifting the offer on a thin stock primarily tells the book:", options: ["You have secret information", "You prefer speed to price", "SEBI required it", "VWAP just flipped"], answer: 1, why: "A marketable buy pays for immediacy." },
    sources: [NSE],
  },
  "microstructure-02": {
    lead: "NSE's cash pre-open (call auction) is a matching of orders collected before 9:15, not a crystal ball. The equilibrium price is a vote of overnight orders — useful, noisy, and frequently faded by people who confuse it with 'the day's direction'.",
    covers: ["Call auction finds one opening price from a batch.", "Indicative price during the window is a live draft.", "Gap at 9:08 is not a 9:16 plan."],
    blocks: [
      { t: "p", text: "Orders sit. The engine searches for a price that maximises matched volume (with a tie-break rule). That price opens the continuous session. A stock that 'opens 4% up' in pre-open can trade back to yesterday's close by 9:40 if the overnight orders were a thin crowd, not a new valuation." },
      { t: "ul", items: ["Use pre-open to see where overnight urgency sits — not to size a full-day long.", "A wide indicative swing in the last minutes of the window means the open is still being negotiated.", "Index futures often lead the cash open. If Nifty futures already faded the gap, cash catching up is not a surprise.", "Do not send a marketable F&O order at 9:15:15 because the cash auction printed a number you like."] },
      { t: "callout", kind: "caution", title: "The 9:16 trap", text: "Retail market orders dumped into the first minute of continuous trading are catnip for anyone who watched the auction. If your edge needs the open, write a limit and a kill time. If it does not need the open, wait for the first five-minute bar to close." },
      { t: "example", title: "Gap and fade", body: "Infosys closed 1,480. Pre-open indicates 1,512 on a US-hours beat. Futures already gave back half. A long at 1,512 with a 1,505 stop is 7 rupees of hope. A written rule: 'I only fade a >2% cash gap if futures have already mean-reverted 40% of it and ADX on the 15-min is still <20.' That is a strategy. 'Looks extended' is a mood." },
    ],
    takeaways: ["Auction is a batch match.", "Indicative ≠ destiny.", "Write the open as a session, not as a religion."],
    quiz: { q: "A stock indicating +5% in pre-open most honestly means:", options: ["The day will close green", "Overnight orders currently clear at that price — the continuous session can disagree", "FII buying is confirmed", "You must buy the open"], answer: 1, why: "The auction is a draft. Continuous trading is the rest of the book." },
    sources: [NSE],
  },
  "microstructure-03": {
    lead: "The closing auction (and the cash close used for derivatives settlement references) is where NAV-like, index, and 'I must be flat' orders meet. Advanced desks treat the last 30 minutes as a different market from 11am.",
    covers: ["Close is a liquidity event.", "VWAP hunters and indexers show up.", "Do not discover your size in the last two minutes unless that is the plan."],
    blocks: [
      { t: "p", text: "Index funds, ETFs, and some F&O hedges care about the official close. That demand is not a secret. If you are trying to be clever by selling into the last tick of a rebalancing day, you are in a crowd of people who read the same circular. If you are trying to get a quiet fill for a swing long, 15:20 on a rebalance day is the wrong room." },
      { t: "p", text: "On F&O, expiry day's close is a pin magnet plus a hedging scramble. Dealer gamma, max-pain folklore, and genuine delta to cover all show up at once. Your job is to have already decided: am I a pin participant, a fade of the scramble, or flat? 'I'll see' at 15:22 is how weeklies become a tax." },
      { t: "table", caption: "Session personalities (cash)", headers: ["Window", "Often dominated by", "Advanced habit"], rows: [
        ["9:15–9:45", "Overnight gaps, news, stops", "Small size or written open rule"],
        ["10:00–14:00", "Inventory, VWAP, real flow", "Where most process lives"],
        ["14:30–15:30", "Close, hedges, funds", "Do not start a new thesis"],
      ] },
    ],
    takeaways: ["The close is a different tape.", "Expiry close is a job, not a vibe.", "If you need the print, say so on the ticket."],
    quiz: { q: "Starting a fresh directional Nifty weekly at 15:18 on expiry is usually:", options: ["Professional timing", "Trading the scramble without a written role", "Required by SPAN", "A DCF"], answer: 1, why: "The last minutes are inventory, not discovery — unless that is the written trade." },
  },
  "microstructure-04": {
    lead: "Market impact is the price you cause by being there. A 2-lot Nifty hedge does not move the world. A 40-lot marketable buy in a midcap option does. Advanced size is a sequence, not a click.",
    covers: ["Impact ≈ how much the book must walk to fill you.", "Child orders (TWAP/VWAP-ish slicing) are a tool, not magic.", "If your edge is 8 bps and impact is 12, you do not have an edge."],
    blocks: [
      { t: "formula", expr: "Implementation shortfall ≈ arrival price − actual fill (signed)", meaning: "Arrival is the decision price. Everything after — delay, spread, walk-the-book — is cost. Track it or you will think your strategy is worse than it is (or better)." },
      { t: "p", text: "Retail platforms rarely offer true exchange algos. You still slice: 20% now, 30% on a 5-min VWAP reclaim, rest as a limit that dies at 14:00. That is an execution policy. Slamming 100% at 9:16 is also a policy — a bad one, unless the thesis dies if you wait ten minutes, in which case write that." },
      { t: "callout", kind: "caution", title: "Icebergs and ghosts", text: "You cannot reliably 'see icebergs' on five-level Indian depth. Refreshing size at the same tick can be an algo, a human, or coincidence. Do not build a religion on spoof-detection YouTube." },
      { t: "example", title: "Shortfall maths", body: "You decide long at 1,400. You chase to 1,406 across 2,000 shares. Shortfall ₹6 × 2,000 = ₹12,000. If your profit target was ₹8, the trade was dead before the thesis. Either slice, or pass. There is no third cleverness." },
    ],
    takeaways: ["Fill quality is part of P&L.", "Slice when the book is the risk.", "Arrival price is the honest benchmark."],
    quiz: { q: "Implementation shortfall measures:", options: ["Only brokerage", "The gap between decision price and what you actually paid, signed", "SEBI turnover fee", "Max pain"], answer: 1, why: "It is the execution P&L of the decision." },
  },
  "microstructure-05": {
    lead: "Tick size and price bands are the rails. A ₹0.05 tick on a ₹40 option is coarse; a ₹0.05 tick on a ₹2,000 stock is fine. Circuit filters and ASM change what 'the book' is allowed to be.",
    covers: ["Tick size sets the grid.", "Price bands cap the day's argument.", "ASM/GSM and F&O ban list change liquidity, not just headlines."],
    blocks: [
      { t: "p", text: "If an option's fair value lives between two ticks, the market will flicker. That flicker is not 'manipulation' every time. It is a discrete grid trying to host a continuous idea. Your limit should sit on a tick you are willing to own, not on a fantasy midpoint." },
      { t: "p", text: "A 5% band on a cash name means the continuous book cannot print 6% up without a freeze/call-auction mechanics. People who 'wait for the round number' on a banded name are waiting for a regulator's architecture. Trade the rule, or stand aside." },
      { t: "ul", items: ["F&O ban (MWPL) is not a dare. Ban means you cannot increase the position. Square or hold — do not 'average'.", "ASM additional surveillance can widen bands or add extra margins. Liquidity dies first; opinion dies second.", "Tick size changes from NSE circulars are operational. Update your 'minimum edge in ticks' when they do."] },
    ],
    takeaways: ["The grid is part of the product.", "Bands are architecture, not a chart pattern.", "Ban list is a position constraint, not a tweet."],
    quiz: { q: "A stock hitting its upper circuit in cash primarily means:", options: ["Guaranteed more upside tomorrow", "The allowed band is full — matching is constrained by the rule, not by your target", "FII announced a buy", "You should market-buy the option"], answer: 1, why: "Circuits freeze the argument at a rail." },
    sources: [NSE, SEBI],
  },
  "microstructure-06": {
    lead: "Block deals and bulk deals are the institutional hallway. They are disclosed. Reading them as 'smart money just bought, copy' is how you buy the leftover.",
    covers: ["Bulk: ≥0.5% of equity in a day (reporting).", "Block: a negotiated window at a reference price band.", "Delivery extra on the tape is not the same as a block."],
    blocks: [
      { t: "p", text: "A bulk deal print tells you someone transacted a reportable chunk. It does not tell you whether they are starting, finishing, or washing a book. A promoter selling 0.6% into a block is not the same story as a new FPI building a 4% stake over a month of quieter buys." },
      { t: "p", text: "Advanced habit: tag the counterparty type when the exchange gives it, compare to 20-day delivery %, and wait a session before you imitate. If the name is illiquid, the print is the event — chasing it is paying the liquidity tax twice." },
      { t: "callout", kind: "india", title: "Bulk vs block", text: "Do not mix the words. Block is a specific window. Bulk is a reporting threshold on normal market trades. Your broker's 'bulk deal alert' is a newspaper, not an order." },
    ],
    takeaways: ["Disclosed ≠ a signal to clone.", "Identify starter vs. finisher if you can.", "Illiquid prints are events, not invitations."],
    quiz: { q: "A bulk deal in a midcap most honestly says:", options: ["Copy the trade immediately", "A reportable size printed — motive and remainder are unknown", "The stock cannot fall", "Options IV just died"], answer: 1, why: "Reporting is not a thesis." },
  },
  "microstructure-07": {
    lead: "Index additions, deletions, and rebalances are scheduled liquidity events. The dumb trade is buying the inclusion headline the day before. The advanced trade is mapping who must buy, who already did, and what the float actually is.",
    covers: ["Passive funds must transact near the effective date.", "The announcement-to-effective window is where the game is.", "Float and capping rules matter more than the press release."],
    blocks: [
      { t: "p", text: "When a name enters Nifty 50, every Nifty index fund and ETF has a mechanical bid. That bid is forecastable in size = AUM × weight. If the stock already ran 18% from announcement to the day before inclusion, you are not early. You are the exit liquidity for people who did the same arithmetic three weeks ago." },
      { t: "example", title: "Weight sketch", body: "Index AUM tracking Nifty 50 ≈ a very large number; a 0.4% weight is still thousands of crores of potential demand. But if free float is tight and the stock already absorbed half of that in the window, the effective-date open can be a sell. Write both sides or do not play." },
      { t: "p", text: "The same logic inverted: deletion is a scheduled supply. Shorting a deletion name into a squeeze is how people learn about borrow and buy-ins. If you cannot borrow cleanly, you do not have a short — you have a wish." },
    ],
    takeaways: ["Rebalance is a calendar.", "Price into the event often is the event.", "Size the mechanical bid; do not tweet it."],
    quiz: { q: "The highest-edge window in an index inclusion is usually:", options: ["The first tick after inclusion, market-on-open, every time", "The announcement-to-effective window, after you estimate how much passive buying is left", "Never — inclusions never move price", "Only in the closing auction of 2014"], answer: 1, why: "Mechanical demand is known early; leftover demand is the question." },
  },
  "microstructure-08": {
    lead: "Corporate-action adjustments on F&O (bonus, split, dividend, rights) change strikes, lots, and the chain you thought you knew. Expiry week plus a record date is how 'simple' weeklies become a different contract.",
    covers: ["The exchange publishes adjustment circulars — read them.", "Strikes and lots can change; your stop in 'old rupees' is then fiction.", "A dividend near expiry is a pin with a cash leak."],
    blocks: [
      { t: "p", text: "If you are long a call through a large special dividend, part of the value may walk out as cash to the stock holder, not to you, depending on the adjustment. Do not be the person who discovers this on the contract note. NSE circulars are dull and correct." },
      { t: "ul", items: ["Before you hold a stock-option over a record date, search the circular.", "Adjusted contracts can be illiquid. Exit into the liquid unadjusted month if that is the real market.", "Bonus/split: your quantity and strike rebase. Heat in rupees should be recomputed, not 'the same lots'."] },
      { t: "callout", kind: "caution", title: "Old strike stickers", text: "Your journal saying 'long 1,000 CE' after a 1:1 bonus is a lie. It is now a different 500-equivalent world, or whatever the circular says. Rewrite the card." },
    ],
    takeaways: ["Circulars beat memory.", "Adjusted chains can be ghost towns.", "Recompute heat after every action."],
    quiz: { q: "A large special dividend is declared while you sit long stock calls through record date. First action:", options: ["Ignore it, options are cash-settled vibes", "Read the NSE adjustment circular and recompute payoff", "Double the position", "Switch to crypto"], answer: 1, why: "Adjustments are contract law, not folklore." },
    sources: [NSE],
  },
  "microstructure-09": {
    lead: "Borrow, short-selling, and STBT/ETB lists are plumbing. A beautiful short thesis on a name you cannot borrow is a book report.",
    covers: ["Cash shorting in India is constrained versus the US story.", "F&O is often how Indians express short.", "Hard-to-borrow is a price, not a moral failing."],
    blocks: [
      { t: "p", text: "In cash, shorting is not a casual retail sport the way US margin shorts are in Twitter lore. Stock futures and options are the usual short expression. That means your short has an expiry, a basis, and a roll cost. 'I'll short it forever' is a cash-market sentence. Translate it." },
      { t: "p", text: "When a stock future trades rich to cash, the short-future / long-cash is a basis trade for people who can actually long the cash and hold. If you only short the rich future, you are short the name and short the basis. Know which." },
      { t: "example", title: "The unborrowable crush", body: "A midcap promoter-pledge story looks obvious. Stock futures are in ban. Options IV is 90. You sell ATM puts because 'it has to fall'. Ban + no borrow + short put is how accounts die: the stock can squeeze, you cannot add shorts, and your put is a magnet for assignment-shaped pain. The advanced move is often no trade." },
    ],
    takeaways: ["Expression of short must exist in the product.", "Basis is a second bet.", "Ban + short premium is a known graveyard."],
    quiz: { q: "You cannot borrow a cash name and the future is banned. The honest short is usually:", options: ["Sell puts sized 'small'", "Stand aside or use a defined-risk long put if the IV is not a trap", "Market-short the ETF of a different sector", "Tweet the promoter"], answer: 1, why: "Without a borrow or a future, you do not have a short book." },
  },
  "microstructure-10": {
    lead: "Write an execution playbook the way you write a strategy card: venue, order type, slice, kill time, max shortfall. Advanced traders lose less to the book than to their own improvisation.",
    covers: ["Every live ticket has an execution clause.", "Kill time is a risk control.", "Review shortfall weekly or you will not believe your costs."],
    blocks: [
      { t: "steps", title: "Ticket addendum — execution", items: [
        "Venue: NSE cash / NSE F&O / MCX. No 'whatever is open'.",
        "Urgency: must fill in 2 minutes / can work 90 minutes / only at VWAP.",
        "Order: limit at X, or slice Y% every 5 minutes, cancel unfilled at HH:MM.",
        "Max shortfall vs arrival: N ticks. Beyond that, abort — the trade is no longer the trade.",
        "Do not change the clause because a YouTube live is screaming.",
      ] },
      { t: "p", text: "A weekly review: five random fills. Arrival, fill, shortfall, whether you followed the clause. If you broke the clause three times, the playbook is fiction. Fix the playbook or fix the habit. Do not add a new indicator." },
    ],
    takeaways: ["Execution is written, not felt.", "Kill times prevent zombie working orders.", "Shortfall is a journal column."],
    quiz: { q: "A max-shortfall abort exists so that:", options: ["You never trade", "The live fill cannot silently change the trade you sized", "SEBI is happy", "IV falls"], answer: 1, why: "If you pay 3× the edge in impact, you no longer have that trade." },
  },

  "volatility-01": {
    lead: "Implied volatility is the rent the options market is charging. Realised volatility is the receipt of what actually happened. Advanced vol trading is a spread between those two — not a mood about 'high' or 'low'.",
    covers: ["IV is a forecast embedded in premium.", "RV is measured from the tape after the fact.", "Expensive/cheap is always relative to a measure and a horizon."],
    blocks: [
      { t: "formula", expr: "Vol edge ≈ f(IV − expected RV) − costs − jump risk", meaning: "Selling 18% IV into a market that usually prints 12% RV can still lose if a 3% gap lands. The distribution has a left tail the average cannot see." },
      { t: "p", text: "India VIX is a headline index of near-term Nifty implied vol, not 'the' vol. A single name can have IV 40 while VIX is 12. Trading 'VIX is low so sell premium' on a stock into results is mixing cameras." },
      { t: "p", text: "Term structure: this week's Nifty IV can sit above next month's (event, expiry) or below it (calm week, event later). The shape is information. A flat surface with a spike in one expiry is a calendar, not a vibe." },
      { t: "example", title: "The cheap-looking 22", body: "A stock's 30-day IV is 22. Its 6-month RV is 18. Looks sellable. Results are in 9 days and the last four prints moved 6–9%. Expected RV over the event week is not 18. Either buy the event (long vol) sized to the debit, or stand aside. Selling the 22 because a blog said 'IV rank 30 is low' is how people donate to event week." },
    ],
    takeaways: ["IV is a price. RV is a history. Neither is a trade by itself.", "Horizon must match.", "Jumps are not in the average."],
    quiz: { q: "India VIX at 11 most honestly means:", options: ["Every stock option is cheap", "Near-term Nifty implied vol is subdued — name-level and event-level IV can still be rich", "You must sell strangles", "Realised vol cannot rise"], answer: 1, why: "VIX is one camera: Nifty, near term." },
  },
  "volatility-02": {
    lead: "The smile and the skew are how the market charges extra for downside (or upside) crashes. In Nifty, put skew is the usual weather: OTM puts cost more IV than equidistant OTM calls. That is not a bug. It is crash insurance.",
    covers: ["Skew: IV versus strike.", "Term structure: IV versus expiry.", "A 'cheap' OTM put can still be expensive in IV."],
    blocks: [
      { t: "p", text: "Plot IV against strike for one expiry. If 23,800 PE has IV 16 and 24,400 CE has IV 11 with spot 24,100, the market is charging more for left-tail insurance. Selling that put because 'premium looks high in rupees' without looking at IV is mixing units." },
      { t: "p", text: "Skew steepens into fear and into some event weeks. Flattening skew with a risk reversal (short put / long call or the reverse) is a second-order trade. It needs a vol book, not a directional hope wearing a vol hat." },
      { t: "table", caption: "Read the surface in one glance", headers: ["Shape", "Often says", "Naive trap"], rows: [
        ["Steep put skew", "Downside insurance bid", "OTM puts 'pay more' so sell them all"],
        ["Inverted week vs month", "Near event or pin", "Monthlies are 'always better'"],
        ["Name IV >> index IV", "Idiosyncratic risk", "Hedge with Nifty shorts 1:1"],
      ] },
      { t: "callout", kind: "caution", title: "IV rank folklore", text: "IV rank/percentile versus one year of that name is a start. It is not a sell signal. A name can sit at IV rank 90 because a merger just broke and the next print is binary. Rank without a calendar is a screensaver." },
    ],
    takeaways: ["Rupee premium and IV are different languages.", "Skew is crash insurance demand.", "Surface first, then structure."],
    quiz: { q: "An OTM Nifty put with a large rupee premium but IV in line with the skew is:", options: ["Always a sell", "Priced like the rest of the left tail — rupees are not the tell", "Proof of manipulation", "A covered call"], answer: 1, why: "IV locates the premium on the surface." },
  },
  "volatility-03": {
    lead: "Selling volatility is collecting rent while short a jump. The professional version is defined risk, a calendar, a hedge, and a written 'what if India gaps 3%'. The amateur version is a naked strangle because last month was quiet.",
    covers: ["Credit is not profit until it is not needed.", "Defined-risk vol selling is a different species from naked.", "Size from the loss if IV explodes, not from the credit."],
    blocks: [
      { t: "p", text: "A short Nifty strangle, 400 points wide, credit ₹48, looks like a salary. The loss if spot travels 600 and IV doubles is not ₹48. It is a multiple of width and vega. If you cannot draw that loss on paper before you click, you are not selling vol. You are hoping." },
      { t: "ul", items: ["Prefer defined-risk (iron condor, iron fly) until your journal has 40 closed vol trades.", "Cap short vega so a +8 vol point shock is ≤ 1R, not 'we'll see'.", "Do not sell the expiry that contains Budget / RBI / US CPI if your edge is 'quiet tape'.", "A winning month of vol selling is not evidence the tail died."] },
      { t: "example", title: "1R the shock, not the credit", body: "Account ₹20 lakh, 1R = ₹20,000. Short vega on a condor ≈ ₹2,400 per vol point (work it from your vendor). An 8-point event shock ≈ ₹19,200 — about 1R. That is a sized vol sale. If the same shock is ₹1.2 lakh, you are running a fund on a retail login." },
    ],
    takeaways: ["Rent has a tail.", "Defined risk until the sample is real.", "Shock size is the risk unit."],
    quiz: { q: "The correct risk unit for a short-vol book is:", options: ["The credit received", "The loss in a vol+spot shock you actually model", "The number of lots your friend uses", "VIX itself"], answer: 1, why: "Credit is the rent. The shock is the building on fire." },
  },
  "volatility-04": {
    lead: "Buying volatility is paying rent for a move or a reprice. You can be right on direction and still lose if IV crush is larger than the delta you earned. Event week is where this lesson is expensive.",
    covers: ["Long options = long vol + long/short delta + short theta.", "IV crush is the event tax on long premium.", "Straddles need a move larger than implied, not just 'a move'."],
    blocks: [
      { t: "p", text: "Results Thursday. ATM straddle implies a 4.5% move. The stock moves 2.8% and IV halves. Long straddle dies. That is not bad luck. That is buying a 4.5% ticket and getting a 2.8% play. Either you needed a different structure (risk reversal, call spread) or you needed to pass." },
      { t: "p", text: "If you want direction into an event without paying full straddle rent: verticals. You cap the win; you also cap the crush somewhat because you sold some vega. Nothing is free. Write which Greek you are trying to own." },
      { t: "formula", expr: "Straddle BE ≈ strike ± debit (calls+puts)", meaning: "At expiry. Before expiry, IV and time still sit in the price — a small move with crush can miss even if you 'predicted the side'." },
    ],
    takeaways: ["Implied move is the hurdle.", "Crush can dominate delta.", "Verticals change the Greek mix on purpose."],
    quiz: { q: "A stock moves the way you guessed but your long ATM straddle loses. The usual culprit is:", options: ["STT only", "The move was smaller than implied and/or IV crushed", "Demat charges", "Max pain is illegal"], answer: 1, why: "You bought a packed-in move. Delivery was lighter." },
  },
  "volatility-05": {
    lead: "Calendars and diagonals trade the term structure: this week versus next month, this strike versus a further one. They are vol-and-time machines. They hate when the near week explodes in the wrong way.",
    covers: ["Long calendar: short near, long far, usually same strike.", "You want the near to decay faster, not to become a missile.", "Earnings in the near week can invert the thesis."],
    blocks: [
      { t: "p", text: "A classic Nifty calendar: short this week's Tuesday 24,100 CE, long next month 24,100 CE, net debit. If the week is quiet, the short decays and the long holds value. If Nifty rips 400 points, both calls go ITM; the short can hurt more than the long helps in the first hours because of gamma. Calendars are not 'safe theta'. They are a view on time and on not being run over." },
      { t: "callout", kind: "india", title: "Weekly expiry is the whole point", text: "India's weekly index options make calendars a native product. They also make them a trap: every Nifty weekly expiry (Tuesday on NSE as of Nov 2024) is a potential explosion. Sensex weekly is Thursday on BSE. If your calendar assumes a sleepy week, check the economic calendar like an adult." },
      { t: "example", title: "Diagonal as a directional calendar", body: "Long 24,300 next-month CE, short 24,200 this-week CE. You want a grind up that kills the short without destroying the long. A gap through 24,400 on Wednesday is a different trade — flatten or roll, do not 'average the diagonal'." },
    ],
    takeaways: ["Calendars are term-structure trades.", "Near-week gamma can dominate.", "No event in the short week unless that is the bet."],
    quiz: { q: "A long call calendar wants, first of all:", options: ["A vertical crash", "Time to pass in a contained spot range, near-week decaying faster", "Unlimited upside like a naked call", "Zero vega"], answer: 1, why: "It is a time-spread, not a lottery ticket." },
  },
  "volatility-06": {
    lead: "Delta-hedging turns an option into a vol bet. You buy/sell the underlying (or futures) to keep net delta near zero, and you hope realised vol pays more (or less) than you paid. This is a desk job, not a weekend hobby.",
    covers: ["Hedge residual delta on a schedule or a band.", "You pay spread and STT on every hedge.", "Gaps between hedges are the P&L."],
    blocks: [
      { t: "p", text: "Long a Nifty straddle, delta-neutral at the open. Nifty rallies 80 points; your net delta is now +0.3 × 65 per set. You sell 20 Nifty futures units-equivalent to flatten. Nifty dumps; you buy back. The grind of realised vol versus the IV you paid, minus costs, is the trade. If you hedge twice a day in a 40-point range, costs eat the edge." },
      { t: "ul", items: ["Band hedge: rebalance when |delta| exceeds 0.15 (or whatever you wrote).", "Time hedge: once at 11:00 and 14:30 — cheaper, sloppier on gaps.", "Never start this on a single weekly straddle in a ₹3 lakh account. The lot is the minimum, and the minimum is too big.", "Journal every hedge: time, spot, delta, fill. That journal is the strategy."] },
      { t: "callout", kind: "caution", title: "Gamma scalping folklore", text: "Long gamma scalping (buy dips, sell rips because the option made you) sounds like a money printer. In a quiet week it is a fee printer. In a trending day without mean reversion it is a chase. Write the regime." },
    ],
    takeaways: ["Delta-hedge = vol trade + a lot of fills.", "Costs are first-class.", "Band or clock — pick one and log it."],
    quiz: { q: "Delta-hedging a long straddle is primarily a bet on:", options: ["Direction only", "Realised movement versus implied, after hedge costs", "Max pain", "FII cash"], answer: 1, why: "You removed most of the delta on purpose." },
  },
  "volatility-07": {
    lead: "Weekend theta, holidays, and 'vol crush on Friday afternoon' are calendar effects. India has plenty of long weekends. Pricing Monday as if it were a normal night is how weekly sellers get a free day — until they do not.",
    covers: ["Calendar days versus trading days in theta models.", "Friday afternoon often reprices weekend risk.", "A long weekend is not 1/7 of a week if a geopolitical print can land."],
    blocks: [
      { t: "p", text: "A Tuesday-expiry Nifty weekly sold on Friday contains a weekend plus Monday. A monthly that spans Republic Day contains a holiday jump. Name the nights inside the contract before you sell theta. 'Theta loves weekends' is how people donate Monday's gap." },
      { t: "p", text: "Friday 15:00 IV often ticks up into the close on event weekends and ticks down on sleepy ones. If you always sell Friday 14:30 because a thread said so, you will meet the other Friday." },
    ],
    takeaways: ["Time is not uniform.", "Weekends are jump windows.", "Friday close has two personalities."],
    quiz: { q: "Selling premium into a three-day weekend is mainly:", options: ["Free theta", "A jump-risk sale dressed as theta", "Required by SPAN", "A covered call"], answer: 1, why: "The clock pays you; the gap can take it back with interest." },
  },
  "volatility-08": {
    lead: "Correlation of implieds: Nifty IV, Bank Nifty IV, and single-stock IV do not march in lockstep. A 'index quiet, stocks loud' tape is a dispersion tape. That is an advanced book.",
    covers: ["Dispersion: index vol versus average name vol.", "Bank Nifty can scream while Nifty dozes.", "Hedging a name with Nifty options is a correlation bet."],
    blocks: [
      { t: "p", text: "You are long a basket of stock straddles and short Nifty straddles. You want names to move and the index to not. That is dispersion. When everything sells off together, you lose on both. Correlation-1 days are the risk. If you cannot name that risk, do not run the book." },
      { t: "p", text: "Retail version: hedging a Reliance long with Nifty puts. If Reliance dumps on a company print and Nifty does not, the hedge is a decoration. Beta and correlation are estimates from a window that just ended." },
      { t: "example", title: "The quiet index", body: "VIX 11, a PSU bank IV 38 into results. Selling the bank strangle because 'index is quiet' is mixing rooms. The quiet index is why the name can still gap 8% without Nifty 'confirming'." },
    ],
    takeaways: ["Index vol ≠ name vol.", "A Nifty hedge is a correlation overlay.", "Dispersion dies when everything dumps together."],
    quiz: { q: "Hedging a single stock with Nifty puts assumes:", options: ["Zero correlation", "Enough correlation that Nifty will pay when the name pays — which can fail on idiosyncratic news", "SEBI guarantees it", "IV is identical"], answer: 1, why: "It is a correlation bet, not a clone of the name." },
  },
  "volatility-09": {
    lead: "A vol dashboard a human can actually run: IV vs 20-day RV, skew versus last month, term structure, event calendar, and a 'shock P&L' cell. If it does not fit on one page, you will not use it.",
    covers: ["Five numbers beat twenty oscillators.", "Shock P&L is mandatory for short vol.", "The calendar is a Greek."],
    blocks: [
      { t: "table", caption: "One-page vol desk", headers: ["Cell", "What you write", "Fail closed if"], rows: [
        ["IV / RV 20d", "Ratio or spread", "You cannot compute RV"],
        ["Skew 25Δ", "Put IV − call IV", "You don't have deltas"],
        ["Term", "W1 vs M1", "Event sits in W1 and you forgot"],
        ["Shock", "P&L if spot ±2% and IV +8", "Shock > 1R"],
        ["Calendar", "RBI / Budget / results", "You sold that expiry anyway"],
      ] },
      { t: "p", text: "Update it before the open, not after you are in. The dashboard is a gate, not a decoration for screenshots." },
    ],
    takeaways: ["Fewer cells, actually used.", "Shock P&L is the size conversation.", "Events live on the same page as IV."],
    quiz: { q: "If the shock cell says −1.6R, the process says:", options: ["Enter half lots and hope", "Do not take the short-vol trade — or cut size until shock ≤ 1R", "Ignore shocks, theta will save you", "Hedge with a tweet"], answer: 1, why: "The cell exists to stop the trade." },
  },
  "volatility-10": {
    lead: "Vol ethics: you will have quiet months that feel like a salary and one month that takes eight of them back. If your household needs the salary, you do not have a vol book. You have a job risk.",
    covers: ["Path of P&L matters more than average.", "A 70% win rate with a −8R month is a coin with a bomb.", "Write a kill switch for short vol: e.g. −3R month → 30 days off."],
    blocks: [
      { t: "p", text: "People remember the 18 quiet expiries. The market remembers the 19th. Size so the 19th is a scar, not an eviction. That is the entire advanced lesson, dressed in Greeks." },
      { t: "ul", items: ["Cap short-vol heat at a fraction of total heat — it is the same crash as your long gamma? No. It is the opposite. They can both lose on a gap if you mixed them badly.", "After a +4R vol month, do not double lots. The sample just got luckier.", "If you cannot explain the trade to a sceptical partner in two minutes including the shock, you are not ready to sell it."] },
    ],
    takeaways: ["Quiet is not a regime forever.", "Kill switches are vol hygiene.", "Household cash is not risk capital."],
    quiz: { q: "A 70% win-rate short-strangle book still needs a kill switch because:", options: ["Win rate is fake", "The losing tail can be many R and cluster", "SEBI requires it", "Theta is illegal"], answer: 1, why: "Frequency is not severity." },
  },

  "specials-01": {
    lead: "Special situations are trades with a timetable and a document: results, buybacks, demergers, open offers, delistings, QIPs. The edge, if any, is in the document and the calendar — not in the candlestick.",
    covers: ["A date and a filing beat a pattern.", "Each situation has a buyer of last resort — or does not.", "If you cannot name the other side, you are the other side."],
    blocks: [
      { t: "p", text: "A swing long because RSI is 32 is a technical trade. A long because a buyback at ₹1,800 is live and the stock is ₹1,620 with 11 days left is a special. Different journal, different risk, different 'why I am out'." },
      { t: "p", text: "Indian specials live in BSE/NSE announcements, SEBI takeovers, exchange buyback circulars, and scheme documents. If you will not read a PDF, you will not have an edge here. You will have a tip." },
      { t: "callout", kind: "caution", title: "Event crowding", text: "Popular specials are crowded. The last 2% into a buyback close can be a gift to the company, not to you. Size for the ugly version: deal slips, dates extend, tax treatment surprises." },
    ],
    takeaways: ["Document + date = the setup.", "Crowding is a risk factor.", "No PDF, no trade."],
    quiz: { q: "The primary source for a buyback special is:", options: ["A Telegram target", "The company and exchange buyback documentation", "A weekly candle", "India VIX"], answer: 1, why: "Specials are paperwork trades." },
    sources: [SEBI, NSE],
  },
  "specials-02": {
    lead: "Earnings are a scheduled jump. The implied move in the straddle is the market's cover charge. Your job is to decide: pay it, sell it, or use a structure that does not need the full jump.",
    covers: ["Implied move from the ATM straddle.", "Guidance and quality of beat matter more than the % surprise.", "Gap-and-go versus gap-and-fade is a second trade after the print."],
    blocks: [
      { t: "p", text: "A results long stock into the print is long the surprise and long the multiple the market will pay for that surprise. A 4% beat with a timid concall can gap down. That is not 'manipulation'. That is the market trading the path of cash, not the headline EPS." },
      { t: "steps", title: "Earnings ticket", items: [
        "Write the implied move from the straddle.",
        "Write what would make you wrong: not 'miss', but 'miss + guide down' or 'beat + margin squeeze'.",
        "Pick structure: stock / call spread / long vol / short vol defined / nothing.",
        "Decide the after-print plan before the print: fade a +7% gap only if X; else flatten.",
        "No adding in the first 15 minutes unless that is the written after-print trade.",
      ] },
      { t: "example", title: "Implied 5, printed 2", body: "ATM straddle 5.2% of spot. Company beats, stock +1.8%, IV crushed. Long straddle dies; long stock modestly works; call spread may work. The structure was the strategy. The 'I knew they'd beat' story was not." },
    ],
    takeaways: ["Implied move is the hurdle.", "Guidance > headline EPS.", "After-print is a new ticket."],
    quiz: { q: "You expect a beat and buy an ATM straddle. The stock beats and rallies less than implied. You should have expected:", options: ["A lottery win", "A possible loss — you bought the packed-in move, not 'the beat'", "STT refund", "A buyback"], answer: 1, why: "Straddles need more than the headline." },
  },
  "specials-03": {
    lead: "Buybacks in India have rules: open market versus tender, timelines, promoter participation, tax. A stock 12% below the buyback price is not a risk-free 12%. It is a probability of completion, a path, and an opportunity cost.",
    covers: ["Tender offer versus open-market buyback.", "Acceptance ratio: you may not get fully filled.", "The floor is not guaranteed if the company can change its mind within the law."],
    blocks: [
      { t: "p", text: "Open-market buybacks support the tape over a window; they do not promise your fill at the cap price. Tender offers ask you to offer shares; proration is real. If you bought 1,000 shares expecting a full tender at ₹2,000 and you get 30%, you still own 700 shares after the 'sure thing'." },
      { t: "p", text: "Tax and holding period can change the net. This is not tax advice; it is a reminder to compute net rupees, not headline spread. A 10% gross with a tax surprise is not 10%." },
      { t: "callout", kind: "india", title: "Read the letter of offer", text: "SEBI-regulated buybacks come with documents. Record date, offer price, size, promoter intent. If you only read a news-card headline, you are guessing." },
    ],
    takeaways: ["Proration exists.", "Cap price ≠ your guaranteed exit.", "Net of tax and fill, not headline spread."],
    quiz: { q: "In a tender buyback, buying the stock below offer price still risks:", options: ["Nothing — SEBI guarantees full acceptance", "Partial acceptance, path risk, and a leftover long", "Only STT", "Delisting the same day"], answer: 1, why: "Proration and time are the trade." },
    sources: [SEBI],
  },
  "specials-04": {
    lead: "Demergers, listings of subsidiaries, and bonus issues of new names create stub values and 'sum of parts' arguments. The market can leave a stub mispriced for months — or for three hours. Either way you need a SOTP table, not a slogan.",
    covers: ["Sum-of-parts is an argument, not a print.", "When-issued / listing day is a liquidity event.", "Stub value can stay 'cheap' because it is illiquid or because it is a trap."],
    blocks: [
      { t: "p", text: "Parent trades at 100. Subsidiary listed at 40 of value, leftover businesses 'should be' 80, so parent 'should be' 120. The remaining 20% might be holding-company discount, tax leakage, or the market not believing the 80. Write which." },
      { t: "p", text: "Listing day of the spun name is a crowd. If your edge is 'the stub is cheap after the listing dust settles', your hold is weeks, not the opening print. If your edge is the opening imbalance, you are doing microstructure, not SOTP." },
    ],
    takeaways: ["SOTP needs a table of parts.", "Listing day ≠ the thesis.", "Illiquid stubs stay cheap for a reason — name it."],
    quiz: { q: "A holding-company discount after a demerger is:", options: ["Always an error to arbitrage with 10× leverage", "Often a mix of tax, liquidity, and control — not automatic alpha", "Illegal", "The same as max pain"], answer: 1, why: "Discounts can be structural." },
  },
  "specials-05": {
    lead: "Open offers, SEBI takeovers, and competing bids are legal processes with a price and a timetable. Trading them as if they were memes is how people get locked into leftover shares at the wrong price.",
    covers: ["Offer price is a legal number, not a target on a chart.", "Competing bids can reprice the situation.", "If the deal dies, you own a stock, not a spread."],
    blocks: [
      { t: "p", text: "Stock at 140, open offer at 180. Gross 28%. Deal risk, timing, and what happens to the residual float are the short thesis against you. Size as a spread with deal-break risk, not as a 28% 'return'." },
      { t: "ul", items: ["Read the letter of offer and the timeline.", "Ask: will the acquirer go to delisting later, or is this a stake mop-up?", "Residual float after the offer can be nastier, not nicer.", "Do not use options unless you can map assignment through the corporate action."] },
    ],
    takeaways: ["Deal-break is the real short.", "Residual float is a second trade.", "Legal price ≠ guaranteed wealth."],
    quiz: { q: "Buying a stock 20% below an open-offer price is best treated as:", options: ["Risk-free arbitrage", "A spread with completion and leftover risk", "A covered call", "A G-Sec"], answer: 1, why: "Deals slip and leftovers remain." },
    sources: [SEBI],
  },
  "specials-06": {
    lead: "QIP, preferential allotment, OFS, and block-led placements change float and often cap a tape. The 'news is bullish because they raised capital' take is incomplete. Dilution, lock-ins, and the price of the placement are the trade.",
    covers: ["New paper is supply.", "Issue price versus tape tells you who got the bargain.", "Lock-in expiry is a calendar event months later."],
    blocks: [
      { t: "p", text: "A QIP at 8% discount to last close is the issuer selling cheap paper to institutions. The tape can rally on 'smart money in' and then sit under the issue price for weeks while that paper is digested. Both can be true in sequence." },
      { t: "p", text: "Preferential allotments have lock-ins. Mark the unlock date. A wall of supply in six months is not a rumour; it is in the disclosure. Advanced journals have a 'lock-in calendar' the way vol journals have an event calendar." },
    ],
    takeaways: ["Placements are supply events.", "Discount to tape is information.", "Lock-in expiry is a date, not a vibe."],
    quiz: { q: "A QIP at a discount primarily introduces:", options: ["Free upside for existing holders", "New float at a known price — digestion risk", "A buyback", "Zero dilution"], answer: 1, why: "New shares are supply." },
  },
  "specials-07": {
    lead: "Delisting offers and reverse book-builds are their own sport. The discovered price can be far from your fantasy. Participating without reading the reverse book-build mechanics is tourism.",
    covers: ["Reverse book-build discovers a price from seller offers.", "You may not like the discovered price.", "Failure to delist leaves you in a thinner stock."],
    blocks: [
      { t: "p", text: "Promoters want out of listing. They need to reach a threshold. You want a fat premium. The mechanism balances those greeds. If you bid a fantasy, you may be left out. If you bid too shy, you sell cheap. There is no 'obvious' bid without a view on the promoter's walk-away." },
      { t: "callout", kind: "caution", title: "After a failed delist", text: "Liquidity can worsen. The special is over; you now own a midcap with a story. Flatten or rewrite as a fundamental hold — do not sit in the leftover by accident." },
    ],
    takeaways: ["Mechanics of the book-build matter.", "Walk-away price is the other side.", "Failure is a new stock, not the old special."],
    quiz: { q: "If a delisting reverse book-build fails, you should first:", options: ["Assume another offer next week always", "Treat the leftover as a new position with worse liquidity", "Average down automatically", "Sell straddles"], answer: 1, why: "The special ended. The stock remains." },
  },
  "specials-08": {
    lead: "Rights issues are options the company grants you: buy more paper at a fixed price, or let the right lapse / sell it (when it trades). The theoretical value is mechanical. The decision is capital and conviction.",
    covers: ["Right value ≈ max(0, stock − issue price), adjusted for terms.", "Selling rights is a trade. Letting them lapse is a choice.", "Renounceable vs not."],
    blocks: [
      { t: "formula", expr: "Theoretical rights value depends on ratio and issue price", meaning: "If 1 right buys 1 share at 120 and stock is 150, the right is not worth 30 if you need 3 rights per share — do the ratio. Always do the ratio." },
      { t: "p", text: "Companies sometimes set rights prices that look like a gift. The gift is also dilution. If you do not subscribe and do not sell the right, you shrink. That can still be correct if you refuse to add capital to a thesis you no longer like. Write it." },
    ],
    takeaways: ["Do the ratio.", "Lapsing is a decision, not an accident.", "Rights are options with a corporate calendar."],
    quiz: { q: "Letting rights lapse without selling them, when they had value, is:", options: ["Neutral", "Giving away a live option you owned", "Required by SEBI", "A covered call"], answer: 1, why: "An unexercised, unsold valuable right is a dropped wallet." },
  },
  "specials-09": {
    lead: "Index funds and ETFs must process corporate actions too. Tracking error around a special can be the whole month's TER. If you use BeES as a core, you still need to know when the index is messy.",
    covers: ["Index methodology documents are dull and load-bearing.", "Specials inside an index create tracking noise.", "Do not chase a 1-day ETF discount that is the action settling."],
    blocks: [
      { t: "p", text: "A demerger inside Nifty 50: the index has a rule for when the new name enters, at what price, with what weight. ETF NAVs can look 'wrong' for a session. That is plumbing. If you panic-sell BeES on a 0.4% discount that morning, you may be selling the plumbing." },
      { t: "p", text: "Advanced: if you trade the stub in cash and hold BeES, you may be long the situation twice. Correlation of specials inside your 'index core' is a portfolio fact." },
    ],
    takeaways: ["Index rules process specials.", "ETF gaps around actions can be plumbing.", "Don't double-count the stub."],
    quiz: { q: "A 0.3% Nifty BeES discount on a demerger effective date is first treated as:", options: ["A once-in-a-lifetime arb to lever 5×", "Possible index plumbing — confirm iNAV and the circular before you hero-trade it", "Proof AMFI is down forever", "A short-vol signal"], answer: 1, why: "Specials confuse NAVs for a session more often than they gift arbs." },
  },
  "specials-10": {
    lead: "A specials playbook is a folder: PDF, dates, spread, deal-break thesis, leftover plan, size in R. If it is only a ticker in a watchlist, it is not a special. It is a hope with a press release.",
    covers: ["One card per situation.", "Kill date if the document slips.", "Leftover plan is mandatory."],
    blocks: [
      { t: "steps", title: "Specials card", items: [
        "Situation type: earnings / buyback / demerger / offer / placement / rights / delist.",
        "Source PDF link and the three numbers that matter.",
        "Gross spread and net spread after tax/fill assumptions.",
        "Deal-break: what I own if this dies, and the stop or time-stop.",
        "Leftover: proration, residual float, unlock dates.",
        "Size in R so a deal-break is 1R, not 6R.",
        "Kill date if the timetable slips by N days.",
      ] },
      { t: "p", text: "Review monthly: which specials paid the spread, which became leftovers, which you had no business in. The review is the edge compounding. The individual deal is a sample of one." },
    ],
    takeaways: ["Paperwork lives on the card.", "Deal-break size is the size.", "Leftovers are a second strategy."],
    quiz: { q: "If the timetable slips past your kill date, process says:", options: ["Hold forever, specials always complete", "Exit or rewrite a new card — the old trade expired", "Double", "Hedge with VIX"], answer: 1, why: "Time was part of the setup." },
  },
});

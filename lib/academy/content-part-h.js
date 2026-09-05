const { expandLesson } = require("./expand");

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

const NSEOI = { name: "NSE option chain", href: "https://www.nseindia.com/option-chain", note: "Live OI, volume, LTP and IV by strike and expiry." };
const NSEFO = { name: "NSE F&O", href: "https://www.nseindia.com/products-services/equity-derivatives-contract-specifications", note: "Contract specs, lot size, settlement." };

module.exports = pack({
  "positioning-01": {
    lead: "Open interest is the number of option (or futures) contracts that are still alive. It is a stock of positions, not a flow of opinion. Treating OI as a buy/sell button is how people get pinned, then squeezed.",
    covers: [
      "OI is outstanding contracts — not volume, not 'smart money'.",
      "OI rises when a new long and a new short are born together.",
      "OI falls when both sides close.",
      "You cannot see who is long from OI alone.",
    ],
    blocks: [
      { t: "p", text: "Volume is how many contracts changed hands today. Open interest is how many are still open tonight. A strike can print huge volume and leave OI unchanged if day-traders opened and closed. A quiet strike can add thousands of OI if two institutions initiate a position and sit." },
      { t: "formula", expr: "ΔOI = new contracts opened − contracts closed", meaning: "One new buyer + one new seller = +1 OI. One closer + one closer = −1 OI. A long covering against a new short is a transfer — OI can stay flat while names change." },
      { t: "callout", kind: "caution", title: "The identity problem", text: "NSE shows you the pile, not the faces. Call OI at 24,500 can be written calls (sellers), long calls (buyers), or a mix that flipped at lunch. The chain does not colour-code 'smart'." },
      { t: "p", text: "Index options OI is also not the same animal as stock-option OI. Nifty is cash-settled, European, with a dealer and prop ecosystem that hedges. A stock F&O name can hit MWPL. Do not copy an index OI story onto RELIANCE without changing the rulebook." },
      { t: "example", title: "Monday 24,100 PE", body: "Expiry 01-Sep, spot 24,080. 24,100 PE last 62.50, OI 1.8 lakh contracts. That number means 1.8 lakh puts still exist. It does not mean 1.8 lakh people are 'bearish'. Half of those contracts have a seller. The seller may be a hedger who is long cash." },
    ],
    takeaways: ["OI is inventory of live contracts.", "Volume is today's turnover of that inventory.", "Without the other side, OI cannot tell you the bet."],
    quiz: { q: "Open interest goes up only when:", options: ["Price rises", "A new long and a new short are both opened", "FIIs buy cash", "IV falls"], answer: 1, why: "OI is born in pairs. Price and FII cash are different cameras." },
    sources: [NSEOI],
  },
  "positioning-02": {
    lead: "Price change plus change in OI is the oldest positioning map in Indian F&O. Four quadrants. Four hypotheses — not four laws.",
    covers: [
      "Long build-up: price up, OI up.",
      "Short build-up: price down, OI up.",
      "Long unwinding: price down, OI down.",
      "Short covering: price up, OI down.",
    ],
    blocks: [
      { t: "diagram", name: "oi-quadrants" },
      { t: "table", caption: "Futures-style quadrants (index or stock futures)", headers: ["Price", "OI", "Usual label", "What it might mean"], rows: [
        ["Up", "Up", "Long build-up", "New longs entering; shorts may be squeezed later"],
        ["Down", "Up", "Short build-up", "New shorts entering; bounce can be violent if they cover"],
        ["Down", "Down", "Long unwinding", "Longs leaving; trend may pause when they are done"],
        ["Up", "Down", "Short covering", "Shorts buying back; rally may fade when covering ends"],
      ] },
      { t: "p", text: "These labels were built for futures. Options break them. A pile of new put OI with price up can be hedges on a rally, not 'bears arriving'. Always name the instrument: futures OI, call OI, put OI, or total." },
      { t: "callout", kind: "idea", title: "Use change, not the level", text: "Yesterday's OI is a museum. Today's ΔOI is the live sentence. A wall that is not adding is a wall that can be climbed." },
      { t: "example", title: "Nifty futures, one session", body: "Nifty futures 24,110 → 24,040, OI +4%. Label: short build-up. Hypothesis: new shorts. Test: does the next bounce come with OI falling (covering) or with OI still rising (they add)? The second print tells you if the first label was a story or a process." },
    ],
    takeaways: ["Four quadrants are hypotheses.", "Write futures / call / put separately.", "Confirm with the next ΔOI, not the first tag."],
    quiz: { q: "Price down, OI down on Nifty futures is usually tagged:", options: ["Short build-up", "Long unwinding", "Short covering", "A guaranteed bottom"], answer: 1, why: "Longs leaving. It is not a buy alarm by itself." },
  },
  "positioning-03": {
    lead: "Put-call ratio is puts divided by calls — on OI or on volume. It is a temperature. Extremes can stay extreme on a one-way week, which is why PCR as a timing oracle keeps donating to the trend.",
    covers: [
      "OI PCR versus volume PCR.",
      "Why 'contrarian PCR' fails in melts.",
      "Index PCR is not stock PCR.",
      "Always quote the expiry you measured.",
    ],
    blocks: [
      { t: "formula", expr: "PCR(OI) = Put OI ÷ Call OI", meaning: "PCR(volume) uses today's traded quantity instead. They disagree often. Write which one you used." },
      { t: "p", text: "OI PCR above 1 means more puts outstanding than calls. On Nifty that is common: hedges live in puts. A 'high PCR = bullish because hedges' story and a 'high PCR = too many bears' story cannot both be laws. They are both sometimes true. The chain, VIX and the futures quadrant decide which sentence fits today." },
      { t: "callout", kind: "caution", title: "Weekly versus monthly", text: "A weekly PCR of 1.4 into Tuesday expiry is not comparable to a monthly PCR of 1.4 with 20 days left. Tenor is part of the number. Mix them and you invent a signal." },
      { t: "example", title: "Same day, two PCRs", body: "Nifty 01-Sep: put OI 1.9 cr, call OI 1.7 cr → OI PCR ≈ 1.12. Volume PCR in a short-covering spike can print 0.7 because calls traded more. If you only screenshot one, you will argue with someone who screenshot the other — both are 'correct' and neither is a trade." },
    ],
    takeaways: ["Name OI or volume.", "Name the expiry.", "PCR is context, not a trigger."],
    quiz: { q: "A Nifty weekly OI PCR of 1.3 most honestly means:", options: ["The market must rally", "More puts than calls are open on that expiry — a temperature, not a forecast", "VIX will fall tomorrow", "FIIs sold cash"], answer: 1, why: "PCR counts contracts. It does not move Nifty by itself." },
    sources: [NSEOI],
  },
  "positioning-04": {
    lead: "Strike-wise OI is a map of where people have parked risk. A 'wall' is a hypothesis: defence, magnet, or fuel. Price does not owe the wall a visit, and the wall does not owe you a bounce.",
    covers: [
      "Call walls above spot, put walls below.",
      "OI concentration versus a flat chain.",
      "Watch ΔOI at the wall, not just the height.",
      "Spot sitting inside a thin OI zone is a different market.",
    ],
    blocks: [
      { t: "diagram", name: "oi-walls" },
      { t: "p", text: "On a typical Nifty weekly chain, put OI piles just below spot and call OI just above. Traders call them support and resistance. Sometimes they are: dealers who sold those options hedge in a way that defends the zone. Sometimes they are leftover lottery tickets. The test is behaviour — does spot stall, accelerate, or ignore?" },
      { t: "ul", items: ["Wall + rising OI + stalling price: defence still being written.", "Wall + falling OI as price approaches: the wall is being taken down.", "Price gaps through a wall: the magnet story is retired. Do not 'wait for the fill' of an OI number."] },
      { t: "callout", kind: "idea", title: "ATM is the hinge", text: "Most gamma lives near ATM. A wall 800 points away with fat OI and tiny gamma is a different species from a 50-point wall that is ATM on expiry day." },
      { t: "example", title: "24,200 call pile", body: "Spot 24,080, 01-Sep. 24,200 CE OI is the day's call peak, LTP ₹25.60. Hypothesis A: writers will defend 24,200. Hypothesis B: if spot runs, those shorts hedge by buying futures and the wall becomes fuel. You do not pick A or B from the screenshot. You watch whether 24,200 is offered or lifted." },
    ],
    takeaways: ["A wall is a pile of contracts, not a brick.", "ΔOI at the strike is the live sentence.", "ATM walls bite; far walls are slower."],
    quiz: { q: "Large call OI at 24,500 with spot at 24,080 means:", options: ["Price cannot go there", "Many call contracts exist there — defence, speculation or leftovers", "You should sell every rally", "Max pain is 24,500"], answer: 1, why: "OI is quantity. The story is a test, not a law." },
  },
  "positioning-05": {
    lead: "Max pain is the expiry price that would minimise total payout by option writers, given today's OI. Pin risk is what you feel when spot parks on your short strike into the close. Neither is a magnet with a legal duty.",
    covers: [
      "How max pain is computed from OI.",
      "Why it drifts as OI changes.",
      "Pin risk on expiry day.",
      "When the magnet story is most and least useful.",
    ],
    blocks: [
      { t: "formula", expr: "Pain(S) = Σ callOI(K)·max(S−K,0) + Σ putOI(K)·max(K−S,0)", meaning: "Max pain is the S that minimises Pain(S). It uses live OI, not volume, not IV." },
      { t: "p", text: "Writers as a group are hurt less if spot expires near that S. That does not mean they can drag Nifty there. On a quiet expiry with concentrated OI, pinning happens often enough that desks respect it. On a Budget day, pain is a museum label on a moving truck." },
      { t: "callout", kind: "caution", title: "Expiry afternoon", text: "Gamma of remaining ATM options explodes. A 40-point swing can force hedges that create the next 40 points. If you are short the body into the last hour, you are volunteering for that job. Defined wings or flat is a position. 'It will pin' is a hope." },
      { t: "example", title: "Pain versus tape", body: "Chain says max pain 24,100, spot 24,080, 90 minutes to close. Useful as: 'dealers are least unhappy near 24,100 if OI does not shift'. Not useful as: 'buy the 20-point dip for a pin'. If 24,200 call OI dumps and 24,000 put OI dumps, pain will walk — and so should you." },
    ],
    takeaways: ["Max pain is an OI-weighted expiry cost, not a target.", "It moves when OI moves.", "Pin risk is a gamma problem into the close."],
    quiz: { q: "Max pain uses:", options: ["Only volume", "Strike-wise open interest and intrinsic payouts", "India VIX only", "FII cash"], answer: 1, why: "Pain is writer payout from OI. Volume and VIX are other cameras." },
  },
  "positioning-06": {
    lead: "Volume, open interest and implied volatility are three cameras on the same strike. They disagree. The research job is to write all three, not to pick the screenshot that fits the trade you already wanted.",
    covers: [
      "Volume = today's activity.",
      "OI = overnight inventory.",
      "IV = price of optionality.",
      "A checklist when they conflict.",
    ],
    blocks: [
      { t: "table", caption: "Three cameras, one strike", headers: ["Camera", "Asks", "Lies if you use it alone"], rows: [
        ["Volume", "Who showed up today?", "Day-traders can print volume and leave OI unchanged"],
        ["OI", "What is still on overnight?", "Does not say long or short"],
        ["IV / skew", "How expensive is the optionality?", "IV can be high because of an event, not because of 'fear' in the way Twitter means it"],
      ] },
      { t: "p", text: "Classic combo: price down, put volume spike, put OI flat, IV up. Translation: people rented puts for the day and closed them; overnight inventory did not change; optionality got richer. That is not 'new shorts built a wall'." },
      { t: "p", text: "Opposite combo: quiet volume, OI up 15% at 24,000 PE, IV unchanged. Someone initiated and is sitting. That inventory will still be there tomorrow to hedge or to panic. Different desk response: you care about tomorrow's gamma, not today's noise." },
      { t: "callout", kind: "idea", title: "Write the sentence", text: "One line per strike: '24,100 PE — vol high, OI +8%, IV −0.4'. If you cannot finish the line, you do not have a reading yet." },
    ],
    takeaways: ["Three cameras, three questions.", "Conflict is information.", "A wall that is only volume is a day-wall."],
    quiz: { q: "Huge put volume, unchanged put OI, rising IV most likely means:", options: ["A new overnight put wall was built", "Intraday demand for puts that was largely closed, with optionality re-priced", "Max pain moved 500 points", "Cash market is closed"], answer: 1, why: "Volume without OI is turnover, not inventory." },
  },
  "positioning-07": {
    lead: "Delta is the share-equivalent of an option. A book is a pile of deltas. Dealers who sold options often hedge those deltas in futures or cash. Your 'view' and their hedge can be the same print.",
    covers: [
      "Delta as cash-equivalent.",
      "Why ATM delta is near 0.5, not magic.",
      "Hedging a short call by buying futures.",
      "Lot size turns delta into Nifty units.",
    ],
    blocks: [
      { t: "formula", expr: "Share-equivalent ≈ Δ × lots × lot size", meaning: "Short 2 Nifty 24,100 CE, Δ 0.42, lot 65 → 2 × 0.42 × 65 ≈ 54.6 Nifty units short. That is a mini futures position hiding in an option." },
      { t: "diagram", name: "greeks" },
      { t: "p", text: "If you are long a call, you are long delta: you want spot up. If a dealer is short that call, they are short delta and may buy futures as spot rises to stay neutral. That buying is not 'bullish FIIs'. It is a hedge. On the way down they sell the futures back. This is how option inventory becomes tape." },
      { t: "example", title: "One lot, one delta", body: "Long 1 lot 24,100 CE at ₹62.10, delta 0.48. Spot +20 points, other things equal, premium ≈ +₹9.6. P&L ≈ 9.6 × 65 = ₹624. The same +20 on 0.48 × 65 ≈ 31 cash units is 31 × 20 = ₹620. Delta is the translator between option rupees and index rupees." },
      { t: "callout", kind: "caution", title: "Delta is local", text: "A 0.48 delta is the slope now. After a 150-point rip it is not 0.48. That change is gamma — next chapter. Never size a two-day hold on a snapshot delta as if it were a futures lot." },
    ],
    takeaways: ["Delta translates options into underlying units.", "Dealer hedges can be the tape.", "Delta is a slope, not a promise."],
    quiz: { q: "A dealer short ATM calls who wants to stay delta-neutral as Nifty rallies will typically:", options: ["Sell futures", "Buy futures (or cash) to offset the short-call delta getting more negative", "Close the cash market", "Ignore gamma"], answer: 1, why: "Short calls become shorter delta as spot rises. Neutral means buying the underlying." },
  },
  "positioning-08": {
    lead: "Gamma is how fast delta changes when spot moves. Long gamma: your position gets more helpful as the move extends. Short gamma: your hedge has to chase, and chasing is how quiet premium-selling becomes a very loud afternoon.",
    covers: [
      "Long gamma versus short gamma P&L shape.",
      "Why short-dated ATM options are gamma monsters.",
      "Hedging short gamma is a job, not a coupon.",
      "Expiry-week gamma is a different sport.",
    ],
    blocks: [
      { t: "diagram", name: "gamma-profile" },
      { t: "p", text: "Buy a straddle: you are long gamma. If Nifty trends, delta grows in your favour; you can scalp the hedge. If Nifty sits, theta eats you. Sell a straddle: you collect theta if realised vol is sleepy; if Nifty trends, delta runs against you and every hedge is a buy-high / sell-low. That is the whole short-gamma business." },
      { t: "formula", expr: "Δ_new ≈ Δ_old + Γ × ΔS", meaning: "Rough linear sketch. For a 50-point Nifty move, gamma 0.004 per point lifts a 0.48 delta toward 0.68. On 2 lots × 65 that is a lot of extra futures-equivalent you did not plan at the open." },
      { t: "example", title: "Short 2 ATM weeklies", body: "Short 2 × 24,100 CE, delta 0.45, gamma 0.0035 / point, lot 65. Spot +80. New delta ≈ 0.45 + 0.0035×80 = 0.73. Share-equivalent from 2×0.45×65 = 58.5 short to 2×0.73×65 = 94.9 short. You just grew a 36-unit extra short into a rally. That is not 'the market is wrong'. That is your gamma." },
      { t: "callout", kind: "india", title: "Tuesday / Thursday clocks", text: "Nifty weekly expiry is Tuesday on NSE (from 28 Nov 2024). Sensex weekly is Thursday on BSE. A structure that was a sleepy 15-day condor is a gamma event if you still hold it into the last 48 hours of its own expiry. Roll, wing it, or size it as a day job. Do not mix the two weekday clocks." },
    ],
    takeaways: ["Gamma mutates delta.", "Short gamma pays theta and buys a chasing hedge.", "Tenor is part of gamma."],
    quiz: { q: "All else equal, which book has the most gamma risk?", options: ["Long 30-day 5% OTM puts", "Short ATM options with two days to expiry", "A cash Nifty ETF", "A G-Sec ladder"], answer: 1, why: "Short-dated ATM is where gamma lives." },
  },
  "positioning-09": {
    lead: "Dealer gamma — sometimes labelled GEX — asks: is the Street, in aggregate, long or short gamma at this spot? If dealers are short gamma, their hedges amplify moves. If they are long gamma, their hedges dampen moves. It is a regime, not a crystal ball.",
    covers: [
      "Who the 'dealer' is in an Indian index book.",
      "Positive GEX (long gamma) versus negative GEX.",
      "The gamma flip / zero-gamma level.",
      "How to use it without worshipping a Twitter overlay.",
    ],
    blocks: [
      { t: "diagram", name: "gex-flip" },
      { t: "p", text: "Market-makers who sold OTM wings and bought ATM, or the reverse, end up with a gamma profile that changes sign across strikes. Below a flip, they may be short gamma: they sell rallies and buy dips in a way that actually chases — sell more as it falls, buy more as it rips. Above the flip, long-gamma dealers buy dips and sell rips, which can pin." },
      { t: "ul", items: ["Spot above a well-watched flip + quiet realised vol: pin / mean-revert hypotheses get a hearing.", "Spot below the flip + a catalyst: trend and stop-runs get a hearing.", "Flip levels are estimated from OI + assumed dealer positioning. They are not NSE official prints."] },
      { t: "callout", kind: "caution", title: "GEX is a model", text: "Public GEX charts assume dealers are short customer-bought options. That is often directionally right on index, and wrong on a single stock where the 'customer' is a buyback hedge. If you cannot name the assumption, you cannot use the number." },
      { t: "example", title: "Flip versus 24,080", body: "Suppose a desk's GEX overlay puts zero-gamma near 24,150, spot 24,080. You are in the 'dealers short gamma' zone on that model. A 120-point trend day is more plausible than a magnet to 24,100. If instead GEX is firmly positive and VIX is sleepy, the same 24,080 is a mean-revert lab. Same spot, different regime — write the regime before the trade." },
    ],
    takeaways: ["Dealer gamma is a regime label.", "Flip levels are estimates.", "Short-gamma regimes amplify; long-gamma regimes can pin."],
    quiz: { q: "If dealers are short gamma and Nifty starts falling, their delta-hedges typically:", options: ["Buy futures and stop the fall", "Sell more underlying as delta gets shorter — which can accelerate the fall", "Close NSE", "Raise the lot size"], answer: 1, why: "Short gamma hedges chase the move." },
  },
  "positioning-10": {
    lead: "Theta is the rent time value pays the seller if nothing else moves. Something else almost always moves. Treat theta as a budget, not a salary.",
    covers: [
      "Theta is not linear — it accelerates near expiry.",
      "Weekend theta is priced before Friday's close.",
      "Long options buy theta-decay; short options sell it.",
      "Theta versus gamma is the core options trade-off.",
    ],
    blocks: [
      { t: "diagram", name: "theta-decay" },
      { t: "p", text: "A 30-day ATM Nifty option does not bleed 1/30 of its time value each morning. Decay is back-loaded. The last five sessions of a weekly can take more premium than the previous fortnight. That is why 'I will sell on Monday and collect the week' and 'I will buy on Thursday for a Friday miracle' are two very different jobs." },
      { t: "formula", expr: "If nothing moves: Δpremium ≈ Θ × Δt  (Θ usually quoted negative for longs)", meaning: "A theta of −4.5 on a long 24,100 CE means roughly ₹4.5 × 65 ≈ ₹292 per lot per day of calm. A 30-point Nifty pop can erase a week of that rent in an hour." },
      { t: "callout", kind: "india", title: "Weekends and holidays", text: "Saturday and Sunday still exist in the pricing calendar. A lot of Friday premium already includes the weekend. Buying a weekly at 3:20pm Friday to 'collect Saturday theta' as a seller is a real job; as a buyer you paid for those two days already." },
      { t: "example", title: "Quiet Tuesday", body: "Long 15-Sep 24,100 CE at ₹241.90, theta roughly −6. Spot unchanged, IV unchanged: you donated ~₹390/lot that session. Short the same call: you collected it — and sat on the gamma from chapter 8. Write both sides of the invoice." },
    ],
    takeaways: ["Theta is a calm-day budget.", "Decay accelerates into expiry.", "You cannot collect theta without wearing gamma."],
    quiz: { q: "Selling short-dated ATM options primarily earns money from:", options: ["Unlimited delta without risk", "Theta (and often vega) if realised moves stay small enough", "SEBI rebates", "Max pain guarantees"], answer: 1, why: "The coupon is decay. The bill is gamma and gap risk." },
  },
  "positioning-11": {
    lead: "Vega, vanna and charm are why a book that was 'delta-neutral' at 9:16 is not delta-neutral at 11:00 even if spot is unchanged. Second-order Greeks are how desks get surprised on event days.",
    covers: [
      "Vega: sensitivity to implied vol.",
      "Vanna: how delta changes when IV changes.",
      "Charm: how delta changes as time passes.",
      "Event days mix all three.",
    ],
    blocks: [
      { t: "table", caption: "Second-order desk", headers: ["Greek", "Asks", "When it bites"], rows: [
        ["Vega", "If IV rises 1 point, how much does premium move?", "Budget, results, geopolitics, VIX spikes"],
        ["Vanna", "If IV changes, how does my delta change?", "IV crush after results — hedges you no longer need"],
        ["Charm (delta decay)", "If only time passes, how does delta drift?", "Expiry week, when ATM delta slides toward 0 or 1"],
      ] },
      { t: "p", text: "You sold a straddle into results. Spot barely moves (you 'won' the direction bet) but IV collapses. Vega crushes the premium — good for you as seller. Vanna also cuts the delta of whatever is left, so the hedge you bought yesterday is now too big. If you do not take the hedge off, you have a leftover futures view you never wanted." },
      { t: "example", title: "Crush and leftover delta", body: "Short ATM straddle, delta ~0, vega 12 per option, 1 lot each side, lot 65. IV −4 points. Rough vega P&L ≈ 12 × 4 × 65 × 2 = ₹6,240 in your favour if the model is linear — it isn't, but the sign is right. Meanwhile charm into expiry pushes the call delta down and the put delta up (less short / less long). A 'flat' book at the open is a managed book by lunch." },
      { t: "callout", kind: "caution", title: "Vendor units", text: "Some platforms quote vega in rupees per lot, some in premium points per IV point. Mixing them is how a 'small vol bet' becomes a large one. Write the unit on the card." },
    ],
    takeaways: ["Vega prices the event.", "Vanna and charm move delta without a print on Nifty.", "Flat is a process, not a setting."],
    quiz: { q: "After a result, spot is unchanged but IV collapses. A short straddle typically:", options: ["Loses on vega", "Gains on vega (crush helps the seller) while delta hedges may need reducing", "Is unaffected", "Turns into a future"], answer: 1, why: "You sold optionality; cheaper optionality is your P&L — then re-hedge." },
  },
  "positioning-12": {
    lead: "A daily OI and Greeks pass is a one-page research habit, not a prediction engine. Ten minutes. Same order every session. If a number is missing, write 'unavailable' — do not borrow a WhatsApp screenshot.",
    covers: [
      "Start from spot, tenor and VIX.",
      "Read futures quadrant, then strike walls, then PCR.",
      "Name your gamma sign and theta budget.",
      "Only then pick a structure — or nothing.",
    ],
    blocks: [
      { t: "steps", items: [
        "Spot, session high/low, India VIX, and which expiry you are reading (7-day / 15-day / monthly).",
        "Index futures: price vs ΔOI → one quadrant label, marked as hypothesis.",
        "Three strikes: ATM, nearest put wall, nearest call wall — LTP, OI, ΔOI, IV.",
        "PCR(OI) and PCR(volume) for that expiry only.",
        "Max pain if you use it — and whether OI shifted since yesterday.",
        "Your book's gamma sign, theta budget, and max loss in rupees per lot.",
        "Structure that matches (or: no trade). Write max loss before you write the strike.",
      ] },
      { t: "example", title: "Filled card, 31 Aug 2026 close", body: "Spot 24,080. 01-Sep weekly. VIX moderate. Futures: down-day with OI up → short build-up (hypothesis). ATM 24,100: CE 62.10 / PE 62.50. Put wall 24,000 PE 25.90; call wall 24,200 CE 25.60. OI PCR ~1.1. Pain near 24,100. If you sell the 24,000/24,200 iron, credit is small and Tuesday gamma is not. Either wing it, take the 15-Sep tenor, or pass. Passing is a research output." },
      { t: "callout", kind: "idea", title: "ABC desks", text: "NIFTY Strategy already stamps 7-day, 15-day and monthly expiries with verified NSE premiums and lot 65. Use this checklist on those cards: does the structure match the OI regime you just wrote, or did you pick it because the payoff cartoon was pretty?" },
      { t: "lab", name: "payoff" },
    ],
    takeaways: ["Same order every day.", "Missing data stays missing.", "The last line is a structure or a pass."],
    quiz: { q: "You cannot get ΔOI for a strike today. You should:", options: ["Copy a Telegram wall call", "Mark that strike's ΔOI unavailable and not pretend you have a build-up label", "Assume OI doubled", "Trade double size"], answer: 1, why: "Research without a number is a blank. Filling it from a group is fiction." },
    sources: [NSEOI, NSEFO],
  },
});

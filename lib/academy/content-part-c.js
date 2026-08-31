const { expandLesson } = require("./expand");

const MCX = { label: "MCX", href: "https://www.mcxindia.com" };
const NSECD = { label: "NSE currency derivatives", href: "https://www.nseindia.com/products-services/currency-derivatives" };

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "commodities-01": {
    lead: "Commodities are physical stories with warehouse receipts, weather, geopolitics, and a cost of carry. They are not 'stocks that shine'.",
    blocks: [
      { t: "p", text: "Gold trades fear, real rates, and the dollar. Crude trades OPEC, US inventories, and growth. Agri trades rain. If you apply an RSI-only personality from Nifty to crude, you will meet a gap that does not care." },
      { t: "callout", kind: "idea", title: "Different animal", text: "Equities have residual cash-flow claims. Commodities have convenience yield and storage. Valuation tools do not copy-paste." },
    ],
    takeaways: ["Physical world, financial wrapper.", "Each commodity has its own drivers.", "Nifty habits are not a crude system."],
    quiz: { q: "The most important difference versus equity is that commodities:", options: ["Have P/E ratios", "Are claims on a physical good with carry, storage and seasonality", "Never gap", "Are regulated by your RWAs"], answer: 1, why: "Spot-physical plus carry is the core." },
    sources: [MCX],
  },
  "commodities-02": {
    lead: "MCX is where India prices rupee gold, silver, crude, and natural gas in standardised lots. Read the contract, the unit, and the delivery logic.",
    blocks: [
      { t: "table", caption: "Desk memory (always re-check live specs)", headers: ["Contract", "Why people use it"], rows: [["Gold / Gold Mini", "Rupee hedge, jewellery, macro fear"], ["Silver", "Industrial + monetary hybrid; wilder than gold"], ["Crude oil", "Global beta and geopolitics; US-linked"], ["Natural gas", "Notoriously violent; not a beginner toy"]] },
      { t: "callout", kind: "caution", title: "Gas and crude", text: "Energy contracts can move in ways that look like a bug. They are not. Size as if a limit day is possible." },
    ],
    takeaways: ["MCX = rupee commodity venue.", "Specs first.", "Energy is a specialist product."],
    quiz: { q: "Natural gas futures are generally:", options: ["A gentle first commodity", "Highly volatile and easy to mis-size", "The same as a gold bond", "Cash-market CNC"], answer: 1, why: "NG is famous for violent ranges." },
    sources: [MCX],
  },
  "commodities-03": {
    lead: "Agri futures (where available and liquid) live on weather, sowing, buffer stocks, and government policy. Seasonality is a base rate, not a calendar alert that prints money.",
    blocks: [
      { t: "p", text: "A monsoon that is 'normal' on average can still ruin a local crop. Policy (MSP, export bans, stock limits) can overwhelm a chart. Liquidity in many agri contracts is not Nifty. If you cannot exit, seasonality trivia is a hobby." },
    ],
    takeaways: ["Weather + policy dominate.", "Seasonality is a base rate.", "Liquidity is the first filter."],
    quiz: { q: "An export ban on a crop is most like:", options: ["A free RSI buy", "A regime change for that contract", "A stock split", "A demat credit"], answer: 1, why: "Policy rewrites the supply curve." },
  },
  "commodities-04": {
    lead: "USDINR is the exchange rate with a derivatives market on NSE (and related venues). Exporters, importers, and carry traders live here. You are visiting.",
    blocks: [
      { t: "p", text: "RBI is not a bystander. Managed float means your textbook 'free currency' intuition is incomplete. Overnight gaps around global dollar moves still happen. Options on currency have their own liquidity pockets." },
      { t: "callout", kind: "india", title: "Hedgers first", text: "If you speculate in USDINR, remember the other side is often a corporate hedge, not another hobbyist." },
    ],
    takeaways: ["USDINR is a managed-float tape.", "RBI matters.", "Corporates hedge here; respect that flow."],
    quiz: { q: "USDINR in India is best described as:", options: ["A free-floating meme coin", "A managed float with an active derivatives overlay", "Fixed at 50 forever", "Unregulated"], answer: 1, why: "Managed float + listed derivatives." },
    sources: [NSECD],
  },
  "commodities-05": {
    lead: "The roll in commodities is where storage, tightness, and hedging pressure show up as cash. If you always roll a long, you pay (or receive) the term structure.",
    blocks: [
      { t: "p", text: "A long crude that sits in persistent contango bleeds roll. A long in backwardation may get paid to roll — until the tightness ends. Inventory data and term structure are the research, not a moving average on the front month alone." },
    ],
    takeaways: ["Roll is P&L.", "Term structure is information.", "Front-month charts hide carry."],
    quiz: { q: "Persistent contango for a long futures holder typically:", options: ["Pays them on each roll", "Costs them on the roll, all else equal", "Eliminates SPAN", "Converts to equity"], answer: 1, why: "You sell cheap nearby, buy richer deferred — bleed." },
  },
  "commodities-06": {
    lead: "Commodity risk is not equity risk with a different colour. Correlations spike in crises, then decouple when you counted on the hedge.",
    blocks: [
      { t: "p", text: "Gold sometimes hedges equity drawdowns and sometimes falls with everything when liquidity is the only asset. Crude can trade like a risk-on equity beta. Position-level risk additivity is a myth if all your 'diversifiers' share a dollar-liquidity factor." },
    ],
    takeaways: ["Correlations are regime-dependent.", "Gold is not a guaranteed crash put.", "Name the common factor."],
    quiz: { q: "In a violent dollar-liquidity crunch, gold and crude may:", options: ["Always rally", "Both sell off with equities as cash is king", "Be frozen by your RWA", "Ignore SPAN"], answer: 1, why: "Liquidity regimes dominate labels." },
  },
  "commodities-07": {
    lead: "If you do not intend delivery, do not behave like someone who might be forced toward it. Margins, tender periods, and intent flags exist for a reason.",
    blocks: [
      { t: "p", text: "Most active traders square before delivery cycles. RMS will often force you. Treating a mini-gold future like a jewellery purchase is a category error. Conversely, hedgers who need metal should use the correct contract and documentation — not a weekend Telegram 'physical delivery hack'." },
      { t: "callout", kind: "caution", title: "Intent", text: "Exchanges and brokers ask whether you are a hedger. Lying is not a strategy." },
    ],
    takeaways: ["Square if you are a speculator.", "Delivery is an operational process.", "Hedger status is not a costume."],
    quiz: { q: "A discretionary trader in MCX gold futures should usually:", options: ["Wait for compulsory delivery as a hobby", "Manage and square as a financial contract unless they are set up for delivery", "Store bars in the locker from the lot", "Ignore margins"], answer: 1, why: "Financial use unless you are actually in the physical chain." },
  },
  "commodities-08": {
    lead: "A commodity notebook has drivers, calendar, term structure, and a 'what would invalidate' line. Without that it is a quote watchlist.",
    blocks: [
      { t: "ul", items: ["Primary driver this month (real rates, OPEC, USD, monsoon).", "Term structure sketch.", "Event calendar (inventory, FOMC, weather).", "Max heat in R.", "Forbidden contracts (if NG is too hot for your size, write it down)."] },
    ],
    takeaways: ["Drivers on paper.", "Forbidden list for violent contracts.", "Calendar before the chart."],
    quiz: { q: "The first line of a crude notebook should be:", options: ["A lucky colour", "The current macro driver and invalidation", "Your neighbour's view", "A P/E"], answer: 1, why: "Commodities are driver markets." },
  },

  "psychology-01": {
    lead: "Your account is a printout of your behaviour under uncertainty. Pretending it is only 'the market' is how the same leak survives ten years.",
    blocks: [
      { t: "p", text: "Two traders can see the same Nifty level. One has a written invalidation and sleeps. The other negotiates with the tape because the last three trades were losers. The difference is not IQ. It is process under threat." },
      { t: "callout", kind: "idea", title: "Identity", text: "If your self-worth tracks the day P&L, you will take trades to repair a feeling. That is expensive therapy." },
    ],
    takeaways: ["P&L is feedback on behaviour.", "Identity ≠ daily P&L.", "Process is what you do when you feel stupid."],
    quiz: { q: "The account statement is most useful as:", options: ["Proof you are a genius", "A behaviour log that includes your worst hours", "A substitute for a journal", "A SEBI filing"], answer: 1, why: "It records what you actually did." },
  },
  "psychology-02": {
    lead: "Biases are not insults. They are default firmware. Name them so you can put a rule in front of them.",
    blocks: [
      { t: "table", caption: "A working catalogue", headers: ["Bias", "Market costume"], rows: [["Loss aversion", "Moving a stop because 'it will come back'"], ["FOMO", "Chasing the third breakout of the hour"], ["Recency", "The last week is 'the new regime'"], ["Confirmation", "Only reading bulls after you are long"], ["Overconfidence", "Size up after two wins"], ["Anchoring", "Cost basis as a religion"], ["Narrative", "A story so good the price is optional"]] },
      { t: "p", text: "You will not delete biases. You will intercept them: a checklist, a cooling-off rule, a max size, a 'no trade in the first ten minutes if I am angry' line." },
    ],
    takeaways: ["Name the bias in real time.", "Intercept with a rule, not a pep talk.", "Cost basis is history, not a thesis."],
    quiz: { q: "Moving a stop further because you are losing is usually:", options: ["Advanced risk management", "Loss aversion protecting an ego", "A hedge", "Required by SPAN"], answer: 1, why: "The stop was the plan; moving it is negotiation." },
  },
  "psychology-03": {
    lead: "A good process can lose today. A bad process can win today. If you only reward outcomes, you will scale the luck and kill the skill.",
    blocks: [
      { t: "p", text: "Grade the trade: Did I follow the map? Did I size 1R? Did I respect the kill switch? A −1R that followed the plan is an A. A +3R revenge trade is a D with a trophy. Over a hundred trades, the grades predict the equity curve better than any one P&L." },
      { t: "callout", kind: "desk", title: "Review", text: "Weekly: count process-A trades vs impulse trades. If impulse is paying you this month, do not scale it. Variance is not a guru." },
    ],
    takeaways: ["Grade process, not the day.", "Lucky impulse is still impulse.", "Sample size before self-mythology."],
    quiz: { q: "A revenge winner should be logged as:", options: ["Proof the anger method works", "A process failure that happened to print green", "A hedge", "Tax-free income"], answer: 1, why: "You want to kill the behaviour, not franchise it." },
  },
  "psychology-04": {
    lead: "Drawdown is a percentage from peak. It is also a mood. If you do not plan the mood, you will 'make it back' at the worst size.",
    blocks: [
      { t: "formula", expr: "Drawdown = (Peak − Trough) / Peak", meaning: "A 20% hole needs 25% to recover. A 50% hole needs 100%. Arithmetic is rude on purpose." },
      { t: "p", text: "Professionals cut size in drawdown. Amateurs double it. Write the rule: at −6R on the week, size halves; at the monthly cap, flat. Your future self is not wiser in pain. He is louder." },
    ],
    takeaways: ["Recovery maths is asymmetric.", "Cut size in holes.", "Write the drawdown protocol in calm."],
    quiz: { q: "After a 50% drawdown you need:", options: ["50% to get back to even", "100% to get back to even", "10%", "A split"], answer: 1, why: "Percentages on a lower base." },
  },
  "psychology-05": {
    lead: "Revenge trading is trying to take money back from a personified tape. Overtrading is paying the fee stack to feel involved.",
    blocks: [
      { t: "p", text: "After a stop, the brain wants immediate repair. The market does not owe you a repair print. Stand up. Water. Ten minutes. If the next signal still exists without your anger, maybe. If you can only see 'one more', you are done for the session." },
      { t: "callout", kind: "caution", title: "Platform design", text: "One-click order tickets and mobile push are not your friends when you are tilted. Remove easy mode during a kill-switch day." },
    ],
    takeaways: ["No immediate repair trades.", "Overtrading is a fee donation.", "Make the next order slightly harder when tilted."],
    quiz: { q: "The first action after a painful stop should usually be:", options: ["Double the lot", "A pause and a check against the kill switch", "A new instrument to 'diversify the pain'", "A forum post"], answer: 1, why: "Physiology first, then rules." },
  },
  "psychology-06": {
    lead: "A journal that only stores P&L is an accounting file. A journal that stores state, rule-breaks, and screenshots of the plan is a behaviour-change tool.",
    blocks: [
      { t: "ul", items: ["Before: bias, trigger, invalidation, size, emotion 1–5.", "After: followed plan? Y/N. What did I add that wasn't in the plan?", "Weekly: three leaks, one keep.", "Screenshot the order ticket, not just the winner candle."] },
      { t: "callout", kind: "desk", title: "Library worksheet", text: "Use the journal CSV in Field Kit. If you will not write five fields, you will not magically become disciplined on Nifty options." },
    ],
    takeaways: ["Log state and rule-breaks.", "Weekly leak review.", "If it is not written, it did not happen as a process."],
    quiz: { q: "The most useful journal field after P&L is usually:", options: ["Font", "Whether the plan was followed", "Follower count", "Broker's colour theme"], answer: 1, why: "Process adherence is the training data." },
  },
  "psychology-07": {
    lead: "Sleep, food, and a boring routine are alpha because decision quality is a biological resource. You cannot 'mindset' your way out of a 5-hour night and six screens.",
    blocks: [
      { t: "p", text: "Pre-open checklist, defined session end, no charts in bed. If you trade for a living, treat the night like an athlete. If you trade around a job, your edge cannot require staring at 1-minute candles from 9:15 to 15:30. Design a session that fits the nervous system you actually have." },
    ],
    takeaways: ["Biology first.", "Session design is risk management.", "You cannot watch every tick as a side job."],
    quiz: { q: "Trading a full F&O day on four hours of sleep is:", options: ["Hardcore professionalism", "A hidden increase in impulse risk", "Required by NSE", "A hedge"], answer: 1, why: "Fatigue raises impulse." },
  },
  "psychology-08": {
    lead: "Rules that survive a bad Thursday are short, written, and non-negotiable that day. Everything else is a preference.",
    blocks: [
      { t: "ul", items: ["Daily loss cap in R — hit it, flatten, leave.", "Max trades — hit it, stop.", "No adding to losers.", "No new risk in the last 20 minutes unless it was planned.", "No 'just this once' on the forbidden list."] },
    ],
    takeaways: ["Few rules, enforced.", "Forbidden list is sacred that day.", "Leave the chair is a valid order."],
    quiz: { q: "When the daily loss cap is hit, the professional next action is:", options: ["One recovery trade", "Flatten and stop", "Switch to a friend's account", "Increase lots"], answer: 1, why: "A cap that you ignore is decoration." },
  },

  "risk-01": {
    lead: "Edge without a risk definition is a hobby with a Bloomberg aesthetic. Write what you can lose before you write what you might make.",
    blocks: [
      { t: "p", text: "Risk is the distribution of bad outcomes you accept. If you cannot describe the left tail of this trade in one sentence, you are not risking — you are wishing. Markets pay people who survive long enough for a small edge to compound." },
    ],
    takeaways: ["Define the left tail first.", "Survival enables compounding.", "Unnamed risk will name itself."],
    quiz: { q: "The first line of a trade card should be:", options: ["Target multiple", "How this can lose and how much", "A motivational quote", "Brokerage cashback"], answer: 1, why: "Risk first." },
  },
  "risk-02": {
    lead: "R is the unit. 1R is what you lose if the idea is wrong and you follow the stop. Size the position so that 1R is a boring number.",
    blocks: [
      { t: "formula", expr: "Shares (or lots) = 1R rupees / (entry − invalidation)", meaning: "For a long. For options, 1R = max loss of the defined structure, not the credit." },
      { t: "diagram", name: "sizing" },
      { t: "p", text: "If 1R is 0.5% of equity, a streak of ten losers is 5% — unpleasant, not fatal. If 1R is 8%, two bad days are an identity crisis." },
    ],
    takeaways: ["R is the loss unit.", "Size from the stop, not the dream.", "Boring R is the point."],
    quiz: { q: "You risk ₹5,000 per idea with a ₹10 stop on a stock. Size is:", options: ["50 shares", "500 shares", "5,000 shares", "1 lot of Nifty"], answer: 1, why: "5,000 / 10 = 500." },
  },
  "risk-03": {
    lead: "Correlation is how your 'diversified' book becomes one trade. Six bank longs, a Bank Nifty future, and a short put on a lender is not six ideas.",
    blocks: [
      { t: "p", text: "Add exposures by factor: index beta, rates, USD, oil, promoter-pledge stress. A heat map of 'how many R if Nifty −2%' is more useful than a ticker count." },
    ],
    takeaways: ["Factors, not ticker count.", "Stacked derivatives on the same name are one bet.", "Measure R if the index gaps."],
    quiz: { q: "Long HDFC Bank, long ICICI, short puts on Axis, long Bank Nifty futures is:", options: ["Four uncorrelated alphas", "Mostly one rates-and-credit / bank-beta stack", "A commodity hedge", "Market-neutral"], answer: 1, why: "Same factor family." },
  },
  "risk-04": {
    lead: "A stop can be a price, a time, or a thesis break. Using only 'I feel it' is how 1R becomes 4R.",
    blocks: [
      { t: "ul", items: ["Price stop: the structure is wrong.", "Time stop: if it has not worked in N sessions, capital is idle.", "Thesis stop: the reason died (earnings, fraud, policy) even if price has not hit the line."] },
      { t: "callout", kind: "caution", title: "Gaps", text: "Stops are instructions, not fills. Overnight news can jump them. Size as if the fill is worse." },
    ],
    takeaways: ["Three kinds of stop.", "Gaps slip.", "Thesis can die before the line."],
    quiz: { q: "A stock gaps through your stop on a result. You:", options: ["Wait for the original line", "Treat the idea as invalidated and manage the actual fill", "Add", "Argue with the exchange"], answer: 1, why: "The thesis/price plan is broken; manage reality." },
  },
  "risk-05": {
    lead: "Kelly is a formula for growth if you know your edge with godlike precision. You do not. Half-Kelly and fractional bets exist because estimation error is the real world.",
    blocks: [
      { t: "formula", expr: "Full Kelly f* ≈ edge / odds", meaning: "For a simplified bet. Full Kelly is violent in drawdown when p is mis-estimated. Most discretionary traders should not live near full Kelly." },
      { t: "p", text: "Ruin is the probability that a streak takes you out of the game. Small R and uncorrelated bets are how you push ruin toward 'not in my lifetime'." },
    ],
    takeaways: ["Full Kelly assumes you know p.", "Fractional Kelly is humility.", "Ruin is the true constraint."],
    quiz: { q: "Most discretionary traders should treat full Kelly as:", options: ["A mandatory lot size", "An upper bound they stay well below", "A SEBI rule", "A stop"], answer: 1, why: "Estimation error + path = violence." },
  },
  "risk-06": {
    lead: "Expectancy is average R per trade. A 0.3R expectancy with 200 samples is a business. A 3R expectancy with 8 samples is a campfire story.",
    blocks: [
      { t: "formula", expr: "Expectancy = (Win% × Avg win R) − (Loss% × Avg loss R)", meaning: "If avg loss is not 1R, your stops are leaking. Fix that first." },
      { t: "p", text: "Costs sit inside the average. A system that is +0.1R before costs and −0.2R after is a broker-loyalty programme." },
    ],
    takeaways: ["Expectancy needs sample size.", "Keep losses near 1R.", "Include costs."],
    quiz: { q: "40% wins at +2R and 60% losses at −1R has expectancy:", options: ["0.2R", "0.8R", "−0.2R", "2R"], answer: 0, why: "0.4×2 − 0.6×1 = 0.2." },
  },
  "risk-07": {
    lead: "Heat is how much R is on at once. A daily loss cap is how you stop a single session from becoming a month.",
    blocks: [
      { t: "p", text: "Open risk + correlated risk should have a ceiling (for example 4R open, 2R daily realised). When realised hits the cap, you are a spectator. That is a promotion, not a punishment." },
    ],
    takeaways: ["Cap open heat.", "Cap daily realised loss.", "Spectator is a valid seat."],
    quiz: { q: "Hitting a daily loss cap means:", options: ["You now trade bigger to recover", "You stop new risk for the session", "You switch to crypto", "You disable RMS"], answer: 1, why: "The cap is the session's end." },
  },
  "risk-08": {
    lead: "A one-page risk policy is the document you obey when you do not feel like being professional. Fill it. Sign it. Put it near the screen.",
    blocks: [
      { t: "ul", items: ["Universe and forbidden products.", "1R as % of equity.", "Max open heat, daily/weekly caps.", "Drawdown protocol (cut size).", "No adding to losers.", "Review cadence.", "Who you tell when you break it (accountability)."] },
      { t: "callout", kind: "desk", title: "Field kit", text: "Download the risk-policy worksheet from the Library track. If it takes more than a page, you will not read it on a red Thursday." },
    ],
    takeaways: ["One page, enforceable.", "Accountability helps.", "If it is not written, it will be negotiated."],
    quiz: { q: "The risk policy is for:", options: ["Marketing", "The version of you that wants to negotiate after a loss", "SEBI's wall", "The intern"], answer: 1, why: "Stressed-you is the customer." },
  },
});

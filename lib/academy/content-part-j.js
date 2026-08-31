const { expandLesson } = require("./expand");

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "funds-11": {
    lead: "Nifty BeES is an exchange-traded fund. You buy it on NSE like a share. It is designed to track Nifty 50, not to beat it. That is the whole product.",
    covers: [
      "ETF = listed units, live bid–ask, demat.",
      "Index fund = AMC NAV, usually bought by amount not by fill.",
      "BeES, Bank BeES, Junior BeES, Gold BeES are the same idea on different underlyings.",
    ],
    blocks: [
      { t: "p", text: "A mutual fund SIP buys units at that day's NAV. Nifty BeES you buy at the NSE print, in the cash session, in your demat. If you want 'the Nifty' in one click at 10:42am, that is the BeES. If you want a standing SIP of ₹5,000 without watching the tape, a Nifty index fund is usually simpler." },
      { t: "callout", kind: "india", title: "Names", text: "Nippon India ETF Nifty BeES (NIFTYBEES) was India's first ETF. Bank BeES tracks Nifty Bank. Junior BeES tracks Nifty Next 50. Gold BeES tracks gold. They are ETFs, not 'a type of mutual fund you cannot sell'." },
    ],
    takeaways: ["BeES = ETF on NSE.", "Index fund = NAV, not a live fill.", "Same index, different plumbing."],
    quiz: { q: "Nifty BeES is best described as:", options: ["A closed-end IPO", "An NSE-listed ETF that tracks Nifty 50", "A weekly option", "A G-Sec"], answer: 1, why: "It is an ETF. You trade it like a share." },
  },
  "funds-12": {
    lead: "An ETF has two prices: the exchange last and the fund's NAV (or iNAV). The gap is premium or discount. A fat premium is you paying extra for the same basket.",
    covers: ["Premium = last > NAV.", "Discount = last < NAV.", "Liquidity and market-makers keep the gap small on good days."],
    blocks: [
      { t: "formula", expr: "Premium % = (Price − NAV) / NAV × 100", meaning: "Use AMFI's end-of-day NAV versus the close, or iNAV versus the live print. Do not mix yesterday's NAV with this morning's panic print and call it science." },
      { t: "p", text: "On ABC's Mutual Funds & ETFs desk, Nifty BeES shows last, NAV and premium. If Gold BeES is 1.8% rich to NAV, you are paying 1.8% extra versus the metal basket. Authorised participants usually arbitrage that gap. In a stressed tape the gap can stay open longer than a tweet." },
    ],
    takeaways: ["Two prices: tape and NAV.", "Prefer a tight gap and decent volume.", "A persistent premium is not a bargain."],
    quiz: { q: "You buy an ETF 2% above NAV. You have:", options: ["A guaranteed 2% edge", "Paid a 2% premium for the same holdings", "Locked a discount", "Avoided TER"], answer: 1, why: "Premium is an extra you paid versus the basket." },
  },
  "funds-13": {
    lead: "Nifty 50 exposure comes in three common wrappers: index fund, ETF, index futures. Fees, tracking, leverage and behaviour all change. Pick the wrapper for the job, not the one with the prettiest chart.",
    covers: ["Index fund: SIP, NAV, no intraday.", "ETF: demat, live price, can overtrade.", "Futures: leverage, MTM, expiry — not a SIP."],
    blocks: [
      { t: "table", caption: "Same index, three jobs", headers: ["Wrapper", "Use when"], rows: [
        ["Index fund", "Long-term SIP, you do not want a demat fill"],
        ["ETF (BeES)", "You want a live fill or a tactical overlay in demat"],
        ["Nifty futures", "Hedge or short-term leverage with SPAN — never 'investing'"],
      ] },
      { t: "callout", kind: "caution", title: "Do not mix jobs", text: "Rolling a Nifty future as a 10-year SIP is how roll and MTM eat a compounding story. Buying BeES with 5× MTF is a future in costume." },
    ],
    takeaways: ["Wrapper = behaviour.", "Futures are not index funds.", "ETF liquidity is part of the product."],
    quiz: { q: "A 15-year Nifty SIP is usually best in:", options: ["Weekly options", "A low-cost index fund (or a quiet ETF SIP)", "Undated MCX crude", "A short straddle"], answer: 1, why: "Cost and behaviour beat theatre." },
  },
  "funds-14": {
    lead: "Gold exposure in India is jewellery, coins, SGB, Gold BeES / gold ETFs, and MCX gold futures. They are not interchangeable. Jewellery is consumption. Futures are a margin contract. BeES is a fund.",
    covers: ["Jewellery includes making charges.", "SGB has a sovereign wrapper and tenure.", "BeES tracks gold with TER and a possible premium.", "Futures have roll and SPAN."],
    blocks: [
      { t: "p", text: "If the job is 'own gold for 10 years', SGB or a gold ETF usually beats jewellery on cost. If the job is a 2-week hedge on a jewellery book, MCX is the tool. If the job is a wedding, buy the jewellery and stop pretending it is a Sharpe-optimal asset class." },
    ],
    takeaways: ["Name the job.", "Making charges are not NAV.", "Futures ≠ BeES ≠ bangles."],
    quiz: { q: "Gold BeES is closest to:", options: ["A pair of bangles", "An ETF that tracks gold, listed on NSE", "An MCX compulsory-delivery mandate", "A G-Sec STRIPS"], answer: 1, why: "It is a gold ETF." },
  },

  "commodities-09": {
    lead: "A gold plan starts with real rates, the dollar, and why you own it — hedge, trade, or jewellery. MCX gold is a rupee contract; COMEX is dollars. They rhyme. They are not the same print.",
    covers: ["Real rates and USD still dominate.", "MCX vs COMEX vs Gold BeES.", "ATR stops, not round numbers from TV."],
    blocks: [
      { t: "p", text: "ABC's Commodities desk shows COMEX last and the Gold BeES wrapper. Your MCX LTP can differ. Size from ATR. A 'buy gold because Instagram said crash' trade without a stop is a feeling." },
      { t: "callout", kind: "india", title: "Rupee gold", text: "INR weakness can lift MCX gold even when COMEX is sleepy. Write both legs: metal and currency." },
    ],
    takeaways: ["Two prints: dollar gold and rupee gold.", "BeES for demat; MCX for futures.", "ATR is the stop language."],
    quiz: { q: "MCX gold can rally while COMEX is flat mainly because:", options: ["SEBI changed lot size", "The rupee moved, or local demand did", "RSI is illegal", "Gold has a P/E"], answer: 1, why: "Rupee and local premia sit on top of dollar gold." },
  },
  "commodities-10": {
    lead: "Silver is gold's wilder cousin: industrial demand plus monetary premium. It trends harder and gives back harder. Supertrend on silver without ATR size is how accounts vanish on a quiet Tuesday.",
    covers: ["Higher beta than gold.", "Industrial + monetary mix.", "Gold–silver ratio is a context, not a magnet."],
    blocks: [
      { t: "p", text: "When gold rips and silver lags, the ratio stretches. Mean-reversion of that ratio is a research claim with long, expensive exceptions. If you trade silver, size smaller than gold for the same rupee heat." },
    ],
    takeaways: ["Silver needs more heat budget.", "Ratio is context.", "Industrial news can swamp the monetary story."],
    quiz: { q: "Versus gold, silver typically has:", options: ["Tighter ranges and lower ATR", "Wider ranges — size down", "A sovereign guarantee", "No MCX contract"], answer: 1, why: "Silver is the jumpy one." },
  },
  "commodities-11": {
    lead: "Crude and natural gas are geopolitics, OPEC, US inventories, and weather — wrapped in a contract that can gap. They are not 'Nifty but orange'.",
    covers: ["WTI vs Brent vs MCX crude.", "Inventory days matter.", "Natgas is a specialist product."],
    blocks: [
      { t: "p", text: "MCX crude is a rupee overlay on an international barrel. EIA inventories, OPEC headlines, and dollar liquidity move it. Natural gas on MCX is famous for days that look like a data error. They are not. If you cannot watch it, do not sell naked options on it, and think twice about futures." },
      { t: "callout", kind: "caution", title: "Gas", text: "If the Commodities desk flags a range-only or 'pass' on natgas, that is a feature." },
    ],
    takeaways: ["Energy = event risk.", "MCX crude ≠ WTI tick-for-tick.", "Natgas: specialist or skip."],
    quiz: { q: "Natural gas futures are generally:", options: ["Ideal first commodity", "Too violent for a beginner size", "A bond substitute", "Cash CNC"], answer: 1, why: "NG ranges can retire an account." },
  },
  "commodities-12": {
    lead: "Copper is a growth metal: China credit, housing, grids, the energy transition. It is not a precious-metal hedge. Treat it as industrial beta with a warehouse.",
    covers: ["Dr copper as a growth tape.", "Spreads and inventories.", "MCX copper is thinner than gold."],
    blocks: [
      { t: "p", text: "A copper long because 'AI needs wires' still needs a stop. Liquidity on MCX copper is not gold. If the spread is wide, you do not have a strategy — you have a hostage." },
    ],
    takeaways: ["Copper = industrial cycle.", "Liquidity first.", "Narratives do not replace ATR."],
    quiz: { q: "Copper is closer to:", options: ["A crash put like gold sometimes is", "Industrial / growth beta", "A T-bill", "Nifty BeES"], answer: 1, why: "It is a growth metal." },
  },
  "commodities-13": {
    lead: "Calendar spreads and the gold–silver ratio are how professionals express a view without a naked directional bet. They still lose money. They just lose it in a more interesting shape.",
    covers: ["Calendar = near versus far month.", "Ratio = relative value, not a magnet.", "Roll is already a spread you might be ignoring."],
    blocks: [
      { t: "p", text: "Long gold / short silver is a ratio trade. Long far crude / short near is a calendar. Both can be right on the story and red on the marks. Write max heat in rupees. Do not discover the margin on a Sunday night." },
    ],
    takeaways: ["Spreads are still trades.", "Ratio is not a law.", "Name both legs' risk."],
    quiz: { q: "A gold–silver ratio trade still requires:", options: ["No stop, because it is 'relative'", "A rupee heat limit like any other book", "SEBI approval per lot", "Zero margin"], answer: 1, why: "Relative value can still blow up." },
  },
  "commodities-14": {
    lead: "A commodity strategy card is the same discipline as Nifty: bias, wrapper (MCX / BeES / cash), entry, ATR stop, invalidation, size. If you cannot fill the card, you do not have a trade.",
    covers: ["Wrapper first.", "Driver and invalidation.", "Size from ATR, not from conviction."],
    blocks: [
      { t: "steps", items: [
        "Contract and wrapper: MCX gold mini vs Gold BeES vs SGB.",
        "Driver this month (real rates, USD, OPEC, monsoon).",
        "Trend or range? (ADX / SMA). Pass is allowed.",
        "Entry zone, ATR stop, T1/T2 as management — not destiny.",
        "Heat in rupees. Forbidden list (e.g. no naked NG).",
      ] },
      { t: "callout", kind: "desk", title: "ABC desks", text: "Commodities tab prints the technical card. Mutual Funds & ETFs prints BeES premium. Knowledge Centre is the why. Use all three." },
    ],
    takeaways: ["Card before click.", "Wrapper is part of the strategy.", "Forbidden list for violent contracts."],
    quiz: { q: "If you cannot name the wrapper (MCX vs BeES vs SGB) you:", options: ["Are being agile", "Do not yet have a commodity strategy", "Have alpha", "Can skip SPAN"], answer: 1, why: "The wrapper is the product." },
  },
});

const { expandLesson } = require("./expand");

const NSE = { label: "NSE — Learn", href: "https://www.nseindia.com/learn" };
const SEBI = { label: "SEBI investor education", href: "https://investor.sebi.gov.in" };
const NISM = { label: "NISM certifications", href: "https://www.nism.ac.in" };

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "foundations-01": {
    lead: "A market is a matching engine for disagreement. One participant needs cash, another wants the asset. The printed price is only the last place they agreed — not a verdict on value.",
    blocks: [
      { t: "h", text: "Three jobs a market does" },
      { t: "ul", items: ["Price discovery — finding a clearing price in public.", "Liquidity — letting you enter or exit without becoming the market.", "Risk transfer — moving risk to someone who wants to hold it."] },
      { t: "diagram", name: "order-book" },
      { t: "p", text: "Cash markets transfer ownership. Derivatives mostly transfer risk. Confusing the two is how people blow up buying options as if they were shares, or holding futures as if they were delivery of a business." },
      { t: "callout", kind: "india", title: "India desk", text: "On NSE, the cash equity session is 9:15–15:30 IST. Pre-open discovery runs ~9:00–9:08. After-hours is not the same market as the continuous session — treat those prints as a different book." },
      { t: "callout", kind: "caution", title: "Do not do this", text: "Do not treat a last traded price as 'what it is worth'. It is what two people agreed a moment ago, at their size, with their constraints." },
    ],
    takeaways: ["Price is a last print, not intrinsic value.", "Liquidity is a privilege that vanishes when you need it most.", "Know whether you are transferring ownership or transferring risk."],
    quiz: { q: "The last traded price of a share is best described as:", options: ["The true value of the company", "The exchange's official fair value", "The most recent agreed print between a buyer and a seller", "The average of analyst targets"], answer: 2, why: "A print is a transaction, not an appraisal." },
    sources: [NSE, SEBI],
  },
  "foundations-02": {
    lead: "Return is what you earned. Value is what you think the cash flows are worth. Price is what you pay. Mixing the three words is the root of most expensive sentences in markets.",
    blocks: [
      { t: "h", text: "A clean vocabulary" },
      { t: "p", text: "If you buy at ₹100 and sell at ₹112 with a ₹2 dividend, your holding-period return is 14%. That says nothing about whether ₹100 was cheap. Cheap is a value judgement about future cash, risk, and the opportunity set." },
      { t: "formula", expr: "Holding-period return = (P₁ − P₀ + Cash) / P₀", meaning: "Price change plus cash returned, divided by what you paid. Always state the period." },
      { t: "p", text: "Expected return is not a promise. It is a weighted average of scenarios. Professionals write the scenarios down. Amateurs quote a single number from a YouTube thumbnail." },
      { t: "callout", kind: "idea", title: "Key idea", text: "You can have a positive return on an expensive asset (momentum) and a negative return on a cheap asset (value traps). Process is about repeating a positive expectancy — not about being right on one ticket." },
    ],
    takeaways: ["Separate price, value and return in every note you write.", "State the time window whenever you quote a return.", "Expected return without a risk description is incomplete."],
    quiz: { q: "A stock rallied 40% in six months. Which statement is always true?", options: ["It was undervalued at the start", "The holding-period return was 40% if bought at the start and held", "It is now overvalued", "It has low risk"], answer: 1, why: "Return is arithmetic on the path you actually took. Value is a separate claim." },
  },
  "foundations-03": {
    lead: "Volatility is how wildly the mark moves. Risk is what can permanently impair your capital or your plan. They overlap. They are not the same word.",
    blocks: [
      { t: "diagram", name: "risk-triangle" },
      { t: "ul", items: ["Market risk — the index can fall while you are right about the company.", "Liquidity risk — you cannot exit at a reasonable price.", "Leverage risk — futures and options can force you out before the thesis plays.", "Path risk — you can be right eventually and still be ruined on the way.", "Operational risk — fat-finger, wrong lot, wrong expiry, wrong account."] },
      { t: "p", text: "A long-term investor can accept volatility if cash flows are intact. A levered F&O account cannot. That is why 'I can hold' is a sentence that must include your product. You cannot hold a short option through a gap the way you hold a delivery share." },
      { t: "callout", kind: "caution", title: "Permanent loss", text: "Buying a collapsing business because 'it is down 70%' is not volatility harvesting. It can be a permanent loss of capital. Distinguish a cheap price from a damaged asset." },
    ],
    takeaways: ["Name the risk you are actually taking.", "Leverage converts volatility into survival risk.", "If the product can expire or margin-call you, 'long term' is not a hedge."],
    quiz: { q: "Which is primarily survival risk rather than mere volatility?", options: ["Nifty swinging 1% on a live day", "A delivery investor's mark-to-market on a quality compounder", "An overnight short options book into an event", "A stock being quiet for three weeks"], answer: 2, why: "Short options plus an event can take the account before any long-term mean reversion arrives." },
  },
  "foundations-04": {
    lead: "Compounding is arithmetic that looks magical only because people underestimate consistency and overestimate drama.",
    blocks: [
      { t: "formula", expr: "Future = Present × (1 + r)ⁿ", meaning: "r is the rate per period, n is the number of periods. The silent assumption is that you did not interrupt the process." },
      { t: "p", text: "A 12% annualised equity return with money left alone for 20 years is life-changing. A 12% year followed by a −40% blow-up in a leveraged account is not the same family of outcomes. Sequence matters when you withdraw or when you use leverage." },
      { t: "table", caption: "What interruption does", headers: ["Path", "End capital on ₹1,00,000"], rows: [["12% a year, 10 years, undisturbed", "≈ ₹3.11 lakh"], ["12% for 9 years, then −50% in year 10", "≈ ₹1.55 lakh"], ["Same 12% but you pause contributions after a scare", "Depends — usually much less"]] },
      { t: "callout", kind: "idea", title: "The real skill", text: "Staying in a process that has positive expectancy is a risk skill, not a motivation poster. That is why this course treats psychology and risk as core modules, not appendices." },
    ],
    takeaways: ["Compounding needs an uninterrupted process.", "Leverage and withdrawals break the fairy tale.", "Rate of return without survival is a magazine number."],
    quiz: { q: "Compounding is most fragile when:", options: ["You reinvest dividends", "You add money monthly", "You use enough leverage that a normal drawdown ends the process", "You hold for a decade"], answer: 2, why: "Ruin stops the exponent." },
  },
  "foundations-05": {
    lead: "Every fill has a counterparty. If you do not know who typically sits on the other side, you do not understand your edge — or your lack of one.",
    blocks: [
      { t: "h", text: "The usual suspects" },
      { t: "ul", items: ["Hedgers — transferring risk they already have (an exporter selling USDINR, a fund buying puts).", "Market-makers — paid to quote; they want inventory risk small and flow large.", "Institutions (FII/DII, insurers, pensions) — slow money, mandates, benchmarks.", "Retail discretionary traders — often the liquidity, rarely the informed flow.", "Arbitrage desks — stitching cash, futures and options back together."] },
      { t: "p", text: "When you buy a far OTM weekly put because 'Nifty looks heavy', the other side may be a desk that sells that lottery ticket every week as a business. They have a book. You have a hope. Hope is not a book." },
      { t: "callout", kind: "india", title: "India desk", text: "FII and DII cash figures on NSE are not 'the reason Nifty moved today'. They are one tape among derivatives, algos, and retail. Use them as context, not as a remote control." },
    ],
    takeaways: ["Name the counterparty type before you name the setup.", "Lottery-ticket options have a professional seller.", "Institutional flow is context, not a trading signal by itself."],
    quiz: { q: "Selling weekly OTM options as a standing business is most typical of:", options: ["A first-time retail trader", "A hedger with no book", "A market-maker or options overwriter with inventory control", "SEBI"], answer: 2, why: "It is a short-volatility inventory business, not a hunch." },
  },
  "foundations-06": {
    lead: "The bid is what someone will pay. The ask is what someone will sell at. The spread is the tax you pay for impatience and for being small in a thin name.",
    blocks: [
      { t: "diagram", name: "order-book" },
      { t: "p", text: "A market order says 'I need it now'. A limit order says 'I have a price'. Stop orders become marketable when triggered — they do not guarantee the stop price, especially in gaps." },
      { t: "ul", items: ["Marketable limit — a limit priced through the book, usually fills, still has a cap.", "IOC / FOK — fill what you can, or kill.", "SL / SL-M — stop trigger, then a limit or a marketable order. Know which your broker sends."] },
      { t: "callout", kind: "caution", title: "Illiquid F&O", text: "Stock options with wide bid–ask spreads can turn a '₹2 credit' into a 40% haircut on entry. If you cannot get out at a reasonable spread, you do not have a strategy. You have a hostage." },
    ],
    takeaways: ["Spread is a cost. Model it.", "Stops are instructions, not promises.", "Thin books punish market orders."],
    quiz: { q: "A stop-loss market order after a gap open will:", options: ["Always fill at your stop price", "Fill at whatever the market will bear once triggered", "Be rejected by NSE", "Convert into a delivery trade"], answer: 1, why: "Stops do not veto gaps." },
  },
  "foundations-07": {
    lead: "Investing buys pieces of businesses. Trading rents short-term disagreement. Hedging pays to transfer a risk you already have. Using one word for all three is how accounts get confused.",
    blocks: [
      { t: "table", caption: "Different games", headers: ["Seat", "Horizon", "Main risk", "Typical product"], rows: [["Investor", "Years", "Being wrong on the business", "Delivery equity"], ["Trader", "Minutes to weeks", "Being wrong on the path", "Futures, options, cash"], ["Hedger", "Until the exposure ends", "Over/under-hedging", "Futures, options"]] },
      { t: "p", text: "You can sit in more than one seat if the books are separate. Mixing a long-term Reliance holding with an intraday Bank Nifty scalp in the same mental account is how people sell their compounders to fund a revenge trade." },
      { t: "callout", kind: "idea", title: "House rule", text: "Separate wallets: long-term demat, swing book, intraday F&O. If you cannot see the P&L apart, you will make one of them bail out the other." },
    ],
    takeaways: ["Name your seat before the order.", "Hedging is insurance, not a side bet dressed as insurance.", "Separate books, separate rules."],
    quiz: { q: "Buying index puts against a long cash portfolio is primarily:", options: ["Investing", "Lottery speculation if sized as 1 lot against ₹5 crore", "Hedging when the notional matches the exposure", "Always illegal"], answer: 2, why: "Hedge = matching exposure. Token 1-lot puts on a large book are theatre." },
  },
  "foundations-08": {
    lead: "A market map is a one-page statement of where you play, where you do not, and how you will know you are lost.",
    blocks: [
      { t: "h", text: "Write these eight lines" },
      { t: "ul", items: ["Universe — Nifty 50 cash? F&O stocks only? MCX gold?", "Seat — investor, swing trader, options spreader, hedger.", "Horizon — overnight allowed or not.", "Max risk per idea — in R or in percent of equity.", "Forbidden — weekly naked shorts, illiquid stock options, tips.", "Review cadence — daily journal, weekly stats, monthly equity curve.", "Kill switch — daily loss cap, weekly loss cap.", "Information diet — what you will not watch."] },
      { t: "callout", kind: "desk", title: "Field kit", text: "Download the risk-policy worksheet from Library → Worksheets. Fill it on paper. If you cannot fill it, you are not ready for F&O size." },
    ],
    takeaways: ["A map beats a mood.", "Forbidden lists save more money than clever entries.", "If it is not written, it is not a rule."],
    quiz: { q: "The point of a forbidden list is to:", options: ["Impress a mentor", "Remove known account-killers from the menu under stress", "Guarantee profits", "Satisfy SEBI"], answer: 1, why: "You write it in calm so you do not negotiate it in heat." },
  },

  "india-01": {
    lead: "Indian securities markets are not a free-for-all chat room. They are a licensed system: SEBI writes the rulebook, exchanges run the matching, depositories hold the assets, clearing corporations sit in the middle.",
    blocks: [
      { t: "ul", items: ["SEBI — regulator for securities markets.", "NSE / BSE — cash and derivatives exchanges you will actually use.", "MCX — the commodity venue for gold, silver, crude, gas, and more.", "NSDL / CDSL — depositories; your demat is here.", "NCL / ICCL — clearing: they become the buyer to every seller."] },
      { t: "p", text: "Because the clearing corporation novates trades, your credit risk is not 'the stranger on the other side'. It is the clearing ecosystem and your broker's ability to meet margins. That is a different risk, not zero risk." },
      { t: "callout", kind: "india", title: "Start here, not on Telegram", text: "SEBI's investor site and NSE Learn exist so you do not have to learn settlement from screenshots. Use them. This course assumes you will." },
    ],
    takeaways: ["Know the regulator, the venue, the depository, the clearer.", "Novation reduces bilateral default risk; it does not remove market risk.", "Licensed system ≠ guaranteed profit."],
    quiz: { q: "After you sell a share on NSE, the counterparty you ultimately face for settlement is primarily:", options: ["The retail trader who bought it", "Your cousin", "The clearing corporation via the novation chain", "SEBI itself"], answer: 2, why: "Novation is the point of a CCP." },
    sources: [SEBI, NSE],
  },
  "india-02": {
    lead: "You need three things that are easy to confuse: a PAN/KYC identity, a demat account that holds securities, and a trading account that talks to the exchange.",
    blocks: [
      { t: "p", text: "KYC is the identity layer (PAN, Aadhaar, in-person or digital verification). Demat (NSDL/CDSL via a depository participant) is the warehouse. The trading account (broker) is the door to the matching engine. You can have demat without trading, but you cannot take delivery cleanly without demat." },
      { t: "callout", kind: "caution", title: "Broker is not the depository", text: "If a broker fails, your demat holdings at the DP are not the broker's pocket money. Trading credits, unallocated funds, and MTF are a different story — treat idle cash as a credit decision." },
      { t: "p", text: "Nomination, two-factor login, and a separate device for confirmations are not paranoia. They are how adults hold financial assets." },
    ],
    takeaways: ["KYC identity, demat warehouse, trading door — three layers.", "Idle cash at a broker has credit risk.", "Turn on nomination and 2FA before you fund size."],
    quiz: { q: "Shares you bought in delivery sit in:", options: ["The broker's proprietary book as a default", "Your demat account at NSDL or CDSL", "SEBI's vault", "The NSE server"], answer: 1, why: "Demat is the record of ownership." },
  },
  "india-03": {
    lead: "India's cash equity market now settles on T+1: trade today, funds and securities move the next working day. That is fast. It is not instant, and it is not 24/7.",
    blocks: [
      { t: "table", caption: "A normal cash day (IST)", headers: ["Window", "What it is"], rows: [["~9:00–9:08", "Pre-open call auction / order entry"], ["9:15–15:30", "Continuous cash session"], ["15:40–16:00", "Post-close window (limited)"], ["Next working day", "T+1 settlement"]] },
      { t: "p", text: "F&O has its own settlement calendar: daily MTM for futures, expiry settlement for options, and special rules in expiry week. Do not assume cash hours equal derivatives hours for every product." },
      { t: "callout", kind: "idea", title: "Working days", text: "Muhurat sessions and holiday calendars are published. A 'tomorrow' in T+1 is a clearing working day, not a calendar overnight if Monday is a holiday." },
    ],
    takeaways: ["T+1 is next working day, not magic instant.", "Pre-open is a different mechanism from continuous trading.", "Derivatives settlement ≠ cash settlement."],
    quiz: { q: "T+1 means:", options: ["You can withdraw shares 1 hour after the trade", "Settlement completes on the next working day", "Options expire tomorrow", "You skip STT"], answer: 1, why: "T stands for trade date." },
  },
  "india-04": {
    lead: "An index is a rule for bundling stocks. Nifty 50 is not 'the economy'. It is a free-float market-cap recipe of 50 large names, maintained by NSE Indices with published methodology.",
    blocks: [
      { t: "p", text: "Sensex (BSE 30), Nifty 50, Nifty 500, Nifty Bank, Nifty Fin Service, sector indices — each has inclusion rules, caps, and rebalancing. Derivatives on Nifty and Bank Nifty are where a large share of India's options volume lives, which is why this platform's strategy desk starts there." },
      { t: "callout", kind: "india", title: "Free float", text: "Promoter-locked shares do not all count. Free-float methodology tries to weight what actually trades. That is why two companies with similar full market cap can have different index weights." },
      { t: "p", text: "You cannot 'buy the Nifty' as a share. You buy an ETF, a futures, an options overlay, or the basket. Know which one you hold — the tracking error is real." },
    ],
    takeaways: ["Index = published recipe, not a vibe.", "Free float and caps change weights.", "You need a product to express the index."],
    quiz: { q: "Nifty 50 weight is primarily driven by:", options: ["Equal weight of 50 names", "Full promoter holding including locked stock", "Free-float market capitalisation under the index rules", "Twitter mentions"], answer: 2, why: "It is a free-float cap-weighted index." },
  },
  "india-05": {
    lead: "Exchanges can slow a stock down when it is unhinged or when surveillance has questions. Circuits, ASM and GSM are not conspiracy. They are brakes.",
    blocks: [
      { t: "ul", items: ["Price bands / circuits — daily move limits (often 2/5/10/20% depending on the series).", "ASM — Additional Surveillance Measure: higher margins, sometimes longer settlement friction.", "GSM — Graded Surveillance Measure: for names with weaker fundamentals / governance flags.", "F&O ban — when market-wide position limits are breached on a stock derivative."] },
      { t: "callout", kind: "caution", title: "Do not 'buy the circuit'", text: "A stock hitting 20% upper circuit is not a certificate of quality. It is a certificate of one-sided order flow. Exits can be impossible until the band allows it." },
    ],
    takeaways: ["Brakes exist because retail FOMO is a known fire.", "Surveillance lists change the risk of the same ticker.", "Read why a name is in ASM/GSM before you treat it as a bargain."],
    quiz: { q: "An upper circuit print means:", options: ["Guaranteed further upside tomorrow", "You can always exit at that price", "The day's band is spent; liquidity on the other side may not exist", "SEBI has endorsed the company"], answer: 2, why: "A band is a halt on price, not a promise of a two-way market." },
  },
  "india-06": {
    lead: "Corporate actions change the thing you own. If you ignore them, your charts, your cost, and your F&O strikes will lie to you.",
    blocks: [
      { t: "table", caption: "Common actions", headers: ["Action", "What changes", "Watch"], rows: [["Dividend", "Cash leaves the company", "Ex-date gap on the chart is not 'weakness' by itself"], ["Bonus / split", "More shares, lower price", "Adjusted history; F&O strikes adjust"], ["Rights", "Option to buy more", "Value of the right vs letting it lapse"], ["Buyback", "Cash out, float down", "Tender math, not a tweet"], ["Amalgamation", "Your ISIN may change", "What you own after the swap"]] },
      { t: "p", text: "Unadjusted charts make old support look like science fiction. Always know whether your platform back-adjusts. Options after a split are not the same contract you memorised." },
    ],
    takeaways: ["Ex-date is an ownership cutoff, not a trading guru signal.", "Adjust charts and costs after splits/bonus.", "Read the exchange circular, not the WhatsApp forward."],
    quiz: { q: "A 1:1 bonus typically:", options: ["Doubles the company's cash", "Leaves economic ownership similar while halving the price and doubling count", "Is a 100% return the next day", "Cancels F&O forever"], answer: 1, why: "You own more shares representing the same pie." },
  },
  "india-07": {
    lead: "The fee stack is part of your edge. Ignore it and a 'high win-rate scalping system' is a donation to the exchange, the broker, and the government.",
    blocks: [
      { t: "ul", items: ["Brokerage — a business price, not a law of nature. Negotiate with eyes open on what you lose in support.", "STT — securities transaction tax, different for delivery vs intraday vs F&O.", "Exchange + clearing + SEBI turnover fees — small until you overtrade.", "GST on brokerage and services.", "DP charges on sell from demat.", "Stamp duty — state-linked, on buy side for equities."] },
      { t: "callout", kind: "desk", title: "Do the arithmetic", text: "If round-trip cost on a Nifty option is ₹15–25 per lot in fees plus spread, a strategy that 'wins ₹10 on average' is not a strategy." },
    ],
    takeaways: ["Costs are certain; edge is not.", "Delivery, intraday and F&O have different tax/fee DNA.", "Overtrading is a fee-maximisation scheme."],
    quiz: { q: "Which cost still hits you if brokerage is zero?", options: ["Nothing — zero brokerage means free", "STT, exchange fees, GST on remaining charges, spread", "Only DP charges", "Only stamp duty"], answer: 1, why: "Statutory and venue costs do not vanish with a marketing headline." },
  },
  "india-08": {
    lead: "Your app is a remote control. The matching engine is the market. Between them: risk checks, RMS, gateways, and co-located machines you will never outrun on a 4G phone.",
    blocks: [
      { t: "p", text: "A typical path: you tap buy → broker RMS checks funds and margins → order gateway → exchange matching engine → trade confirmation → drop copy to clearing. Rejects can come from you (insufficient margin), the broker (RMS), or the exchange (price bands, frozen series, lot size)." },
      { t: "diagram", name: "order-book" },
      { t: "callout", kind: "idea", title: "Latency honesty", text: "You are not a high-frequency desk. Do not build a personality around beating algos at 9:15. Build around process that still works at human speed." },
    ],
    takeaways: ["Know why an order rejects before you hammer retry.", "RMS is not the enemy; it is often the only adult in the room.", "Human-speed edges are about selection and risk, not milliseconds."],
    quiz: { q: "An order rejected for 'price outside band' means:", options: ["Your Wi-Fi failed", "The exchange will not accept that limit given today's circuit", "SEBI banned you", "The stock is delisted"], answer: 1, why: "Bands are exchange constraints." },
  },

  "equity-01": {
    lead: "A share is a residual claim on a company's net assets and future cash, after everyone else is paid. It is not a lottery ticket with a logo, and it is not a bond.",
    blocks: [
      { t: "p", text: "Equity gets what is left. That residual can compound for decades or go to zero. Limited liability means your loss as a shareholder is the amount you invested — the company cannot send you a bill for its debts (unless you did something else, like a personal guarantee, which is not 'being a shareholder')." },
      { t: "ul", items: ["Voting rights differ across ordinary vs some special classes.", "Promoter shares are the same economic pie, different control.", "Preference shares are a different contract — do not mix the words."] },
      { t: "callout", kind: "idea", title: "Owner mindset", text: "If you cannot explain in two sentences how the company makes money, you are not an investor yet. You are a quote-watcher." },
    ],
    takeaways: ["Residual claim + limited liability is the deal.", "Zero is a possible equity outcome.", "Control and economics can diverge."],
    quiz: { q: "As an ordinary shareholder, your claim on cash comes:", options: ["Before banks and employees", "Pari passu with GST", "After debt and other prior claims", "From SEBI"], answer: 2, why: "Equity is residual." },
  },
  "equity-02": {
    lead: "A quote is a dashboard. Learn every tile before you invent stories.",
    blocks: [
      { t: "ul", items: ["LTP — last print.", "Bid / ask / size — the live book.", "Open, high, low, close — the session's skeleton.", "Volume vs 20-day average — is today unusual?", "VWAP — where the average traded rupee occurred.", "52-week range — context, not a magnet.", "Lot size / freeze quantity — relevant if the name is in F&O."] },
      { t: "callout", kind: "india", title: "Series", text: "EQ is rolling settlement. BE / other series can mean trade-for-trade. If you do not know the series, you do not know how you exit." },
    ],
    takeaways: ["Read the book, not just the sparkline.", "VWAP is a participation benchmark, not a holy number.", "Series and lot size are part of the quote."],
    quiz: { q: "VWAP is closest to:", options: ["The CEO's target price", "Volume-weighted average price of prints in the session", "The 200-day moving average", "Book value"], answer: 1, why: "It is a traded-rupee average." },
  },
  "equity-03": {
    lead: "Market cap is price times shares. Free float is what can actually trade. Liquidity is whether you can move size without moving the world.",
    blocks: [
      { t: "formula", expr: "Market cap = Price × Shares outstanding", meaning: "Use diluted shares when warrants and ESOPs are material. Full cap ≠ tradable cap." },
      { t: "p", text: "A ₹40,000 crore company with 8% free float is a different trading animal from a ₹40,000 crore company with 60% free float. Impact cost is how you measure this: what you actually pay versus mid when you send a size." },
      { t: "callout", kind: "caution", title: "Small-cap theatre", text: "You have not beaten the market because a ₹400 crore name rallied 8% on ₹2 crore of volume while you hold 15% of that volume. You may be the market." },
    ],
    takeaways: ["Full market cap can flatter illiquid names.", "Impact cost is the honest liquidity metric.", "If you are the volume, you do not have an exit."],
    quiz: { q: "Free float market cap tries to measure:", options: ["Promoter wealth including pledged shares only", "The value of shares that can actually trade under index rules", "Face value times 100", "Debt plus equity"], answer: 1, why: "Float is the tradable pie." },
  },
  "equity-04": {
    lead: "Corporate actions are not free money. They re-slice the same pizza — except dividends, which actually leave the fridge.",
    blocks: [
      { t: "p", text: "Dividends transfer cash from the company to you and the stock usually gaps down by about the dividend on ex-date (tax and sentiment complicate the exact gap). Bonus and splits increase count and reduce price. Rights are an option: sometimes worth exercising, sometimes worth selling, sometimes worth ignoring." },
      { t: "callout", kind: "idea", title: "Total return", text: "Always compute total return with dividends reinvested or at least added. Quote-only charts lie about dividend payers." },
    ],
    takeaways: ["Dividends are cash; bonus/split are recapitalisations of the same value.", "Rights have option value — do the arithmetic.", "Adjust your records on ex-date."],
    quiz: { q: "On ex-dividend date, all else equal, the stock typically:", options: ["Must gap up by the dividend", "Often gaps down by roughly the dividend", "Becomes F&O banned", "Splits automatically"], answer: 1, why: "Cash has left the firm." },
  },
  "equity-05": {
    lead: "A sector is a rhyme, not a reason. Banks, IT, pharma, auto, metals, consumer — they live on different cycles, rates, and currencies.",
    blocks: [
      { t: "p", text: "Rate-sensitive names care about RBI. Exporters care about USDINR and US demand. Metal names care about China and the dollar. Consumer staples care about volume and crude as an input. If your 'diversified' portfolio is six midcap lenders, you own one bet." },
      { t: "callout", kind: "desk", title: "Map the driver", text: "Before you add a stock, write the one or two macro drivers that would ruin the year. If you cannot, you do not understand the business well enough to size it." },
    ],
    takeaways: ["Sector labels hide concentrated bets.", "Name the ruin driver.", "Diversification is about independent causes, not ticker count."],
    quiz: { q: "Six private banks in one folio is best described as:", options: ["Fully diversified", "A concentrated rates-and-credit bet", "A commodity hedge", "A risk-free income plan"], answer: 1, why: "Same driver, many tickers." },
  },
  "equity-06": {
    lead: "An IPO is a sale. The seller has a reason. Sometimes that reason is growth capital. Sometimes it is an exit. Read which.",
    blocks: [
      { t: "p", text: "Use the red herring prospectus, not the influencer thread. Look at: use of proceeds, offer for sale vs fresh issue, peer multiples, restated financials, related-party transactions, and who the BRLMs are. Grey market premiums are gossip with a price tag — not a valuation method." },
      { t: "callout", kind: "india", title: "This platform", text: "ABC's IPO desk is built on NSE's published issue info and bid book. If a number is not there, we do not invent it from a DRHP scrape. That is the standard you should demand everywhere." },
      { t: "callout", kind: "caution", title: "Listing gains as a personality", text: "Flipping every IPO is a job with costs, allocation luck, and regime risk. It is not a substitute for learning businesses." },
    ],
    takeaways: ["RHP over rumours.", "OFS vs fresh issue tells you who is cashing out.", "GMP is not a research process."],
    quiz: { q: "An offer for sale (OFS) in an IPO primarily:", options: ["Always funds a new factory", "Lets existing holders sell shares into the IPO", "Eliminates STT", "Guarantees listing gains"], answer: 1, why: "OFS is a transfer of existing shares." },
  },
  "equity-07": {
    lead: "A watchlist is a workbench. If it has 200 names, it is a graveyard. If it has 8 names you cannot explain, it is a mood board.",
    blocks: [
      { t: "ul", items: ["Capacity: 15–30 names you can actually maintain.", "Entry rule: why it is here (setup, not hope).", "Invalidation: what takes it off.", "Review: weekly prune.", "No tips. If it came from a forward, it starts at the back of the queue with extra suspicion."] },
      { t: "callout", kind: "desk", title: "Worksheet", text: "Columns that earn their keep: ticker, thesis in 12 words, ruin driver, liquidity, next earnings, last review date." },
    ],
    takeaways: ["Finite lists create thought.", "Every name needs an off-ramp.", "Tips are backlog, not research."],
    quiz: { q: "The healthiest reason to delete a name from a watchlist is:", options: ["It went down", "Your invalidation triggered or you no longer understand it", "A TV guest was bullish", "It is not in Nifty"], answer: 1, why: "Process removes names; mood does not." },
  },
  "equity-08": {
    lead: "Not buying is a position. It is usually the one underused by people who confuse activity with progress.",
    blocks: [
      { t: "p", text: "Stand aside when: you do not understand the business; liquidity is theatre; you are angry; you have already used this week's risk; the only thesis is 'it is up'; an IPO brochure is doing the thinking; you would not be able to explain the trade to a serious friend in two minutes." },
      { t: "callout", kind: "idea", title: "Cash is a position", text: "Cash is the option to buy later at prices you like. Spending it to avoid feeling left out is paying a FOMO premium." },
    ],
    takeaways: ["Inaction can be the trade.", "Anger and FOMO are not theses.", "Cash is dry powder, not a character flaw."],
    quiz: { q: "You have used your weekly loss cap by Wednesday. Thursday's 'perfect setup' should be:", options: ["Doubled", "Taken with options leverage to recover", "Skipped", "Taken in the spouse's account"], answer: 2, why: "A kill switch that you negotiate is not a kill switch." },
  },

  "fundamentals-01": {
    lead: "The P&L is a movie. The cash-flow statement is whether the ticket sales were real. The balance sheet is the set. Watch all three.",
    blocks: [
      { t: "diagram", name: "statements" },
      { t: "p", text: "Profit can be a story about accruals. Cash from operations is harder to invent for long. The balance sheet shows whether growth is funded by healthy equity, cheap long debt, or stretching payables like a person living on credit cards." },
      { t: "callout", kind: "india", title: "Where to read them", text: "Annual reports, quarterly results, and filings on the exchange. Start with the consolidated numbers, then see if standalone is a different animal (common in holding structures)." },
    ],
    takeaways: ["Three statements, one economic body.", "Cash from operations is the lie detector.", "Consolidated vs standalone can change the story."],
    quiz: { q: "A company with rising profit but persistently negative operating cash flow needs:", options: ["No further questions", "A closer look at accruals and working capital", "Immediate bankruptcy", "A stock split"], answer: 1, why: "Earnings quality lives in the cash conversion." },
  },
  "fundamentals-02": {
    lead: "Revenue is not a high-five. Ask whether it repeats, whether it collects, and what it costs to produce.",
    blocks: [
      { t: "formula", expr: "Gross margin = (Revenue − COGS) / Revenue", meaning: "Before overhead. Compare to peers and to the company's own past — not to a random FMCG name." },
      { t: "p", text: "Working capital is where growing companies hide pain: receivables up, inventory up, payables stretched. A firm that 'grows' by filling dealer godowns is borrowing demand from next year." },
      { t: "callout", kind: "caution", title: "One-time sweets", text: "Other income, revaluation gains, and accounting changes can dress up a year. Strip them before you celebrate." },
    ],
    takeaways: ["Repeatability beats a record quarter.", "Watch working capital while you watch sales.", "Other income is often not the business."],
    quiz: { q: "Dealer-dumping inventory into the channel typically shows up as:", options: ["Higher cash and lower receivables", "Rising sales with rising receivables/inventory and later a hangover", "Immediate buyback", "Lower reported revenue"], answer: 1, why: "Channel stuffing is a timing trick." },
  },
  "fundamentals-03": {
    lead: "Assets are claims on the future. Liabilities are promises. If the promises are due before the claims pay, you own a stressed creature — even if the logo is famous.",
    blocks: [
      { t: "ul", items: ["Net debt vs EBITDA — leverage in years of cash engine.", "Interest coverage — can EBIT pay the coupon without prayer.", "Promoter pledge — their lender has a vote on your equity.", "Contingent liabilities — footnotes that bite.", "Goodwill — the acquisition premium that can evaporate."] },
      { t: "callout", kind: "caution", title: "Pledge", text: "High promoter pledge in a falling market is how you get surprise supply. Treat it as a structural overhang, not a footnote trivia." },
    ],
    takeaways: ["Leverage shortens the time you can be wrong.", "Pledge is your problem too.", "Read footnotes or do not pretend you read the report."],
    quiz: { q: "Promoter pledging a large fraction of their holding mainly increases:", options: ["Brand value", "The chance of forced selling into weakness", "Statutory reserves", "Your voting rights"], answer: 1, why: "Lenders liquidate collateral." },
  },
  "fundamentals-04": {
    lead: "Ratios are compression. They are useful when you know what was compressed away.",
    blocks: [
      { t: "table", caption: "A small honest toolkit", headers: ["Ratio", "Asks", "Trap"], rows: [["ROE", "Return on equity capital", "Leverage can fake a high ROE"], ["ROCE", "Return on capital employed", "Still depends on accounting EBIT"], ["P/E", "Price per unit of earnings", "Earnings can be peak or fake"], ["EV/EBITDA", "Firm value vs operating engine", "Capex-hungry businesses look cheaper than they are"], ["P/B", "Price vs book", "Book can be stale or inflated"]] },
      { t: "p", text: "Always pair a return ratio with a leverage ratio and a cash conversion check. One number screens. A set of numbers analyses." },
    ],
    takeaways: ["Ratios are questions, not answers.", "High ROE with high leverage is a different animal.", "Never use P/E alone on cyclical peak earnings."],
    quiz: { q: "A cyclical metal name at 8× peak-year earnings is probably:", options: ["Statistically the cheapest stock in India", "Maybe expensive if mid-cycle earnings are much lower", "Risk-free", "A bond substitute"], answer: 1, why: "P/E on the peak lies." },
  },
  "fundamentals-05": {
    lead: "A multiple is a shortcut for a discounted cash-flow story. If you cannot say the story, you are just shopping by P/E rank.",
    blocks: [
      { t: "formula", expr: "Value ≈ Σ CFt / (1 + r)ᵗ", meaning: "Cash to owners, discounted at a rate that includes risk. Garbage in, gospel out — so be modest." },
      { t: "p", text: "Reverse-DCF is often more honest: given the price, what growth is the market implying? Then ask if that growth is plausible. Paying 50× for a business that must grow 25% for a decade is a fragile story." },
      { t: "callout", kind: "idea", title: "Margin of safety", text: "Graham's idea was not 'buy cheap junk'. It was 'demand a gap between price and a conservative appraisal so that being a bit wrong does not kill you'." },
    ],
    takeaways: ["Multiples hide a DCF.", "Ask what growth is implied.", "Margin of safety is about model error, not a 52-week low."],
    quiz: { q: "Reverse DCF starts from:", options: ["Face value", "The current price and backs out implied growth/returns", "Promoter salary", "52-week high"], answer: 1, why: "Price is the output of someone else's model; invert it." },
  },
  "fundamentals-06": {
    lead: "A moat is why a competitor cannot painlessly steal the return. Capital allocation is what management does with the cash that moat throws off.",
    blocks: [
      { t: "ul", items: ["Cost advantage, switching costs, network effects, brands with pricing power, licences.", "Reinvest in the business, pay down debt, dividends, buybacks, acquisitions — each can be wise or vain.", "Watch ROCE persistence, not a single year of fat margin."] },
      { t: "p", text: "Buybacks at silly prices transfer wealth to exiting holders. Acquisitions at silly prices transfer wealth to the target's shareholders. Both can still be marketed as 'shareholder friendly'." },
    ],
    takeaways: ["Moat = durable advantage, not a story.", "Capital allocation is a skill you can observe over a cycle.", "Buybacks are not automatically bullish."],
    quiz: { q: "A company buying back stock at 3× a conservative intrinsic value is:", options: ["Always excellent capital allocation", "Likely shrinking value per remaining share", "A SEBI requirement", "The same as a dividend"], answer: 1, why: "Overpaying for your own stock destroys value." },
  },
  "fundamentals-07": {
    lead: "Fraud is rare. Stretching is common. You do not need to be a forensic accountant to notice when the story and the cash disagree.",
    blocks: [
      { t: "ul", items: ["Receivables growing much faster than sales.", "Frequent auditor changes or qualifications.", "Related-party revenue that is the business.", "Promoter pledge + growing debt + shrinking cash.", "Inventory that never turns.", "Capitalised expenses that peers expense."] },
      { t: "callout", kind: "caution", title: "You will be late", text: "By the time a famous short report is on Twitter, the easy money may be gone and the remaining tape is violent. The skill is passing on names that feel clever but smell wrong — early." },
    ],
    takeaways: ["Cash conversion is the first forensic filter.", "Related parties and auditor noise are not trivia.", "Passing is a valid research outcome."],
    quiz: { q: "The most useful early warning among these is usually:", options: ["A stylish annual-report cover", "Operating cash lagging reported profit for several years", "A high Google Trends score", "A split"], answer: 1, why: "Accruals leave tracks in cash." },
  },
  "fundamentals-08": {
    lead: "You do not read an annual report like a novel. You raid it with a list.",
    blocks: [
      { t: "ul", items: ["60 min — MD&A, segment results, related parties, auditor report.", "20 min — cash flow, debt schedule, pledges.", "10 min — promoter holding change, share count, ESOP.", "Write 10 lines: what they sell, unit economics, capital need, capital allocation, three risks."] },
      { t: "callout", kind: "desk", title: "Output", text: "If you cannot write those 10 lines without looking, you browsed. You did not read." },
    ],
    takeaways: ["Raid with a checklist.", "MD&A and footnotes beat the glossy photos.", "A 10-line memo is the deliverable."],
    quiz: { q: "The annual-report section most likely to confess problems in plain language is:", options: ["The cover", "Auditor qualifications and related-party notes", "The stock-photo of a handshake", "The font choice"], answer: 1, why: "Notes and qualifications are where issues live." },
  },
});

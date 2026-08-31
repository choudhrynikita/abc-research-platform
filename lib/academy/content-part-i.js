const { expandLesson } = require("./expand");

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "technicals-13": {
    lead: "ATR is the average true range: how much the instrument typically moves, including gaps. It is a tape-measure for stops and size — not a buy signal.",
    covers: ["True range includes gaps.", "ATR is volatility, not direction.", "Stops and size should speak ATR, not round numbers."],
    blocks: [
      { t: "formula", expr: "TR = max(H−L, |H−prevClose|, |L−prevClose|)", meaning: "True range captures the gap. ATR is usually a 14-period average of TR (Wilder)." },
      { t: "diagram", name: "atr-stop" },
      { t: "p", text: "A ₹8 stop on a stock whose ATR is ₹22 is noise. A 3-ATR chandelier stop trails from the high. Nifty with ATR 180 and a 20-point futures stop is a coin flip, not a plan." },
      { t: "example", title: "Size from ATR", body: "Account ₹5,00,000, 1R = ₹2,500. Long a stock at 1,410, ATR 28, stop 1.5×ATR → 1,368. Risk ₹42/share. Size = 2,500/42 ≈ 59 shares. The indicator did not pick the stock. It priced the risk." },
    ],
    takeaways: ["ATR measures typical travel.", "Stops in ATR units survive different names.", "ATR does not know your thesis."],
    quiz: { q: "ATR going from 120 to 220 on Nifty means:", options: ["A guaranteed rally", "Typical session travel has expanded — size and stops should widen", "FIIs bought", "RSI is wrong"], answer: 1, why: "ATR is a volatility ruler." },
  },
  "technicals-14": {
    lead: "Bollinger Bands park a moving average inside a volatility envelope (usually 20 SMA ± 2σ). Keltner uses ATR instead of standard deviation. A squeeze is compressed volatility — not a direction.",
    covers: ["Bands are a volatility envelope.", "Walking the band is trend, not a short.", "Squeezes precede moves; they do not name the side."],
    blocks: [
      { t: "diagram", name: "bollinger" },
      { t: "p", text: "Price hugging the upper band in a trend is 'walking the band'. Fading it because 'it touched 2σ' is how people short a melt-up. A squeeze (bands or BB vs Keltner) says the rubber band is tight. Your job is to wait for the break and the failed break — not to guess the colour." },
      { t: "callout", kind: "caution", title: "%B and bandwidth", text: "%B near 1 means price is at the upper band. Bandwidth falling means compression. Neither is a market order." },
    ],
    takeaways: ["Envelope ≠ overbought law.", "Squeeze = 'a move is cheaper to start', not 'up'.", "Keltner and Bollinger disagree on quiet versus wild bars — that disagreement is useful."],
    quiz: { q: "Nifty closes outside the upper Bollinger Band for a fifth day. The honest read is:", options: ["Must crash tomorrow", "Trend is strong enough to walk the band — fading needs a separate rule", "IV is zero", "A DCF just flipped"], answer: 1, why: "Bands describe stretch. Trend can keep stretching." },
  },
  "technicals-15": {
    lead: "Channel systems — Donchian, Supertrend, Parabolic SAR — are breakout or trailing machines. They win in trends and donate in ranges. Know which market you are in before you turn them on.",
    covers: ["Donchian: N-day high/low break.", "Supertrend: ATR-offset trail popular on Indian charts.", "SAR: accelerating stop that flips you."],
    blocks: [
      { t: "diagram", name: "supertrend" },
      { t: "p", text: "A 20-day Donchian long is: buy a new 20-day high, stop under the 20-day low (Turtle-style). Supertrend (common 10, 3) flips when price closes through an ATR-offset line. Both will whip you to death in a Nifty range between 23,900 and 24,200. That is not a bug in the formula. It is the formula doing range things." },
      { t: "callout", kind: "india", title: "Supertrend religion", text: "Supertrend is everywhere on Indian YouTube because it is a single line. A single line in a range is a fee-generator. Pair it with ADX or a higher-timeframe bias, or do not use it." },
    ],
    takeaways: ["Channel systems need a trend filter.", "The flip is the cost of being systematic.", "Supertrend is ATR in a trench coat."],
    quiz: { q: "Supertrend flips six times in four range days. That usually means:", options: ["A holy grail", "You are using a trend tool in a range", "SEBI changed lot size", "VWAP is broken"], answer: 1, why: "Whipsaws are the range tax." },
  },
  "technicals-16": {
    lead: "ADX (Average Directional Index) asks how organised the trend is, not whether it is up or down. +DI and −DI name the side. ADX rising from 15 to 30 is 'a trend is forming'. ADX at 55 is 'the trend is old and violent'.",
    covers: ["ADX is trend strength, unsigned.", "+DI / −DI give direction.", "Low ADX: oscillators; high ADX: trend tools."],
    blocks: [
      { t: "p", text: "A practical split used on many desks: ADX < 20 → mean-revert tools (RSI, bands) get a hearing. ADX > 25 and rising → Supertrend, Donchian, moving-average pullbacks get a hearing. Using RSI 70 shorts while ADX is 40 and +DI leads is fading a trend with an oscillator. That is a choice — name it." },
      { t: "table", caption: "Filter, not a trigger", headers: ["ADX", "Usually means", "Prefer"], rows: [
        ["< 18", "Range / noise", "Oscillators, VWAP mean revert"],
        ["20–30 rising", "Trend waking", "Pullbacks in the +DI/−DI direction"],
        ["> 40", "Mature trend", "Trails, not new FOMO adds"],
      ] },
    ],
    takeaways: ["ADX is a regime filter.", "Pair it with a directional DI.", "High ADX + oscillator fade is often expensive."],
    quiz: { q: "ADX at 16 with RSI 72 is most compatible with:", options: ["A trend-following add", "A range: RSI can actually mean-revert here", "A guaranteed breakout", "A DCF"], answer: 1, why: "Low ADX is oscillator country." },
  },
  "technicals-17": {
    lead: "Stochastic, CCI, Williams %R, Momentum, ROC — they are cousins. They ask how far price sits in its recent range or from a typical price. If you plot four of them you do not have four opinions. You have one opinion in four fonts.",
    covers: ["Stochastic: close inside the high–low range.", "CCI: distance from a typical price.", "Do not stack siblings and call it confluence."],
    blocks: [
      { t: "formula", expr: "%K = (Close − Lₙ) / (Hₙ − Lₙ) × 100", meaning: "Stochastic. Williams %R is the same idea, flipped and scaled. CCI uses mean deviation from typical price (H+L+C)/3." },
      { t: "p", text: "Stochastic 80 in a range is a fade candidate. Stochastic 80 in a trend is a 'still strong' print. CCI ±100 is a conventional stretch mark, not a law. Momentum/ROC are just price change over n bars — useful as a slope, useless as a crystal ball." },
      { t: "callout", kind: "caution", title: "Confluence theatre", text: "RSI + Stochastic + CCI all 'overbought' is one fact. Adding MACD on the same close does not make four facts. If they all use the last 14 bars of the same Nifty, they are family." },
    ],
    takeaways: ["Oscillators share DNA.", "Regime first, then the oscillator.", "Confluence of siblings is not confirmation."],
    quiz: { q: "RSI and Stochastic both overbought on the same 14-bar Nifty window mostly means:", options: ["Two independent systems agree", "The same recent strength, twice", "A short is mandatory", "Max pain moved"], answer: 1, why: "They read the same window." },
  },
  "technicals-18": {
    lead: "Ichimoku is a full dashboard: equilibrium lines, a cloud (Kumo), and a lagging span. It looks mystical. It is moving averages and displaced spans. Read it as structure, not as a Japanese oracle.",
    covers: ["Tenkan, Kijun, cloud, Chikou.", "Price above a rising cloud is a trend state.", "Cloud twists are regime changes, not magic."],
    blocks: [
      { t: "diagram", name: "ichimoku" },
      { t: "ul", items: ["Tenkan (conversion) — short equilibrium, often 9.", "Kijun (base) — slower equilibrium, often 26.", "Senkou spans — displaced forward to draw the cloud.", "Chikou — close displaced back; a reality check versus old price."] },
      { t: "p", text: "Classic long state: price above the cloud, Tenkan above Kijun, Chikou above price of 26 bars ago, cloud ahead rising and green. That is a lot of 'the market has been going up'. It still needs a stop under the Kijun or cloud and a size. Do not wait for every span to agree after a 12% rally." },
    ],
    takeaways: ["Ichimoku is displaced averages.", "Cloud = zone of equilibrium, not a force field.", "A full-stack Ichimoku signal is often late — that is the cost of confirmation."],
    quiz: { q: "The Ichimoku cloud is best treated as:", options: ["SEBI's fair-value band", "A displaced equilibrium zone — support/resistance hypothesis", "A DCF", "A put wall"], answer: 1, why: "It is a mapped average, projected forward." },
  },
  "technicals-19": {
    lead: "Fibonacci ratios, floor pivots and measured moves are geometry people lay on a swing. Sometimes the crowd parks orders there, so the lines 'work' as liquidity. They are not laws of physics.",
    covers: ["Fib retracement is a swing divided by ratios.", "Pivots are yesterday's H/L/C algebra.", "A measured move is a copy-paste of the last leg."],
    blocks: [
      { t: "p", text: "A Nifty swing 23,600 → 24,200. 50% is 23,900, 61.8% is ~23,829. If you already have a structure low there, the Fib is a label. If you buy 61.8% in empty space with no invalidation, you bought a ratio. Floor pivots (P = (H+L+C)/3, R1/S1 from there) are a day-trader map of where the crowd might lean. Treat them as a calendar of possible reactions, not as magnets." },
      { t: "callout", kind: "idea", title: "Confluence that is allowed", text: "Fib 50% + prior weekly high + VWAP + option put wall is four different cameras. Fib 50% + Fib 61.8% + Fib 38.2% is one camera shouting." },
    ],
    takeaways: ["Geometry is a map of possible liquidity.", "Crowd lines can be self-fulfilling until they are not.", "Invalidation still required."],
    quiz: { q: "A 61.8% retracement with no structure, no volume and no stop is:", options: ["A professional entry", "A ratio looking for a reason", "Max pain", "ADX"], answer: 1, why: "A ratio is not a trade." },
  },
  "technicals-20": {
    lead: "Volume indicators try to say whether the move had participation. OBV accumulates signed volume. MFI is RSI with volume. CMF and A/D ask if the close was in the high or low of the bar, weighted by volume. None of them see delivery versus speculative volume unless you use the Indian delivery tape separately.",
    covers: ["OBV / A/D: cumulative participation.", "MFI: RSI with volume.", "India: delivery % is a different camera from tick volume."],
    blocks: [
      { t: "p", text: "Price up, OBV flat: the rally may be thin. Price down, MFI not making a new low: less urgent selling. On NSE cash, 'volume' on a 1-minute chart is not the same as delivery volume published for the session. A stock up 6% with 8% delivery is a different animal from 6% with 55% delivery. Use the exchange delivery file when the question is 'did owners transact?'." },
      { t: "callout", kind: "india", title: "Delivery %", text: "NSE reports delivery quantity for cash. F&O volume is not delivery. Do not read a Nifty options volume spike as 'investors accumulated'." },
    ],
    takeaways: ["Volume tools measure participation, not value.", "Delivery % is India-specific and useful.", "Options volume ≠ cash ownership."],
    quiz: { q: "A cash stock rallies on high F&O volume but 7% delivery. The honest note is:", options: ["Strong accumulation by long-term owners", "The move may be speculative/derivative-led — delivery is weak", "VWAP is illegal", "ADX cannot be computed"], answer: 1, why: "Delivery is the ownership camera." },
  },
  "technicals-21": {
    lead: "Divergence is when price and an indicator disagree. It is a warning that thrust is changing, not a market order. Regular bearish divergence can persist for weeks in a melt-up. Failure swings (RSI breaking its own swing) are slightly more operational — and still not a crystal ball.",
    covers: ["Regular vs hidden divergence.", "Failure swings as a trigger candidate.", "How indicators lie: lag, regime, and parameter peeking."],
    blocks: [
      { t: "ul", items: ["Regular bearish: price higher high, RSI lower high — cooling upside thrust.", "Regular bullish: price lower low, RSI higher low — cooling downside thrust.", "Hidden: trend-continuation flavour; easy to overfit.", "Failure swing: oscillator breaks its own swing, then a price trigger."] },
      { t: "p", text: "The lie: you will remember the divergences that preceded crashes and forget the ten that did nothing. Log them. Another lie: changing RSI from 14 to 11 after the fact to 'make the divergence print'. If the parameter is chosen after the chart, it is a caption." },
    ],
    takeaways: ["Divergence is a risk note.", "Log base rates.", "Do not retune the oscillator to fit the story."],
    quiz: { q: "Price makes three higher highs while RSI makes three lower highs for two weeks. You should:", options: ["Short the entire account", "Treat it as cooling thrust — tighten risk or wait for a price trigger", "Ignore all risk", "Assume max pain"], answer: 1, why: "Divergence can persist. Price still runs the P&L." },
  },
  "technicals-22": {
    lead: "An indicator stack should have one job per pane: regime, location, participation, trigger. If four panes all say 'momentum', you built a choir, not a process.",
    covers: ["One job per indicator.", "A sample Nifty stack.", "When to use none."],
    blocks: [
      { t: "table", caption: "A stack that does not fight itself", headers: ["Job", "Pick one", "Do not also"], rows: [
        ["Regime", "ADX or Ichimoku cloud or HTF MA", "Four oscillators"],
        ["Location", "VWAP / prior day high-low / cloud", "A second VWAP"],
        ["Volatility", "ATR or Bollinger bandwidth", "ATR and Supertrend and Keltner as three votes"],
        ["Trigger", "Donchian break or RSI failure swing or Supertrend flip", "All three at once as 'confluence'"],
      ] },
      { t: "example", title: "One Nifty page", body: "Daily: 20/50 EMA + ADX(14). Session: VWAP and opening range. Volatility: ATR(14) for stops. Trigger: only if ADX>20, a pullback to VWAP that holds, stop 1.2×ATR. No Stochastic on top. That is a stack. RSI+MACD+Stoch+CCI+Supertrend+Ichimoku on one 3-minute chart is a screensaver." },
      { t: "callout", kind: "desk", title: "Permission to use zero", text: "On event days (Budget, RBI, results), many desks hide indicators and trade levels plus defined-risk options. An indicator is optional. A stop is not." },
    ],
    takeaways: ["Assign jobs, not decorations.", "Siblings are not confirmation.", "Event days can mean no indicators."],
    quiz: { q: "The main reason to drop an indicator from the stack is:", options: ["It is not colourful", "It repeats a job another pane already does", "YouTube used it", "SEBI banned it"], answer: 1, why: "Duplicate jobs are theatre." },
  },

  "fundamentals-13": {
    lead: "DuPont splits ROE into margin, turnover and leverage. When ROE jumps, DuPont tells you whether the business got better — or just more borrowed.",
    covers: ["ROE = margin × turnover × leverage.", "A leverage-driven ROE is a different animal.", "Track the three pieces over five years."],
    blocks: [
      { t: "formula", expr: "ROE ≈ (PAT/Sales) × (Sales/Assets) × (Assets/Equity)", meaning: "Net margin × asset turnover × equity multiplier. Banks need a different split (NIM, leverage, NPA). Do not DuPont a lender like an FMCG." },
      { t: "p", text: "If ROE went from 12% to 18% because the multiplier rose from 1.8× to 2.7× while margins fell, you do not own a better company. You own a more levered one. If turnover rose because the firm is sweating plants, that can be real." },
    ],
    takeaways: ["Split ROE before you celebrate it.", "Leverage is not operating excellence.", "Use a bank-specific lens for banks."],
    quiz: { q: "ROE up, margins down, leverage up most likely means:", options: ["A wonderful moat just appeared", "The ROE is being juiced by debt, not by a better core", "Cash conversion improved for sure", "A bonus issue"], answer: 1, why: "DuPont isolates the source." },
  },
  "fundamentals-14": {
    lead: "Profit is an opinion with rules. Free cash flow is what is left after the business reinvested to stay alive. Owners eat cash, not EBITDA slides.",
    covers: ["FCF = cash from operations minus sustaining capex.", "PAT can outrun cash via working capital and capex.", "Owner earnings versus reported EPS."],
    blocks: [
      { t: "formula", expr: "FCF ≈ CFO − capex  (then argue what 'maintenance' vs growth capex is)", meaning: "CFO is on the cash-flow statement. Capex is investing. The argument is always: how much capex is optional." },
      { t: "p", text: "A company printing 18% EPS growth with CFO flat and capex rising is issuing IOUs to the future. A company with ugly EPS and rising FCF after a heavy investment cycle may be turning the corner. Read both statements. Then read the capex footnote." },
      { t: "callout", kind: "caution", title: "EBITDA worship", text: "EBITDA ignores capex and working capital. For a telecom or a metal plant, that is close to ignoring the business." },
    ],
    takeaways: ["Cash is the adult metric.", "Name maintenance capex.", "EBITDA is not free cash."],
    quiz: { q: "EPS up 25%, CFO down 10%, capex up sharply. You should:", options: ["Celebrate a compounder", "Ask whether earnings are becoming receivables and iron", "Ignore the cash flow", "Buy because RSI is 70"], answer: 1, why: "Cash and capex are the plot." },
  },
  "fundamentals-15": {
    lead: "The quarterly result is a three-hour exam: numbers, quality, and the concall. Most of the tape reaction is the surprise versus consensus, not the absolute number. Read the exchange filing, then the transcript, then the chart — in that order.",
    covers: ["Reported vs adjusted vs consensus.", "What to listen for on the concall.", "Guidance, order book, commentary tone."],
    blocks: [
      { t: "steps", items: [
        "Exchange filing first (not a news ticker rewrite).",
        "Revenue, EBITDA, PAT versus last year and versus last quarter — seasonality matters.",
        "One-offs: tax, other income, forex, land sale.",
        "Working capital and CFO if the quarter is in the cash-flow statement.",
        "Concall: volume vs price, competitive intensity, capex, hiring, commentary on the next two quarters.",
        "Only then: did the market already price this in the last 10 sessions?",
      ] },
      { t: "example", title: "IT services quarter", body: "Revenue +1% QoQ, margin −80 bps, deal TCV up, commentary '2H weighted'. The print is soft; the story is back-ended. If you only read 'beats Street by 1%', you missed the margin and the timing. The stock can still rally on TCV. Your note should still contain the margin." },
      { t: "callout", kind: "india", title: "Where", text: "NSE/BSE filings, company IR PDFs, and recorded concalls. Twitter recaps are a tertiary source." },
    ],
    takeaways: ["Filing before feed.", "Separate print, quality, and guidance.", "Consensus surprise moves the tape — still write the quality."],
    quiz: { q: "The first document to open on result day is:", options: ["A Telegram recap", "The exchange filing / result PDF", "The 1-minute chart", "A GEX overlay"], answer: 1, why: "Primary source first." },
  },
  "fundamentals-16": {
    lead: "Earnings quality asks whether the profit would still be there if accounting choices were boring. Accruals, other income, capitalised costs and channel stuffing are the usual Indian plot twists.",
    covers: ["Accruals: profit minus cash.", "Other income as a habit.", "Capitalisation and related-party cosmetics."],
    blocks: [
      { t: "p", text: "A simple accruals flag: (PAT − CFO) / assets, persistent and rising. Other income from treasury or a one-time stake sale that funds 'operating' profit. Interest capitalised so that PAT looks cleaner. Channel stuffing: sales up, receivables and discounts up, next quarter down. None of these are automatic shorts. They are reasons to cut the multiple or to wait." },
      { t: "table", caption: "Quality checklist", headers: ["Flag", "Where"], rows: [
        ["CFO << PAT for years", "Cash-flow statement"],
        ["Other income > 20% of PBT, recurring", "P&L"],
        ["Receivables days up every year", "Notes"],
        ["Auditor change + restatement", "Filings"],
      ] },
    ],
    takeaways: ["Quality is a discount-rate input.", "Persistent accruals are a smell.", "One-offs should be one-off."],
    quiz: { q: "Other income is 35% of PBT every year from treasury ops. You should:", options: ["Treat it as core operating profit", "Separate it when you value the operations", "Ignore cash", "Assume a 40× multiple is cheap"], answer: 1, why: "Treasury is not the store." },
  },
  "fundamentals-17": {
    lead: "Capital allocation is what management does with cash: reinvest, buy back, dividend, acquire, or hoard. The historical ROE of those choices is the real track record — not the founder's interview.",
    covers: ["Reinvestment at high ROIC is the dream.", "Buybacks at expensive prices destroy value.", "Dividends are a residual, not a personality."],
    blocks: [
      { t: "p", text: "A firm earning 22% ROIC that reinvests half of FCF at similar returns is compounding. A firm earning 8% that buys another 8% business for 22× is shrinking your future. Buybacks when the stock is below a conservative value can be great; buybacks at peak multiples are a bonus for sellers, including promoters on the other side of the tape. Read the buyback price versus your value, not the press release." },
      { t: "callout", kind: "india", title: "Dividends and buybacks", text: "Indian tax treatment has shifted over years. Process first, tax second. A 2% dividend yield does not make a bad allocator good." },
    ],
    takeaways: ["Follow the cash.", "Buyback price versus value.", "Acquisition ROIC is part of the grade."],
    quiz: { q: "A company buys back stock 40% above a conservative DCF. That buyback is:", options: ["Always shareholder-friendly", "Likely transferring value to exiting holders, including maybe promoters", "Required by SEBI", "A Supertrend buy"], answer: 1, why: "Paying above value shrinks remaining owners' worth." },
  },
  "fundamentals-18": {
    lead: "A one-page scorecard beats a 40-page PDF you will not reread. Same boxes every name, so Infosys and a microcap are comparable as processes — not as businesses.",
    covers: ["Business, numbers, people, price, risks.", "Score process quality, not 'I like the product'.", "Leave blanks when data is missing."],
    blocks: [
      { t: "table", caption: "One page", headers: ["Box", "What you write"], rows: [
        ["Business", "How it makes a rupee; cycle; moat in one line"],
        ["Numbers", "Growth, ROE/ROIC DuPont, FCF vs PAT, leverage"],
        ["People", "Promoter pledge, related parties, allocation history"],
        ["Price", "Multiple vs history vs peers; reverse DCF implied growth"],
        ["Risks", "Three things that retire the thesis"],
        ["Action", "Buy / wait / pass — with a price zone, not a hope"],
      ] },
      { t: "example", title: "Pass is a result", body: "Great bank, 3% pledge, ROE 14% from leverage more than spread, price already implies 12% growth forever. Action: pass. That is a completed fundamental analysis. 'I will wait for RSI 30' is a different course." },
    ],
    takeaways: ["Same boxes every time.", "Blanks stay blank.", "Pass is an output."],
    quiz: { q: "A scorecard with empty cash-flow and pledge boxes is:", options: ["Agile", "Incomplete — do not size a full position on it", "Enough if the logo is famous", "A technical buy"], answer: 1, why: "Missing core boxes means you do not have a full note." },
  },

  "ai-01": {
    lead: "AI can make trading easier the way a junior analyst can: it reads fast, it never gets bored of checklists, and it will confidently invent a number if you let it. Used as a copilot, it is leverage on research. Used as an autopilot, it is a way to lose money at GPU speed.",
    covers: ["Copilot versus autopilot.", "What models are actually good at.", "What they cannot know about tomorrow's Nifty."],
    blocks: [
      { t: "diagram", name: "ai-loop" },
      { t: "ul", items: ["Good at: summarising filings, extracting tables, drafting a checklist, clustering similar setups, retrieving a rule you already wrote.", "Bad at: predicting next week's close, replacing a risk policy, seeing a number that is not in the context, knowing that the RBI statement is this Thursday if you did not tell it.", "Dangerous at: sounding sure."] },
      { t: "p", text: "A language model predicts plausible text. A tree or linear model predicts a label from features you defined. Neither is a fund manager. If your edge is 'the bot said buy', you have no edge you can audit when it fails." },
      { t: "callout", kind: "caution", title: "Hallucinations", text: "Models invent citations, prices and circular numbers. If the premium, lot or filing is not in the source you provided, treat the answer as fiction until you verify." },
    ],
    takeaways: ["Copilot = faster research.", "Autopilot = unowned risk.", "Verify every number."],
    quiz: { q: "The safest use of a language model on a desk is:", options: ["Let it place unsupervised Nifty orders", "Summarise a filing and draft questions, then you verify and decide", "Replace SPAN", "Set lot size to 10,000"], answer: 1, why: "It is a research assistant. You still own the order." },
  },
  "ai-02": {
    lead: "Machine-learning trading dies of data sins more than of weak models. Leakage, survivorship, look-ahead, and training on the same week you test are how a 90% backtest becomes a 40% live month.",
    covers: ["Features must be knowable at decision time.", "No future bars in the feature.", "Survivorship: dead tickers belong in the study."],
    blocks: [
      { t: "p", text: "Leakage: using today's close to 'predict' today's close, or using a restated fundamental that was not filed yet. Look-ahead: a 20-day SMA that accidentally includes the next bar because of an off-by-one. Survivorship: training only on today's Nifty 50 members, ignoring names that fell out after fraud or collapse — your model never saw failure." },
      { t: "example", title: "A leaking feature", body: "You include 'next day's gap' as a feature to predict 'next day's return'. Accuracy is gorgeous. Live, you do not have the gap yet. That is not AI. That is a bug with a neural network parked on top." },
      { t: "callout", kind: "desk", title: "Timestamp everything", text: "Every feature needs a as-of time. Filings use filing date, not period-end date. Prices use only bars that had closed." },
    ],
    takeaways: ["As-of timestamps.", "Include the names that died.", "If it cannot be known at 9:14, it is not a feature."],
    quiz: { q: "Training a model on current Nifty 50 members only, 2014–2024, mainly risks:", options: ["Too much GPU heat", "Survivorship bias — failed members vanished from the classroom", "SEBI fines for ADX", "Low RSI"], answer: 1, why: "The graveyard is part of the distribution." },
  },
  "ai-03": {
    lead: "The models that actually show up on desks are usually boring: linear and logistic regression, regularised trees (XGBoost and friends), simple ensembles. Deep nets eat data and cost. Start boring. If boring cannot beat a moving-average plus risk rule, a transformer will not save you.",
    covers: ["Labels: direction, volatility, or 'setup quality' — pick one.", "Trees versus linear.", "Ensembles average errors; they do not cancel bad labels."],
    blocks: [
      { t: "p", text: "A useful label for a swing desk: 'did this setup, with this risk, make ≥1R before −1R within 10 sessions?' — not 'will Nifty be green tomorrow'. Tomorrow-green is close to a coin with costs. Setup-quality is closer to a process you already have." },
      { t: "ul", items: ["Linear / logistic — inspectable coefficients; great baseline.", "Trees — non-linear interactions; still inspectable via importances and partial dependence.", "Unsupervised (clustering) — group similar regimes; you still decide the trade.", "RL / deep sequential — research, not a first live book."] },
      { t: "callout", kind: "idea", title: "ABC copilot", text: "This platform's copilot answers from verified market context you already loaded — not from an invented chain. That is the right pattern: model plus a data fence." },
    ],
    takeaways: ["Boring models first.", "Label a process, not a coin flip.", "Inspectability is a feature."],
    quiz: { q: "A first live ML project on a retail desk should usually start with:", options: ["An unsupervised 8-billion-parameter trader", "A simple model, a clean label, and a walk-forward you can explain", "Copying a paid signal group", "Max-pain AI"], answer: 1, why: "If you cannot explain it, you cannot risk it." },
  },
  "ai-04": {
    lead: "Overfitting is the model memorising the homework. Walk-forward, nested validation, and a freeze date are the adult responses. A pretty equity curve on the training years is the default, not the achievement.",
    covers: ["Train / validate / test splits in time order.", "Walk-forward: refit on a rolling window.", "Costs, slippage and capacity belong in the test."],
    blocks: [
      { t: "p", text: "Never shuffle days at random — that leaks tomorrow into today. Split 2016–2021 train, 2022 validate, 2023–2024 hold-out, then walk-forward a year at a time. If the edge dies every time the window moves, you fitted noise. Add realistic costs (STT, spread, impact). A 0.3R edge before costs is often negative after them — especially on weeklies." },
      { t: "formula", expr: "Live expectancy ≈ backtest expectancy − (costs + slippage + overfitting tax)", meaning: "The last term is not in the spreadsheet. Assume it is larger than you hope." },
      { t: "callout", kind: "caution", title: "The research-to-live gap", text: "If you tuned 200 parameter sets and show the winner, you have a multiple-testing problem. Pre-commit the recipe, or treat the winner as a hypothesis for the next year, not as a track record." },
    ],
    takeaways: ["Time-ordered validation.", "Walk-forward or it did not happen.", "Costs live inside the test, not as a footnote."],
    quiz: { q: "Shuffling daily bars randomly into train and test mainly causes:", options: ["Faster GPUs", "Look-ahead / leakage of time structure", "Better ADX", "Lower brokerage"], answer: 1, why: "Markets are a sequence. Shuffle destroys that." },
  },
  "ai-05": {
    lead: "The productive pattern: you decide the universe, the risk, and the forbidden list. The model drafts, retrieves, scores, and nags. You still click — or you still pass.",
    covers: ["Research copilot: filings, transcripts, checklists.", "Scoring copilot: rank setups you already defined.", "Never: unsupervised order routing."],
    blocks: [
      { t: "steps", items: [
        "Write the playbook in plain language (this course's checklists).",
        "Let AI extract the facts into those boxes — with source links.",
        "You grade the boxes. Empty stays empty.",
        "A second model may rank the graded setups (probability of 1R, not 'sure shot').",
        "Size from the risk chapter, not from the model's confidence score.",
        "Journal: did the copilot save time, or did it insert a fake number?",
      ] },
      { t: "example", title: "Result-day copilot", body: "You paste the NSE filing. The model fills: revenue, PAT, one-offs, guidance quotes. You check three line items against the PDF. It missed a related-party note — you add it. Then you decide. Time saved: 25 minutes. Authority saved: yours." },
      { t: "callout", kind: "india", title: "On this platform", text: "ABC's research copilot and strategy assistant are fenced to verified market data. If a premium is missing, they should say unavailable — not invent ₹62. That fence is the product. Do not disable it in your own bots either." },
    ],
    takeaways: ["AI fills boxes; you own the action.", "Confidence ≠ size.", "A fake number is a firing offence, even if a model said it."],
    quiz: { q: "A model outputs 0.81 'confidence' on a Nifty long. You should:", options: ["Max leverage", "Treat confidence as a rank, still size from 1R and max loss", "Ignore the stop", "Disable the data fence"], answer: 1, why: "Size lives in the risk policy." },
  },
  "ai-06": {
    lead: "A responsible AI trading workflow is written down: data fence, human gate, kill switch, and an incident log. If that sounds like compliance, good. Leverage without a gate is how 'the script' blows an account at 9:16.",
    covers: ["Human gate on every live order.", "Kill switch and max daily loss.", "Log prompts, features, and fills.", "Regulation and vendor risk."],
    blocks: [
      { t: "ul", items: ["No API order without a pre-trade risk check (max lots, max loss, banned names, expiry).", "Paper-trade a new model for a full walk-forward period before money.", "If data feed fails, flatten or halt — do not let the last stale feature trade.", "SEBI does not need you to be a registered algo shop for a private checklist; it does care if you offer signals to the public. Know which side you are on."] },
      { t: "p", text: "Vendor risk: the model host can change behaviour overnight. Pin versions. Keep a dumb backup rule (VWAP + ATR stop) if the API dies. That backup is adult, not Luddite." },
      { t: "callout", kind: "source", title: "Still the law", text: "Insider rules, communications records, and 'do not manipulate' apply whether the click came from a thumb or a script. AI is not a legal wrapper." },
    ],
    takeaways: ["Gate, kill switch, log.", "Stale data = halt.", "Law applies to scripts."],
    quiz: { q: "The live feed drops at 10:02. The correct default is:", options: ["Let the model trade on the last feature forever", "Halt or flatten per the written rule", "Double size to catch up", "Ask Twitter"], answer: 1, why: "No data, no mandate." },
  },
});

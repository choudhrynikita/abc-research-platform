const { expandLesson } = require("./expand");

const SEBI = { label: "SEBI investor education", href: "https://investor.sebi.gov.in" };
const SCORES = { label: "SEBI SCORES", href: "https://scores.sebi.gov.in" };
const NISM = { label: "NISM", href: "https://www.nism.ac.in" };
const NSE = { label: "NSE Learn", href: "https://www.nseindia.com/learn" };
const MCX = { label: "MCX", href: "https://www.mcxindia.com" };
const IT = { label: "Income Tax India", href: "https://www.incometax.gov.in" };
const RBI = { label: "RBI", href: "https://www.rbi.org.in" };

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "regulations-01": {
    lead: "Insider trading is using unpublished price-sensitive information. Market abuse is a family: pump, dump, spoof, front-run, rumours for profit. 'Everyone does it' is not a defence.",
    blocks: [
      { t: "p", text: "If you are an employee, consultant, or relative of one, UPSI rules are not theoretical. If you are a retail trader sharing 'sure-shot' tips in a paid group, you can still wander into manipulation territory. SEBI has a long memory and a public orders database." },
      { t: "callout", kind: "caution", title: "Telegram rooms", text: "Coordinated buying on a illiquid name plus a screenshot campaign is not a community. It is a pattern regulators recognise." },
    ],
    takeaways: ["UPSI is not a hot tip, it is a legal object.", "Paid groups are not a shield.", "Read SEBI orders; they are free education."],
    quiz: { q: "Trading on unpublished results you were told by an employee is:", options: ["Smart networking", "A classic insider-trading fact pattern", "Allowed if lots are small", "Only illegal for FIIs"], answer: 1, why: "UPSI + trade is the core offence." },
    sources: [SEBI],
  },
  "regulations-02": {
    lead: "STT, stamp duty, exchange fees, and GST on brokerage are not rounding errors if you overtrade. Map them per product.",
    blocks: [
      { t: "table", caption: "Know the buckets (rates change — verify on NSE)", headers: ["Item", "Lives on"], rows: [["STT", "Securities transaction tax — delivery vs F&O differ"], ["Stamp duty", "State-linked, typically buy side for equities"], ["Exchange / clearing / SEBI fees", "Turnover"], ["GST", "On brokerage and certain services"], ["DP charges", "When shares leave demat on a sell"]] },
      { t: "p", text: "From 1 April 2026 (Finance Act 2026 / NSE FATAX): STT on sale of options is 0.15% of the premium (seller); STT on sale of futures is 0.05% of the sell value. Delivery equity STT stayed 0.1% each side. Zero-brokerage ads do not zero the rest. Compute round-trip on a real contract note once. Then decide if scalping 4 ticks is a job or a donation." },
    ],
    takeaways: ["Read a contract note.", "Statutory costs survive zero brokerage.", "Overtrading maximises the fee stack."],
    quiz: { q: "Zero brokerage means:", options: ["The trade is free", "Brokerage is zero; STT, venue fees, GST, spread remain", "No STT", "No risk"], answer: 1, why: "Marketing ≠ statutory." },
  },
  "regulations-03": {
    lead: "Equity taxation in India currently distinguishes listed short-term and long-term capital gains, with rules that the Finance Act can rewrite. This lesson is a map, not your CA.",
    blocks: [
      { t: "p", text: "Holding period for listed equity (12 months is the usual LTCG threshold people quote — confirm current law). STCG and LTCG rates, exemption thresholds, surcharge, and cess change. Grandfathering rules existed for older holdings. Do not take a YouTube rate as gospel the week after a Budget." },
      { t: "callout", kind: "caution", title: "Not advice", text: "ABC is a research platform, not your tax advisor. Use the Income Tax Department and a CA for filings. Log every contract note." },
    ],
    takeaways: ["Listed equity has its own holding-period logic.", "Budget can change rates.", "Keep contract notes; this is not tax advice."],
    quiz: { q: "For personal tax on equity trades you should primarily rely on:", options: ["A Discord screenshot", "Current law + a qualified CA / ITR utility", "A trading guru's bio", "SPAN files"], answer: 1, why: "Tax is professional work." },
    sources: [IT],
  },
  "regulations-04": {
    lead: "F&O P&L for typical retail is often treated as non-speculative business income (turnover rules apply for audit), not as simple STCG. The details are easy to get wrong.",
    blocks: [
      { t: "p", text: "Turnover computation for F&O, tax audit thresholds, and the ability to set off losses have specific rules. People who 'save tax' by ignoring this meet notices. If F&O is material, involve a CA who actually does market clients — not a cousin who files salaries." },
      { t: "callout", kind: "caution", title: "Losses", text: "Whether a loss is available to set off, and for how long, depends on the head of income. Do not assume an F&O loss automatically wipes salary." },
    ],
    takeaways: ["F&O tax ≠ delivery STCG by default.", "Turnover definitions matter for audit.", "Get a market-literate CA."],
    quiz: { q: "F&O trading income for a typical individual is commonly classified as:", options: ["Always tax-free", "Often business income with special turnover rules — confirm with a CA", "Agricultural income", "STT refund"], answer: 1, why: "Business-head treatment is the usual conversation — verify." },
    sources: [IT],
  },
  "regulations-05": {
    lead: "Pledge and margin trading facility (MTF) are loans against your securities. Funding risk is how a market decline becomes a forced sale in your demat.",
    blocks: [
      { t: "p", text: "Pledge to a broker for margin is convenient and dangerous. Haircuts rise in stress. MTF interest is a carry cost that your thesis must beat. If you do not know the close-out process, you do not understand the product." },
      { t: "callout", kind: "caution", title: "Forced square-off", text: "The broker's RMS will not wait for your 'long-term' speech. That is in the agreement you clicked." },
    ],
    takeaways: ["Pledge/MTF = leverage on cash names.", "Haircuts gap in stress.", "Read the close-out clause."],
    quiz: { q: "MTF is closest to:", options: ["A gift", "A loan to buy shares, with interest and RMS close-out", "A tax exemption", "A put option"], answer: 1, why: "It is funded long equity." },
  },
  "regulations-06": {
    lead: "Offer documents, risk disclosure documents, and policyholder-style F&O consent forms are not wallpaper. The sentence you skip is the one RMS will quote.",
    blocks: [
      { t: "ul", items: ["RDD for derivatives — you acknowledged unlimited-looking futures risk.", "Privacy and order-routing policies.", "Annual reports and RHP if you buy issues.", "Index methodology documents if you trade the index as if you knew the recipe."] },
    ],
    takeaways: ["Click-wrap is still a contract.", "RDD is the futures warning label.", "Primary documents beat threads."],
    quiz: { q: "The F&O risk disclosure you signed exists to:", options: ["Decorate the app", "Record that you were told derivatives can lose more than a small premium or posted margin path", "Guarantee profits", "Replace SPAN"], answer: 1, why: "Disclosure is the warning, not a talisman." },
  },
  "regulations-07": {
    lead: "SCORES is SEBI's complaint system. Exchanges have investor service cells. Use them with documents, not with caps-lock.",
    blocks: [
      { t: "p", text: "Wrong settlement, unauthorised trades, IPO application issues — there is a ladder: broker grievance, exchange, SCORES. Keep contract notes, emails, and timestamps. Social media is not a regulator." },
    ],
    takeaways: ["Document first.", "Ladder: broker → exchange → SCORES.", "Civility and evidence travel further than rage."],
    quiz: { q: "The SEBI complaint portal is:", options: ["NSE NOW", "SCORES", "MCX Play", "SPAN"], answer: 1, why: "SCORES is the SEBI system." },
    sources: [SCORES, SEBI],
  },
  "regulations-08": {
    lead: "NISM is how India licenses many market seats. You do not need a certificate to buy a share. You do need the right one to be a research analyst, an investment adviser, or certain exchange-facing roles.",
    blocks: [
      { t: "table", caption: "A rough map (confirm current modules)", headers: ["Seat", "Typical NISM conversation"], rows: [["Research analyst", "RA regulations + NISM RA"], ["Investment adviser", "IA regulations + NISM IA"], ["Dealers / sales", "Series relevant to the function"], ["Currency / derivatives", "Product-specific modules exist"], ["Mutual fund distributor", "A different NISM path"]] },
      { t: "p", text: "Passing an exam is not a personality. It is a licence condition for some jobs. For a personal account, the course you are in now matters more than a certificate on the wall — unless you are selling advice, in which case the law is not optional." },
    ],
    takeaways: ["Personal trading ≠ licensed advice.", "If you advise for a fee, read the IA/RA rules.", "Confirm current NISM modules at the source."],
    quiz: { q: "Giving paid individual stock advice to the public without the required registration is:", options: ["A hobby", "A regulated activity you may not be allowed to do", "Always fine if you use emojis", "The same as keeping a journal"], answer: 1, why: "IA/RA regimes exist." },
    sources: [NISM],
  },

  "desk-01": {
    lead: "A playbook is if-then, not a mood board of tickers. Write setups as: market condition → trigger → stop → size → management.",
    blocks: [
      { t: "p", text: "Example: 'If Nifty weekly is a range and IV is elevated, I sell a defined-risk condor sized to 1R max loss, no adds, time-stop Tuesday 14:00 unless a 1.5× ATR shock hits the wing plan.' That is a playbook line. 'I like Bank Nifty' is not." },
    ],
    takeaways: ["If-then format.", "Each setup has a kill condition.", "Likes are not playbooks."],
    quiz: { q: "A playbook entry must include:", options: ["A celebrity tweet", "Condition, trigger, invalidation, size", "A lucky colour", "Zero stops"], answer: 1, why: "Otherwise it is a vibe." },
  },
  "desk-02": {
    lead: "A backtest that cannot lose is a souvenir. Honest tests include costs, slippage, missed fills, regime splits, and the rule that you would have actually clicked.",
    blocks: [
      { t: "ul", items: ["In-sample vs out-of-sample vs walk-forward.", "Costs at your real size, not zero.", "No lookahead (using tomorrow's high to enter today).", "No survivorship (delisted names).", "Multiple regimes: 2020 crash, 2018 grind, 2024 options weekly world."] },
      { t: "callout", kind: "caution", title: "Overfit", text: "If the system has 40 parameters and a Sharpe of 6 on one index, you have a custom suit for the past." },
    ],
    takeaways: ["Costs and slippage or it is fiction.", "Regimes, not one bull tape.", "Fewer rules, more robustness."],
    quiz: { q: "Using tomorrow's close to decide today's entry is:", options: ["Machine learning", "Lookahead bias", "A hedge", "NISM syllabus"], answer: 1, why: "You used the future." },
  },
  "desk-03": {
    lead: "The fill is the trade. A beautiful level you cannot transact is a diary entry. Slippage and impact are the difference between a backtest and a day.",
    blocks: [
      { t: "p", text: "Market orders buy the ask and sell the bid. In a thin stock option, that can be the entire theoretical edge. Work orders. Use defined limits. If you need out, you may still have to cross — that cost belongs in 1R." },
    ],
    takeaways: ["Model the spread.", "Impact rises with urgency and size.", "The click is part of the strategy."],
    quiz: { q: "In a 2-rupee-wide option, a '₹1 edge' on paper is:", options: ["Easily captured", "Probably inside the spread — not an edge until proven at fill", "Tax-free", "A futures arb"], answer: 1, why: "Spread can eat the edge." },
  },
  "desk-04": {
    lead: "FII/DII cash figures and options open interest are context. They are not a joystick. People who treat them as remote controls meet a tape that already moved.",
    blocks: [
      { t: "p", text: "Cash FII selling plus short-covering in index futures can coexist. Options OI at a strike is fuel and positioning, not a magnet guaranteed to tag. Combine with structure and event risk. ABC's own FII/DII and strategy desks are for context — use them that way." },
    ],
    takeaways: ["Flow is lagging context.", "OI is positioning, not destiny.", "Do not one-indicator the macro tape."],
    quiz: { q: "A large OI pile at a Nifty strike means:", options: ["Price must stop there", "Many contracts exist there — pin, defence, or fuel are hypotheses, not laws", "FIIs are done for the year", "IV is zero"], answer: 1, why: "OI is quantity, not a force field." },
  },
  "desk-05": {
    lead: "RBI policy, the Union Budget, inflation prints, US payrolls, and results days are event risk. Optionalities get expensive; gaps get rude. You do not have to play.",
    blocks: [
      { t: "p", text: "Two honest seats: reduce risk into the event, or pay for defined-risk optionality knowingly. The dishonest seat is a naked short premium the night before the Budget because last time it was quiet." },
      { t: "callout", kind: "india", title: "Calendar", text: "RBI, Budget, monthly CPI/IIP, quarterly results, FOMC — put them on the desk calendar. A 'surprise' you could have Googled is a process failure." },
    ],
    takeaways: ["Events are optional.", "Short premium into binaries is a style, not a requirement.", "Calendars are risk tools."],
    quiz: { q: "The professional default into a binary event you do not have an edge on is:", options: ["Max size", "Smaller or defined risk — or flat", "Naked weekly shorts", "MTF"], answer: 1, why: "No edge, no oversized binary." },
    sources: [RBI],
  },
  "desk-06": {
    lead: "Multi-timeframe is not eight charts. It is: higher timeframe bias, intermediate structure, lower timeframe trigger — and permission to pass.",
    blocks: [
      { t: "ul", items: ["Weekly: regime.", "Daily: levels.", "Intraday: only if the first two allow.", "If they conflict, size down or skip."] },
    ],
    takeaways: ["HTF bias first.", "LTF is trigger, not a new religion.", "Conflict → smaller or nothing."],
    quiz: { q: "If weekly is a melt-up and the 5-minute looks toppy, a short is:", options: ["Mandatory", "A counter-trend scalping idea that must be sized as such — or skipped", "A long-term investment", "A hedge by default"], answer: 1, why: "You are fading the HTF; name it." },
  },
  "desk-07": {
    lead: "A professional P&L is net of all costs, all error trades, and all 'I forgot STT'. Gross points on Nifty are a video game score.",
    blocks: [
      { t: "formula", expr: "Net = Gross − spread − fees − STT − errors − overtime brain damage", meaning: "If net expectancy is not positive, you have a hobby. Price it like one." },
      { t: "p", text: "Break-even move on a futures lot after costs is the first number on the sheet. If your average winner does not clear it, stop adding colour to candles." },
    ],
    takeaways: ["Net or it did not happen.", "Break-even move after costs.", "Error trades belong in the sample."],
    quiz: { q: "A strategy with +0.4R gross and −0.5R in costs/slippage is:", options: ["Slightly profitable", "A losing strategy", "Market-neutral", "Tax-efficient by default"], answer: 1, why: "Net is what compounds." },
  },
  "desk-08": {
    lead: "Ninety days is long enough to see whether you will keep a journal and short enough that you should not bet the house. Treat it as an apprenticeship, not a rebrand as a 'full-time trader' on day four.",
    blocks: [
      { t: "ul", items: ["Days 1–30: only the Start-here path + paper or micro size. Daily journal.", "Days 31–60: one playbook setup live at 0.25–0.5R. Weekly review.", "Days 61–90: if process grades are high, 1R. If not, restart 30. No shame.", "No new product classes mid-sprint (no first NG trade in week 11)."] },
      { t: "callout", kind: "idea", title: "Graduation", text: "Graduation is a boring equity curve and a filled journal, not a screenshot of one Nifty expiry." },
    ],
    takeaways: ["Apprenticeship pacing.", "Process grades gate size.", "One product family at a time."],
    quiz: { q: "If at day 45 you cannot produce a journal, you should:", options: ["Triple size to 'focus'", "Stay tiny or flat until the habit exists", "Start a paid channel", "Trade NG"], answer: 1, why: "No log, no licence to size." },
  },

  "library-01": {
    lead: "The official classrooms are free or cheap and not trying to sell you a recovery trade. Start there. Supplement, do not replace, with gurus.",
    blocks: [
      { t: "ul", items: ["NSE Learn and NSE's F&O product pages.", "SEBI investor education + SCORES.", "NISM workbooks for the seat you actually want.", "MCX education for commodities.", "RBI communications for the money regime.", "Income Tax Department for the filing you will do anyway."] },
      { t: "callout", kind: "india", title: "Primary links", text: "These are the venues. This course is original ABC teaching that points at them — it does not pirate their PDFs or anyone else's books." },
    ],
    takeaways: ["Official first.", "Workbooks beat recaps.", "We will not host pirated files."],
    quiz: { q: "The first place to learn settlement rules is:", options: ["A leaked PDF of a copyrighted book", "The exchange and SEBI investor materials", "A paid recovery-trade room", "A rumour"], answer: 1, why: "Primary sources." },
    sources: [NSE, SEBI, NISM, MCX, RBI],
  },
  "library-02": {
    lead: "Buy books with money. That is how you stay in an industry that runs on property rights. Titles below are a reading list, not files we will ship.",
    blocks: [
      { t: "table", caption: "A legal bookshelf (buy or borrow)", headers: ["Lane", "Examples of the conversation"], rows: [["Value / business", "Graham's Intelligent Investor; Fisher; more recent quality-compounder writing"], ["Randomness / humility", "Fooled by Randomness; Thinking, Fast and Slow"], ["Trading process", "Market Wizards interviews; Van Tharp on R; Mark Douglas on discipline"], ["Options", "Natenberg; McMillan — textbooks, not Telegram gists"], ["India desk", "SEBI/NISM workbooks; Budget documents; exchange circulars"]] },
      { t: "p", text: "If a site offers 'all trading PDFs free zip', you are not getting an education. You are getting malware and a copyright problem. Libraries, bookstores, and official workbooks exist." },
    ],
    takeaways: ["Buy or borrow legally.", "Textbooks > leaked zips.", "India-specific rules come from Indian authorities."],
    quiz: { q: "ABC Knowledge Centre will:", options: ["Upload pirated Natenberg", "Assign original lessons and point you to legal sources", "Host Telegram recording dumps", "Sell insider tips"], answer: 1, why: "Original course + legal reading list." },
  },
  "library-03": {
    lead: "Worksheets are how a lesson becomes a habit. Fill them on paper or in a spreadsheet you own. We generate the templates here — we do not scrape someone else's Excel.",
    blocks: [
      { t: "ul", items: ["Trade journal (CSV): date, setup, R, process grade, emotion, notes.", "Position size: equity, 1R %, entry, stop → size.", "Risk policy: one page, the eight lines from Foundations-08 and Risk-08.", "Watchlist: 12-word thesis, ruin driver, invalidation."] },
      { t: "callout", kind: "desk", title: "In this module", text: "Use the Field Kit buttons on the Knowledge Centre home to download the CSV/text templates. They are ABC originals." },
    ],
    takeaways: ["Templates are starting points.", "Your filled sheet is the asset.", "No pirated Excel."],
    quiz: { q: "The journal CSV is for:", options: ["Impression management", "Logging process and R so you can audit yourself", "SEBI's daily filing", "Sharing tips"], answer: 1, why: "Self-audit." },
  },
  "library-04": {
    lead: "A glossary you will actually use is short. Here are terms this course treats as load-bearing.",
    blocks: [
      { t: "table", caption: "Load-bearing words", headers: ["Term", "In this house it means"], rows: [["R", "Pre-defined loss if the idea is wrong"], ["Invalidation", "The fact that kills the idea"], ["Notional", "Underlying value controlled, not premium"], ["IV", "Implied volatility — price of optionality"], ["SPAN", "Exchange margin model for derivatives"], ["MWPL", "Market-wide position limit on stock F&O"], ["Basis", "Futures versus cash relationship"], ["Heat", "Open risk in R"], ["Expectancy", "Average R per trade, costs in"], ["UPSI", "Unpublished price-sensitive information"], ["T+1", "Next working-day cash settlement"], ["Novation", "Clearing corporation steps in as counterparty"], ["Skew", "OTM options not priced like a simple lognormal"], ["Kill switch", "A loss cap that ends the session"], ["Playbook", "If-then, not a vibe"]] },
      { t: "p", text: "If a guru uses these words loosely, translate before you imitate. Language is risk management." },
    ],
    takeaways: ["Shared language reduces expensive confusion.", "R, notional, invalidation, heat — daily words.", "If the word is sloppy, the risk will be too."],
    quiz: { q: "Notional of an options position is closest to:", options: ["Only the premium debit", "The underlying value the contract controls", "STT", "Face value of one share"], answer: 1, why: "Premium is the ticket; notional is the exposure scale." },
  },
});

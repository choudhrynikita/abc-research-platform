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
  "macro-01": {
    lead: "A rupee book sits inside a world of dollars, oil, and rates. You do not need a global-macro fund. You do need a map of what can shove Nifty when nothing 'Indian' happened on the tape.",
    covers: ["Nifty is not a closed room.", "The dollar and US rates leak into FII and into USDINR.", "Oil is a tax and a current-account story for India."],
    blocks: [
      { t: "p", text: "FII selling is often a global risk-off sentence translated into Indian cash and futures. If S&P futures are −2% and our open is 'surprisingly weak', it is not a mystery. If S&P is quiet and Bank Nifty is on fire, look at RBI, credit news, or a domestic print — not at Cleveland." },
      { t: "table", caption: "Leakage map", headers: ["Impulse", "Often shows up as", "Do not confuse with"], rows: [
        ["US yields up hard", "FII outflow risk, USDINR up", "A random Nifty RSI 30"],
        ["Brent spike", "OMCs, current account, inflation worry", "A gold-only story"],
        ["RBI surprise", "Banks, NBFCs, duration funds", "A US payroll"],
        ["China scare", "Metals, some EM beta", "A midcap promoter tale"],
      ] },
      { t: "p", text: "Advanced habit: a 6-line overnight note. US close, yields, dollar, Brent, China, our basis. If you cannot write it in 90 seconds, you will discover it in the open with size on." },
    ],
    takeaways: ["Global pulses leak.", "Domestic pulses still exist — separate them.", "Overnight note before size."],
    quiz: { q: "Nifty gaps down with S&P −2% and no India news. First camera:", options: ["A Nifty DCF just flipped", "Global risk-off leaking through FII and futures", "SEBI circuit", "Max pain"], answer: 1, why: "The world is allowed to shove the open." },
    sources: [RBI],
  },
  "macro-02": {
    lead: "RBI is the domestic weather machine: repo, liquidity, the corridor, and the words. A 25 bp move is a headline. The standing deposit window and FX intervention are the plumbing. Advanced traders read both.",
    covers: ["Policy rate versus liquidity in the system.", "Guidance can move the curve more than the 25 bps.", "Banks, duration, and USDINR are the first seats."],
    blocks: [
      { t: "p", text: "If RBI holds but sounds tighter, bond yields can rise and bank NIMs can be a two-sided story. If RBI cuts into sticky inflation, you can get a sugar-high in rate-sensitives and a headache in the rupee. The statement is the trade more often than the integer." },
      { t: "ul", items: ["Do not be fully loaded in duration the morning of a policy without a written 'if hike / if hold / if cut'.", "Bank Nifty options into RBI are event vol — see the vol track.", "USDINR on MCX/NSE the same afternoon is a second screen, not a decoration."] },
      { t: "example", title: "Hold, hawkish", body: "Repo unchanged, language on food inflation harder. 10-year yield +8 bp, Bank Nifty −1.2%, Nifty −0.4%. A long-duration debt fund marked down; a short-rate bull flattened. The integer was zero. The words were not." },
    ],
    takeaways: ["Words move curves.", "Have three tickets written before 10am policy.", "Liquidity ≠ the repo print."],
    quiz: { q: "RBI holds the repo but sounds hawkish. Duration books usually:", options: ["Must rally", "Can sell off because the path of rates repriced, not the integer", "Are unaffected", "Convert to gold"], answer: 1, why: "Guidance reprices the curve." },
    sources: [RBI],
  },
  "macro-03": {
    lead: "USDINR is the exhaust pipe of India's external book: trade, oil, FII, RBI, and global dollar liquidity. Treating it as a random FX pair is how people get run over by a crude spike they were not watching.",
    covers: ["Rupee weakening is not 'always bearish Nifty'.", "Importer versus exporter hedges are different tickets.", "RBI can be on the other side of a move longer than your stop."],
    blocks: [
      { t: "p", text: "A slow rupee drift with FII buying is a different regime from a fast rupee dump with oil at $100 and EM outflows. Nifty can still make highs in a mild rupee decline if earnings in IT (dollar) help. It is a mix, not a slogan." },
      { t: "p", text: "On the ABC Commodities desk, USDINR is an importer-hedge (buy USDINR futures) or exporter-hedge (sell) ticket. That is how corporates think. If you are speculating the same contract, you are in their weather. Size like it." },
      { t: "callout", kind: "india", title: "Intervention", text: "RBI does not owe your chart a completion. Spikes can reverse in hours because a public-sector bank showed up. Fade-the-spike systems need a written 'if it does not reverse by T+1, flatten'." },
    ],
    takeaways: ["USDINR is a residual of many books.", "Hedge tickets ≠ spec tickets.", "Intervention can orphan a breakout."],
    quiz: { q: "A rupee dump driven by oil and FII outflow is best first treated as:", options: ["A Nifty buy because cheap rupee", "A risk-off mix — check oil, flows, and your USDINR heat", "Proof RBI is absent forever", "A covered call"], answer: 1, why: "It is a cocktail, not a single-factor gift." },
  },
  "macro-04": {
    lead: "Crude is India's imported inflation and a sector split: upstream versus OMCs versus aviation versus paints. A $10 Brent move is not 'buy energy, sell everything' unless you do the split.",
    covers: ["India is a net importer of crude.", "Pass-through to inflation and deficits is lagged and political.", "MCX crude is a contract with an expiry, not a morality play."],
    blocks: [
      { t: "p", text: "Upstream names can like higher oil. OMCs can hate it until marketing margins or government maths catch up. Aviation and chemicals feel input costs. A blanket 'energy rally' basket is a beginner basket. Split or pass." },
      { t: "p", text: "MCX crude lots are large in rupee heat. If you want oil beta without SPAN, there are listed energy names and some international funds — each with their own tracking and tax. Futures are a tool, not a personality." },
      { t: "example", title: "Same spike, opposite books", body: "Brent +8% in a week. A long OMC without a hedge is a hope that marketing margins survive. A short OMC is a hope that they do not get a compensating formula. Neither is 'the oil trade'. The oil trade on MCX is the barrel. The equity is a company." },
    ],
    takeaways: ["Split the energy complex.", "Heat on MCX crude is not a toy.", "Equity ≠ the barrel."],
    quiz: { q: "A sudden Brent spike is automatically:", options: ["Long every 'energy' ticker", "A split: upstream / OMC / consumers — plus a macro inflation leak", "Irrelevant to India", "A gold-only event"], answer: 1, why: "India's energy map is not one ticker." },
    sources: [MCX],
  },
  "macro-05": {
    lead: "FII and DII are flows, not oracles. A day of FII selling is a print. A month of FII selling while DII absorbs is a regime. Advanced use is regime tagging, not copying Tuesday's table.",
    covers: ["FII often tracks global beta.", "DII includes mutual funds, insurers — not a hive mind.", "Futures FII versus cash FII can disagree."],
    blocks: [
      { t: "p", text: "Cash FII selling + futures FII buying can be a basis or a hedge, not a bull call. If you only watch one column of the FII/DII page, you will invent a story. Watch cash, derivatives, and the index together — ABC's FII & DII tab is built for that, not for a 'FIIs know' tattoo." },
      { t: "p", text: "DII buying into FII selling is the 2018–202x Indian household SIP story in one sentence. It can persist. It can fail on a true panic day. Do not assume DII is a put under Nifty 50. They have mandates, not a promise to you." },
    ],
    takeaways: ["Flows are regimes, not ticks.", "Cash and futures columns can fight.", "DII is not a central bank."],
    quiz: { q: "FII cash sell + FII futures buy on the same day most honestly means:", options: ["Guaranteed crash", "You need more than one column — it can be hedges or basis, not a slogan", "DII has quit", "VIX is zero"], answer: 1, why: "Two columns, two books." },
  },
  "macro-06": {
    lead: "The Union Budget is a scheduled vol event with sectoral winners and losers that the market sometimes prices in January and sometimes only after the speech. Trading the speech without a sector map is karaoke.",
    covers: ["Pre-Budget vol is a product.", "Capex, tax, and rural lines hit different books.", "The day after is often the real tape."],
    blocks: [
      { t: "p", text: "Infra and PSU baskets get Bid-in-January, fade-the-speech, buy-the-implementation — all three have worked in different years. That sentence should humble you. Write a map: if tax on X, names A/B; if capex thrust, names C/D; if rural, FMCG/tractors. Then size small, because the speech can ignore your map." },
      { t: "ul", items: ["Do not be max short vol into Budget unless that is a defined-risk, shock-sized ticket.", "Banking and tax-policy rumours will leak for weeks. Most are noise.", "Implementation risk is a months-long special, not a 15:30 scalp."] },
    ],
    takeaways: ["Map sectors before the speech.", "Vol is the product on the day.", "Implementation is a different trade."],
    quiz: { q: "The professional Budget stance on short vol is usually:", options: ["Max naked strangles for the 'salary'", "Defined-risk or flat — the speech is a jump", "Mandatory long vega 20 lots", "Ignore it, SIPs handle Budget"], answer: 1, why: "It is a scheduled jump." },
  },
  "macro-07": {
    lead: "Monsoon, rural demand, and food inflation are still Indian macros, even in a services-and-capex era. A late monsoon is not a Nifty 50 story in week one; it is an FMCG, tractor, and CPI story that can become an RBI story.",
    covers: ["Food inflation feeds the RBI reaction function.", "Rural is not one ticker.", "Do not wait for a drought headline to think about it in June."],
    blocks: [
      { t: "p", text: "June–September, look at rainfall maps like a grown-up if you hold rural-sensitive books. You do not need to become an agronomist. You need a 'if deficit persists into August, cut X, watch CPI, respect RBI' line in the playbook." },
    ],
    takeaways: ["Season is a calendar risk.", "Food CPI can become rates.", "Rural is a basket, not a meme."],
    quiz: { q: "A monsoon deficit becomes a Nifty-wide story mainly when it:", options: ["Rains on a Tuesday", "Feeds food inflation and the RBI path — not on day one of a dry spell", "Hits only one tea garden", "Lifts VIX by law"], answer: 1, why: "Transmission is the story." },
  },
  "macro-08": {
    lead: "Global central banks: you do not trade the Fed, but the Fed trades you. US real yields, the dollar, and risk appetite are inputs to FII and to gold. A one-line Fed map belongs on an Indian desk.",
    covers: ["Higher US real yields often pressure EM and gold.", "Cuts are not automatically 'risk on' if they come with a recession scare.", "Do not run a 24-hour Fed desk on a 9:15–15:30 product without a gap rule."],
    blocks: [
      { t: "p", text: "Nifty options do not trade at 2am IST. The Fed does. A Nifty weekly that still has an FOMC night inside it (or a Sensex Thursday weekly, or a Nifty monthly) can gap the next Indian morning. If you sell premium through a press conference you cannot hedge in size at 2:15am, you sold a jump. Either size the gap or don't sell that expiry. Tuesday-expiry Nifty weeklies often die before a Wednesday FOMC — do not copy old Thursday-weekly folklore onto the new clock." },
      { t: "example", title: "The 2am gap", body: "You are short a Nifty 50-wide condor into a Fed day, shock cell −0.8R on ±1%. The actual global move is ±2.4% overnight. Cash you cannot delta-hedge. Morning: the condor is a different animal. The lesson is the calendar, not 'Fed is unpredictable'." },
    ],
    takeaways: ["Overnight gaps are a product feature.", "Fed days are gap days for Indian weeklies.", "Real yields leak into gold and EM."],
    quiz: { q: "Selling index premium overnight through an FOMC print, while NSE is closed, is mainly:", options: ["Free theta", "Unhedgeable gap risk during your market's close", "Required", "A cash-secured put"], answer: 1, why: "You are closed; they are not." },
  },
  "macro-09": {
    lead: "Liquidity: not just RBI, but government cash balances, GST flows, and year-end. Tight rupee liquidity can lift short-term rates and shove carry trades even if the repo is unchanged.",
    covers: ["System liquidity is a rate, not a vibe.", "Quarter-ends have their own demand for cash.", "Do not ignore the call-rate if you run duration or bank books."],
    blocks: [
      { t: "p", text: "When the government vacuums rupees into its balances, overnight rates can spike. NBFCs and the short end feel it first. If your 'safe' liquid fund holds paper that marks, you will see it. This is boring until it is your redemption week." },
    ],
    takeaways: ["Cash in the system has a price.", "Quarter-end is a calendar.", "Boring plumbing moves carry."],
    quiz: { q: "A spike in overnight rates with an unchanged repo often points to:", options: ["A secret Nifty circuit", "Temporary system liquidity tightness", "VIX going to zero", "A buyback"], answer: 1, why: "Liquidity ≠ policy rate every hour." },
    sources: [RBI],
  },
  "macro-10": {
    lead: "Write a one-page macro dashboard you will actually fill: US, oil, USDINR, RBI calendar, FII 20-day, and 'what would change my Nifty beta today'. If it needs a 40-tab workbook, you will not use it.",
    covers: ["Six cells beat a newsletter addiction.", "Beta-today is a decision, not a forecast.", "Empty cell = no increase in risk."],
    blocks: [
      { t: "table", caption: "Overnight six", headers: ["Cell", "Source", "Action if red"], rows: [
        ["US / yields", "Index + 10y", "Cut Nifty beta or hedge"],
        ["Dollar / USDINR", "DXY + INR", "Check exporter/IT vs importer"],
        ["Brent", "Last + weekly %", "Split energy / inflation"],
        ["RBI / data", "Calendar", "No short vol into it"],
        ["FII 20d", "NSE/ABC flows", "Regime tag only"],
        ["My beta", "Written", "Must match the five cells"],
      ] },
      { t: "p", text: "Fill it before you size, not after a loss to explain the loss. That is the only creative trick that matters." },
    ],
    takeaways: ["A short dashboard you fill is better than a long one you don't.", "Beta is chosen.", "Red cells reduce size — they don't add tickers."],
    quiz: { q: "If three of six overnight cells are red and you still max long Nifty futures, you have:", options: ["Conviction", "A dashboard you are ignoring — which is not a dashboard", "A Fed put", "A covered call"], answer: 1, why: "The page exists to constrain you." },
  },

  "portfolio-01": {
    lead: "A household book and a trading book are different animals that share a bank account. Mixing them is how a weekly options loss 'borrows' from the child's tuition SIP.",
    covers: ["Ring-fence risk capital.", "The SIP is not a margin buffer.", "Write the split in rupees, not in vibes."],
    blocks: [
      { t: "p", text: "Example split: 70% long-term (index / quality equity / debt ladder), 20% satellite (factors, gold overlay, specials), 10% risk capital (F&O, tactical). The 10% can go to zero without changing the family's decade. If your F&O can touch the 70%, you do not have a 10%. You have a story." },
      { t: "formula", expr: "Risk capital ≤ amount you can lose and still be a functioning adult", meaning: "Not 'amount you hope to turn into a crore'. The ceiling is psychological and legal (no pledged house)." },
      { t: "callout", kind: "caution", title: "MTF against the core", text: "Funding a trading idea by pledging the long-term demat is how cores become trading books in a bad month. If the idea needs pledge, it is too big." },
    ],
    takeaways: ["Split is a number.", "Core is not collateral for weeklies.", "Risk capital can go to zero by design."],
    quiz: { q: "Using the child's index-fund SIP as F&O margin is:", options: ["Efficient capital", "A failure to ring-fence — the core became the trading book", "Required by SPAN", "Tax-optimal always"], answer: 1, why: "Ring-fence is the whole lesson." },
  },
  "portfolio-02": {
    lead: "Factors: value, momentum, quality, low-vol, size. In India they exist as indices and as behaviour. A factor sleeve is a written tilt, not 'I buy whatever ran'.",
    covers: ["Momentum is a factor with drawdowns.", "Quality is not a feeling; it is a screen.", "Crowded factors dump together."],
    blocks: [
      { t: "p", text: "Nifty 200 Momentum 30 will have years that look like genius and years that look like a trapdoor. If you cannot sit through the trapdoor, you did not want the factor. You wanted last year's return." },
      { t: "p", text: "Quality (ROE, leverage, earnings variability) is a defence that underperforms in junk rallies. That underperformance is the fee for not owning the junk. Write it or you will rotate into junk at the top." },
      { t: "table", caption: "Tilt, not identity", headers: ["Factor", "Pays you when", "Hurts you when"], rows: [
        ["Momentum", "Trends persist", "Whipsaw, mean-revert months"],
        ["Value", "Mean reversion, recovery", "Value traps, prolonged growth regimes"],
        ["Quality", "Stress, flight to balance sheets", "Junk-beta melt-up"],
        ["Low vol", "Chop, risk-off", "Risk-on breadth"],
      ] },
    ],
    takeaways: ["A factor is a drawdown you agreed to.", "Crowding is a risk.", "Don't rotate at the top of the factor you don't hold."],
    quiz: { q: "A momentum index falling 18% while Nifty is −6% is often:", options: ["Proof momentum is fake", "The factor's known pain — if you cannot sit it, you were renting last year's return", "A SEBI event", "A bond yield"], answer: 1, why: "Factors earn their premia in uneven paths." },
  },
  "portfolio-03": {
    lead: "Rebalancing is the only 'free lunch' that still asks you to sell what loved you and buy what embarrassed you. Without a calendar or a band, you will not do it.",
    covers: ["Calendar (yearly) versus band (e.g. 5 points off target).", "Tax and costs are real — don't rebalance pennies.", "Rebalance the split, not every ticker."],
    blocks: [
      { t: "p", text: "70/20/10 drifts to 58/14/28 after a wild F&O year. That 28% is now the family risk. Rebalance means taking the trading book back to 10% even if it 'feels hot'. If you cannot, the split was a slide in a deck." },
      { t: "example", title: "Band", body: "Target equity 70% ±5. At 76% you sell equity into debt or gold overlay until 70–72. You do not need a forecast. You need a band and a date." },
    ],
    takeaways: ["Drift is a position.", "Bands beat moods.", "Don't nickle-and-dime through STT for 0.4%."],
    quiz: { q: "After a melt-up your 70% equity sleeve is 81%. Process says:", options: ["Let it ride, it's working", "Rebalance toward target — drift is an unwritten overweight", "Pledge it for MTF", "Convert all to weeklies"], answer: 1, why: "The target was the strategy." },
  },
  "portfolio-04": {
    lead: "Tax-aware portfolio management in India is not a loophole hunt. It is not harvesting losses you don't have, not churning long-term holdings for entertainment, and not ignoring STT on a 'tiny' rebalance.",
    covers: ["Holding period still matters for listed equity.", "F&O P&L is usually a different head — don't mix stories.", "This is not tax advice; it is hygiene."],
    blocks: [
      { t: "p", text: "Selling a 11-month winner to 'rebalance' two weeks before a long-term threshold can be an expensive click. Sometimes you still should, because risk > tax. Write the arithmetic. Do not take a YouTube rate as gospel the week after a Budget — see the regulations track." },
      { t: "callout", kind: "caution", title: "Not your CA", text: "ABC is a research course. Filing, audit thresholds, and surcharge are professional work. Keep contract notes." },
    ],
    takeaways: ["Risk can beat tax — write it.", "Heads of income don't merge because you want them to.", "Contract notes are the archive."],
    quiz: { q: "Rebalancing a long-term equity sleeve should first compare:", options: ["Only the tweeted tax rate", "The risk of the drift versus the tax/cost of the click", "VIX", "Max pain"], answer: 1, why: "Tax is a cost. Drift is a risk. Compare them." },
  },
  "portfolio-05": {
    lead: "Overlays: gold, international, and duration on top of a core equity book. A 8–12% gold sleeve is an insurance premium, not a trade. If you trade it like a weekly, you do not have an overlay.",
    covers: ["Overlay has a target weight and a rebalance rule.", "Gold BeES vs futures vs SGB are different tools.", "International equity is currency + market."],
    blocks: [
      { t: "p", text: "Gold overlay: BeES/SGB for the household; GOLDMINI for a defined-risk tactical. Do not replace the 8% BeES with a naked MCX long that can margin-call the household. That is a category error we already punished on the commodities desk." },
      { t: "p", text: "International (Nasdaq feeder, etc.) is a US-beta + dollar sleeve. When it rips, your 'India-only' identity is already false. Count it in total equity beta." },
    ],
    takeaways: ["Overlays have weights.", "Tool matches horizon.", "Foreign equity counts as equity."],
    quiz: { q: "Replacing a 10% Gold BeES overlay with 3 lots GOLDMINI on SPAN is:", options: ["The same overlay", "A category error — futures heat is not a household sleeve", "Safer", "Tax identical always"], answer: 1, why: "Margin and path are different species." },
  },
  "portfolio-06": {
    lead: "Barbell: very safe + very risky, little in the mushy middle. In practice: liquid/G-Sec ladder on one end, a small high-conviction or F&O book on the other, not 40 'medium conviction' midcaps you cannot monitor.",
    covers: ["The middle is where clutter lives.", "High conviction still has a cap in R.", "Barbell is a discipline, not an aesthetic."],
    blocks: [
      { t: "p", text: "Forty positions you check once a month is not diversification. It is neglected concentration. A barbell that is 85% boring and 15% actually watched will beat a zoo you ignore — not always in return, in survivability." },
    ],
    takeaways: ["Watchability is a constraint.", "Boring is a feature.", "Cap the spicy end."],
    quiz: { q: "Forty unmonitored midcaps labelled 'diversified' are often:", options: ["True risk parity", "Neglected concentration", "A G-Sec ladder", "A vol surface"], answer: 1, why: "What you cannot watch is a single neglected bet." },
  },
  "portfolio-07": {
    lead: "Drawdown budgets at portfolio level: the family book cannot follow a 40% path just because a momentum factor can. Pre-commit: at −12% from peak, reduce satellite; at −20%, trading book to maintenance mode.",
    covers: ["Path constraints are adult.", "Mechanically reducing is not 'selling the bottom'; it is the policy.", "Write the peak date so you know the −12%."],
    blocks: [
      { t: "p", text: "Without a written peak, you will rebase: 'this month isn't so bad'. A spreadsheet high-water mark is less romantic and more useful than a motivational clip." },
    ],
    takeaways: ["High-water mark is a cell.", "De-risk rules are pre-committed.", "Trading book dies before the core does."],
    quiz: { q: "A −12% de-risk rule exists to:", options: ["Catch the exact bottom", "Change behaviour at a pre-agreed pain, not at panic improvisation", "Beat the Nifty", "Avoid STT"], answer: 1, why: "It is a behaviour contract." },
  },
  "portfolio-08": {
    lead: "Liquidity ladder: money you need in 0–7 days, 8–90 days, 90 days–3 years, 3 years+. Putting 90-day money in a small-cap fund is how people become forced sellers.",
    covers: ["Match duration of assets to the liability.", "Emergency cash is a position.", "Forced selling is the real risk, not volatility."],
    blocks: [
      { t: "ul", items: ["0–7 days: bank + liquid fund you have actually redeemed from once.", "8–90: short debt, not credit experiments.", "90d–3y: don't use F&O or small-caps.", "3y+: equity, specials, gold overlay."] },
      { t: "p", text: "Test a liquid-fund redemption once when you don't need it. Knowing the rupees arrive is part of the ladder. A ladder you have never withdrawn from is a brochure." },
    ],
    takeaways: ["Liabilities choose the sleeve.", "Practice a redemption.", "Forced selling is the enemy."],
    quiz: { q: "Tuition due in 60 days belongs in:", options: ["A small-cap momentum fund", "Cash / short-duration, not in 3-year-plus risk assets", "Nifty weeklies", "A promoter-pledge special"], answer: 1, why: "Match the date." },
  },
  "portfolio-09": {
    lead: "A family Investment Policy Statement (IPS) in one page: goals, split, overlays, rebalance, what is forbidden (pledging core, naked weeklies above X, tips). If it is not signed — even if only by you — it will not survive a bull market.",
    covers: ["Forbidden list is the useful part.", "Review yearly or after a life event.", "The IPS outranks a hot take."],
    blocks: [
      { t: "steps", title: "One-page IPS", items: [
        "Purpose: retirement / house / just don't die poor.",
        "Split and bands.",
        "Overlays and max weights.",
        "Risk capital ceiling.",
        "Forbidden: pledge core, sell vol naked, copy Telegram, MTF on core.",
        "Review date.",
      ] },
    ],
    takeaways: ["Forbidden > clever.", "Life events trigger review.", "IPS beats a thread."],
    quiz: { q: "The most useful section of a household IPS is often:", options: ["The return target with decimals", "The forbidden list", "A photo of a yacht", "A MACD setting"], answer: 1, why: "Constraints keep you in the game." },
  },
  "portfolio-10": {
    lead: "Report to yourself quarterly like a tiny fund: performance versus the split (not versus a cousin), costs, max DD, mistakes, and whether you followed the IPS. If you cannot write a page, you do not have a process. You have a login.",
    covers: ["Benchmark the policy, not a neighbour.", "Costs and STT belong in the report.", "Three mistakes, written, beat twenty charts."],
    blocks: [
      { t: "p", text: "A quarter where you beat Nifty by taking 2× the risk is not a medal. A quarter where you matched the IPS through a drawdown is. The report trains identity: you are a process, not a P&L screenshot." },
    ],
    takeaways: ["Report vs policy.", "Include costs.", "Identity follows the report."],
    quiz: { q: "Beating Nifty with much higher heat is:", options: ["Always skill", "A different bet than the IPS — don't grade it as the IPS", "Tax fraud", "A calendar spread"], answer: 1, why: "You must grade the policy you claimed to run." },
  },

  "alts-01": {
    lead: "REITs (real estate investment trusts) listed in India let you own a slice of income-producing property without buying a floor. They are equity-like with a yield story — not a fixed deposit with a skyline photo.",
    covers: ["REITs own operating real estate vehicles.", "Distributions are not guaranteed coupons.", "Interest rates and occupancy both matter."],
    blocks: [
      { t: "p", text: "When rates rip, listed REITs can reprice like duration plus property news. When occupancy dips, the yield story is a story. Read occupancy, WALE (weighted average lease expiry), leverage, and the sponsor. A 7% distribution yield with a 9% rate world is not a mystery discount every time — sometimes it is maths." },
      { t: "callout", kind: "india", title: "SEBI-listed REITs", text: "These are regulated products with disclosures. That does not make the price a bond. It makes the PDF findable." },
    ],
    takeaways: ["REIT ≠ FD.", "Rates and occupancy.", "Sponsor and leverage are first-class."],
    quiz: { q: "A listed REIT yield of 7% when policy rates are 7% is:", options: ["A free lunch", "Not automatically cheap — duration, occupancy and growth still price", "A G-Sec clone", "Tax-free by law always"], answer: 1, why: "Yield is one number, not a verdict." },
    sources: [SEBI],
  },
  "alts-02": {
    lead: "InvITs (infrastructure investment trusts) package roads, power, telecom towers, pipelines. Cash flows can be contracted — and still face regulation, traffic, and interest. Read the concession, not the highway photo.",
    covers: ["InvITs are infrastructure cash-flow vehicles.", "Traffic/availability vs annuity structures differ.", "Leverage and refinance risk sit underneath the yield."],
    blocks: [
      { t: "p", text: "An annuity road with a decent counterparty is a different animal from a toll road whose traffic model assumed 2019 forever. If you cannot tell which you own, you own a yield number. Yield numbers are not analysis." },
    ],
    takeaways: ["Contracted ≠ risk-free.", "Know annuity vs volume.", "Refinance is a date."],
    quiz: { q: "Toll-traffic InvITs versus annuity InvITs mainly differ in:", options: ["Logo colour", "Who bears volume risk", "SEBI exemption", "Lot size"], answer: 1, why: "Volume risk is the business." },
  },
  "alts-03": {
    lead: "Sovereign Gold Bonds are a government product: gold-linked, rupee, with an interest kicker and specific tax treatment on redemption for individuals who hold to term. They are not Gold BeES and not jewellery.",
    covers: ["SGB tracks gold, pays a small coupon.", "Liquidity on exchange can be poor versus BeES.", "Hold-to-term tax treatment is a feature — confirm current law."],
    blocks: [
      { t: "p", text: "If you need to trade gold this month, BeES or a futures overlay. If you can lock a sleeve to maturity, SGB issuance windows matter. Do not buy a 2016 SGB on exchange at a wild premium just because 'SGB is always better'. Premiums exist. Maths exists." },
      { t: "p", text: "Jewellery is consumption with a gold content. Making charges are a fee you will not get back. Do not put 'jewellery' in the overlay column of an IPS." },
    ],
    takeaways: ["SGB is a hold-to-term tool.", "BeES is the liquid sleeve.", "Jewellery is not an overlay."],
    quiz: { q: "Needing gold exposure you can sell this afternoon, you reach for:", options: ["A locked SGB you cannot exit cleanly", "Gold BeES / liquid gold ETF, not jewellery", "MCX delivery", "A ULIP"], answer: 1, why: "Tool matches horizon." },
  },
  "alts-04": {
    lead: "GIFT City / IFSC is India's attempt at an onshore-offshore. Some products, funds, and access rules differ from domestic NSE cash. If you use them, read the current IFSC rule, not a 2021 thread.",
    covers: ["IFSC is a different regulatory perimeter.", "Access and tax can differ — confirm.", "Do not assume domestic F&O rules clone there."],
    blocks: [
      { t: "p", text: "This lesson exists so you do not mix GIFT-listed products into a domestic playbook without a second checklist. If you never use IFSC, you still need to know it exists so a broker's 'international' button does not surprise you." },
    ],
    takeaways: ["Different perimeter.", "Don't clone domestic rules.", "If unused, still know the door exists."],
    quiz: { q: "A GIFT City product should be booked as:", options: ["Automatically the same as NSE cash", "A separate perimeter with its own rules and tax — verify before size", "Tax-free always", "A REIT"], answer: 1, why: "IFSC is not a nickname for NSE." },
    sources: [SEBI],
  },
  "alts-05": {
    lead: "Owning US or global equities from India: LRS, feeder funds, and brokers who offer foreign stocks. You buy a market and a currency and a tax story. Count all three.",
    covers: ["LRS is a FAQs-and-limits object — verify current caps.", "Feeders add TER and tracking.", "USD up can save a bad Nasdaq year, or the reverse."],
    blocks: [
      { t: "p", text: "A Nasdaq feeder that lagged 1.4% plus a rupee move plus TER can still be the right diversifier. It is not 'the Nasdaq'. If you need the Nasdaq, know the slippage. If you need diversification, a 10% sleeve may be enough — 60% 'because US tech is the future' is an identity, not a portfolio." },
    ],
    takeaways: ["Currency is a second bet.", "TER and tracking are first-class.", "A sleeve, not a new personality."],
    quiz: { q: "A rupee depreciation year can make a flat Nasdaq feeder look:", options: ["Broken", "Better in rupees — currency was a second P&L", "Tax-exempt", "A G-Sec"], answer: 1, why: "INR P&L includes FX." },
  },
  "alts-06": {
    lead: "PMS, AIF, and unlisted 'alternatives' are sold with exclusivity. The fees, lock-ins, and manager risk are the product. If you cannot fire the manager or mark the book, you are in a relationship, not a ticker.",
    covers: ["Fee stacks compound against you.", "Lock-in is a feature of the structure.", "Due diligence is reading, not lunch."],
    blocks: [
      { t: "p", text: "A 2-and-20 on a product that buys listed large-caps is a charity to the manager. If the edge is access to something you cannot buy, pay for access. If the edge is 'our RSI is better', you can do that in a demat for cheaper." },
      { t: "callout", kind: "caution", title: "Unlisted stories", text: "Valuation of unlisted paper is a negotiation until an exit. Do not lever against a PDF mark." },
    ],
    takeaways: ["Pay for true access, not for theatre.", "Lock-in is liquidity risk.", "Don't lever a mark."],
    quiz: { q: "A PMS that only buys Nifty 50 names at 2-and-20 is usually:", options: ["Essential access", "An expensive wrapper around a public index", "A REIT", "A circuit filter"], answer: 1, why: "You can buy the index cheaper." },
  },
  "alts-07": {
    lead: "Commodities as a household sleeve versus a trading book, again, because people mix them. 5–10% gold, maybe a sliver of silver, no 'I discovered crude this week' in the IPS overlay column.",
    covers: ["Sleeve vs ticket.", "Silver is jumpy; size smaller than gold.", "Energy is usually a trade, not a household overlay."],
    blocks: [
      { t: "p", text: "If you cannot explain why the family needs a crude overlay through a 12-month quiet oil tape, you don't. Gold has a multi-century job as a non-liability of a government. Crude has a storage and decay job. Different museums." },
    ],
    takeaways: ["Gold can be a sleeve.", "Crude is usually a ticket.", "Silver: smaller than gold."],
    quiz: { q: "A 15% crude futures overlay in a household IPS is:", options: ["Conservative", "Usually a category error — energy heat is a trade", "Equivalent to SGB", "Mandatory"], answer: 1, why: "Path and roll are not household." },
  },
  "alts-08": {
    lead: "An alternatives checklist: product, regulator, liquidity, fee, tax, why it is not just a listed proxy. If a listed proxy exists at 1/5th the fee, write why you still want the wrapper.",
    covers: ["Proxy test first.", "Liquidity last, because that's when you need it.", "Regulated ≠ suitable."],
    blocks: [
      { t: "steps", title: "Alt gate", items: [
        "What listed proxy exists (BeES, REIT, index fund)?",
        "What extra am I paying (fee, lock, complexity)?",
        "What extra am I getting (access, structure, tax, skill)?",
        "Can I exit in 7 / 90 / 365 days?",
        "Who regulates, and what is the complaint path?",
        "If I cannot answer, the answer is no.",
      ] },
    ],
    takeaways: ["Proxy test.", "Exit before entry.", "Complexity is a fee."],
    quiz: { q: "If a listed ETF does 90% of the job at a fifth of the fee, an alt wrapper must:", options: ["Be bought for status", "Justify the extra 10% job in writing", "Be leveraged", "Ignore liquidity"], answer: 1, why: "Pay only for the extra." },
  },

  "systems-01": {
    lead: "A system is a rule that can fire without your mood. If it needs you to 'confirm with discretion' every time, it is not a system. It is a bias with a backtest.",
    covers: ["Rules must be executable by a tired you.", "Discretion systems are allowed — but then don't quote the backtest as gospel.", "Write skip conditions."],
    blocks: [
      { t: "p", text: "Example: 'Long Nifty future when daily close > 20 DMA, ADX > 20, risk 0.5R, stop 1.5 ATR, no trade into RBI/Budget, max 2 consecutive losers then pause 5 sessions.' That is a system. 'Buy strength' is a poster." },
      { t: "p", text: "Skip conditions are what keep systems alive: news day, you slept 4 hours, platform lag, you already have 1R on. A system without skips will drag you into the one day you should have been at a wedding." },
    ],
    takeaways: ["Executable when tired.", "Skips are rules.", "Don't quote a backtest for a discretionary mash."],
    quiz: { q: "A strategy that requires a 'feel confirm' on every signal is:", options: ["A robust system", "Discretion — don't sell it as a backtest", "HFT", "A REIT"], answer: 1, why: "The feel is the strategy." },
  },
  "systems-02": {
    lead: "Regimes: trend, range, event, crisis. A Donchian in a range is a donation. An RSI fade in a crisis melt is a donation. The advanced system is often a regime filter plus a simple child.",
    covers: ["ADX/breadth/IV as regime cameras.", "Child strategies per regime.", "When regime is unclear, size is the answer: smaller."],
    blocks: [
      { t: "table", caption: "Regime → child", headers: ["Regime", "Filter idea", "Child"], rows: [
        ["Trend", "ADX rising, price vs DMA", "Pullback / channel"],
        ["Range", "ADX low, VWAP mean", "Fade extremes, tight stops"],
        ["Event", "Calendar", "Defined-risk or flat"],
        ["Crisis", "Gaps, IV shock, correlation 1", "Maintenance, hedges, no heroes"],
      ] },
      { t: "p", text: "You will mis-tag regimes. That's why size falls when tags disagree. Three cameras green → full child size. One green → half or skip." },
    ],
    takeaways: ["Regime first.", "Unclear → smaller.", "Crisis is a mode, not a buy-the-dip reflex."],
    quiz: { q: "ADX 16 and a Supertrend flip every day suggests:", options: ["A holy trend system", "Range — the trend child should be off", "A Fed put", "A buyback"], answer: 1, why: "Whipsaw is the range tax." },
  },
  "systems-03": {
    lead: "Robustness: if changing a 20 DMA to 21 destroys the edge, you did not have an edge. You had a fit. Walk-forward, simple parameters, and out-of-sample years are hygiene.",
    covers: ["Sensitivity tables.", "Walk-forward versus a single split.", "Costs and skipped days in the test."],
    blocks: [
      { t: "p", text: "Build 2016–2020, validate 2021, hold out 2022–2024, then paper 90 days. If the equity curve only exists in 2017 momentum, you found 2017. Add realistic STT, spread, and 'I would have skipped this because I was at a wedding'. That skip rate is part of live expectancy." },
      { t: "callout", kind: "caution", title: "Multiple testing", text: "Tried 80 combinations, picked the winner? That winner is guilty until a new sample agrees. See the AI track — leakage and overfitting are cousins." },
    ],
    takeaways: ["Simple parameters live longer.", "Hold-out is not optional.", "Live skip rate belongs in expectancy."],
    quiz: { q: "A rule that only works at length 17 and 19, not 16 or 20, is usually:", options: ["A precise law of nature", "A fit — treat as fragile", "SEBI-approved", "A calendar spread"], answer: 1, why: "Knife-edge parameters are a smell." },
  },
  "systems-04": {
    lead: "Live versus backtest: slippage, missed fills, fat-finger, and your own non-compliance. A 1.4R backtest expectancy can be 0.3R live before you even discuss alpha decay.",
    covers: ["Log every skipped and broken rule.", "Compare live to backtest monthly.", "Alpha decay is allowed; denial is not."],
    blocks: [
      { t: "p", text: "If live is worse, first assume you. Then assume costs. Then assume the edge moved. In that order. Tweaking the DMA from 20 to 18 in week two of going live is how you never have a sample." },
    ],
    takeaways: ["You are the first slippage.", "Don't retune in week two.", "Decay happens — measure it."],
    quiz: { q: "First explanation of live underperforming a backtest:", options: ["The universe is unfair", "Operator error and costs — before retuning", "Need more indicators", "Delete the stop"], answer: 1, why: "You and the costs come before a new RSI." },
  },
  "systems-05": {
    lead: "Position sizing inside systems: fixed R, volatility targeting, or a Kelly-capped fraction. Mixing 'this signal feels strong so 3×' without a written multiplier is how systems die.",
    covers: ["Feel-multipliers need a definition (e.g. ADX band).", "Vol targeting keeps heat stable when ATR doubles.", "Cap at a max lots regardless of Kelly."],
    blocks: [
      { t: "formula", expr: "Lots ≈ (R rupees) / (stop in rupees per lot)", meaning: "Still the spine. Vol targeting adjusts R or stop as ATR changes so you don't accidentally 2× heat in a violent month." },
      { t: "p", text: "Kelly is an upper bound, not a lifestyle. Half-Kelly or a 0.5R fixed with a heat cap will bore you and keep you solvent. Boring is the point." },
    ],
    takeaways: ["Written multipliers only.", "Vol targeting stabilises heat.", "Kelly is a ceiling."],
    quiz: { q: "ATR doubles and you keep the same lots and tick-stop. Heat has:", options: ["Stayed the same", "Roughly doubled — the system silently levered", "Vanished", "Become a REIT"], answer: 1, why: "Stop in rupees grew; lots didn't shrink." },
  },
  "systems-06": {
    lead: "Portfolio of systems: uncorrelated children (trend Nifty, mean-revert stocks, defined-risk vol, specials) with a combined heat cap. Two trend systems on Nifty and Bank Nifty are one system in a crash.",
    covers: ["Correlation of P&L, not of names.", "A crash correlator: assume 1 when scared.", "Turn systems off; don't just add."],
    blocks: [
      { t: "p", text: "If three strategies all die on a gap-down Monday, they were one bet. A combined −4R Monday needs a cap that forbids that stack. The cap is the fourth strategy: the meta-system." },
    ],
    takeaways: ["P&L correlation is the truth.", "Crashes correlate books.", "Meta-cap is a system."],
    quiz: { q: "Nifty trend + Bank Nifty trend + Nifty momentum factor in a crash are often:", options: ["Three independent alphas", "One beta wearing three hats", "A bond ladder", "Negatively correlated by law"], answer: 1, why: "They all own India-up." },
  },
  "systems-07": {
    lead: "Execution of systems: same as the microstructure playbook, plus 'no discretion to chase a missed signal'. Missed is missed. The next bar is a new world.",
    covers: ["Chasing a missed breakout is a new strategy.", "Time-stamped signals.", "Platform failure is a skip, not a hero fill at 10:12."],
    blocks: [
      { t: "p", text: "Signal at 9:21, you were in a meeting, you buy at 9:48 +0.8 ATR away. That was not the system. Journal it as 'broke rule' or don't take it. Systems fail when you 'make up' fills." },
    ],
    takeaways: ["Missed ≠ chase.", "Timestamp the fire.", "Outage = skip."],
    quiz: { q: "A breakout you noticed 40 minutes late should be:", options: ["Chased at any price", "Skipped or re-qualified under a written late-entry rule", "Doubled", "Hedged with jewellery"], answer: 1, why: "Late is a different trade." },
  },
  "systems-08": {
    lead: "Research pipeline: idea → specification → in-sample → out-of-sample → paper → tiny live → scale. Skipping to 'tiny live' because the idea is exciting is how exciting ideas debit the account.",
    covers: ["A spec document of one page.", "Paper trading with real fills, not with wishes.", "Scale only on a sample, not on a week."],
    blocks: [
      { t: "steps", title: "Pipeline", items: [
        "Write the rule as if a stranger must run it.",
        "Backtest with costs and skips.",
        "Hold-out years.",
        "Paper 20–40 live signals.",
        "Tiny live (0.25R) for another 20.",
        "Scale toward 0.5–1R only if compliance > 90% and live expectancy not a joke.",
      ] },
    ],
    takeaways: ["Pipeline is the product.", "Paper with honest fills.", "Scale is earned."],
    quiz: { q: "Going full size after five lucky live winners skips:", options: ["Nothing important", "Sample size, compliance proof, and the paper stage", "Only STT", "The Fed"], answer: 1, why: "Five is not a distribution." },
  },
  "systems-09": {
    lead: "When to retire a system: edge gone, compliance gone, life gone (you cannot run it), or the market structure changed (expiry rules, tick size, STT). Nostalgia is not a Greek.",
    covers: ["Pre-commit retirement metrics.", "Structure changes are first-class.", "You can keep a system in a museum."],
    blocks: [
      { t: "p", text: "If weekly expiry style changes, a Tuesday-theta Nifty system is a new animal (it already did, in Nov 2024). If STT on options jumps (it did in 2024 and 2026), short-vol expectancy must be recomputed, not 'felt'. Retire, retune on a new sample, or reduce. Do not pray." },
    ],
    takeaways: ["Write retirement rules.", "Law and microstructure can kill edges.", "Museum > zombie."],
    quiz: { q: "After a statutory cost shock, a short-premium system should:", options: ["Run unchanged, theta is sacred", "Recompute expectancy on the new costs or stand down", "Double lots to compensate", "Move to jewellery"], answer: 1, why: "Costs are in the edge." },
  },
  "systems-10": {
    lead: "A systems desk in one page: list of children, regime tag, heat per child, combined cap, compliance %, last review date. If this page is ugly and used, it is better than a beautiful unused wiki.",
    covers: ["Ugly and used.", "Compliance % is a KPI.", "Review monthly, retune rarely."],
    blocks: [
      { t: "p", text: "Creative? The creativity is restraint. Anyone can add a 17th oscillator. Few can run three boring children with a cap for a year. That is the whole sport at the advanced level." },
    ],
    takeaways: ["Restraint is the craft.", "Compliance is a KPI.", "Retune rarely."],
    quiz: { q: "The advanced skill in systematic trading is mostly:", options: ["More indicators", "Running simple children with caps and honest retirement", "Predicting Nifty to the point", "Avoiding all losses"], answer: 1, why: "Operation beats ornament." },
  },

  "hedging-01": {
    lead: "A hedge exists to transfer a named risk. If you cannot name the risk in one sentence, you bought a second position that happens to be short something.",
    covers: ["Named risk: beta, FX, oil, event, gap.", "Hedge ratio is maths.", "Basis risk is the leftover."],
    blocks: [
      { t: "p", text: "'I'm long a book of midcaps so I short 1 Nifty lot' is a gesture. Ratio = (value × beta) / futures notional. Then admit basis: midcaps can dump while Nifty holds. The leftover is your real risk. Either live with it or hedge with a midcap proxy, or reduce the cash book." },
      { t: "formula", expr: "Lots ≈ (portfolio value × β) / (index × lot)", meaning: "β from a window that just ended. Re-estimate. A β of 1.1 from 2021 is not a law." },
    ],
    takeaways: ["Name the risk.", "Ratio is not '1 lot'.", "Basis remains."],
    quiz: { q: "Shorting 1 Nifty lot against ₹2 crore of high-beta midcaps is:", options: ["A full hedge", "Usually undersized and basis-laden — compute the ratio", "Illegal", "A covered call"], answer: 1, why: "Notional and beta decide lots." },
  },
  "hedging-02": {
    lead: "Index overlay with futures is the cheapest beta tap. It is also a daily MTM cash machine. If the cash book cannot stand the MTM of the hedge, the hedge will be pulled at the worst print.",
    covers: ["MTM cash is real.", "Roll cost in contango is a fee.", "Do not overlay with options if you needed a futures hedge and vice versa."],
    blocks: [
      { t: "p", text: "Long cash, short Nifty futures into a rally: you bleed MTM while the cash marks up (on paper). People lift the hedge because 'it's losing' — and then own full beta into the reversal they originally feared. The hedge P&L is supposed to hurt when the book is fine." },
    ],
    takeaways: ["Hedge P&L pain is often success.", "Fund the MTM.", "Don't lift at the worst mark."],
    quiz: { q: "A short-Nifty overlay losing money while your cash book rips usually means:", options: ["The hedge is broken", "The hedge is doing the beta job — lifting it restores the risk you sold", "SEBI error", "IV crush"], answer: 1, why: "Offsetting P&L is the point." },
  },
  "hedging-03": {
    lead: "Protective puts and collars: insurance with a bill. A 3-month 5% OTM put on Nifty as a book hedge is a TER. If you cannot afford the TER, you cannot afford that insurance — cut the book instead.",
    covers: ["Put = premium paid for a floor.", "Collar = sell call to fund put; cap the upside.", "Rolling insurance is a budget, not a one-off."],
    blocks: [
      { t: "example", title: "Collar arithmetic", body: "Long a Nifty-like book at 24,100. Buy 23,600 3-month PE, sell 24,800 CE, net debit ₹20. Floor and cap are now known. You will hate the cap in a melt-up. That hate is the fee. If you cannot stand the cap, don't sell the call — pay the put or reduce beta." },
      { t: "p", text: "Weekly puts as 'insurance' are usually just short-theta's opposite: expensive churn. Match insurance tenor to the fear's tenor. A Budget week might deserve a week. A six-month geopolitical fear deserves a month+ or a smaller book." },
    ],
    takeaways: ["Insurance has a TER.", "Collars cap the good days.", "Match tenor to the fear."],
    quiz: { q: "Funding a protective put by selling a close call creates:", options: ["Free insurance", "A collar — upside is capped on purpose", "Unlimited upside", "Zero basis"], answer: 1, why: "You sold the melt-up to pay for the floor." },
  },
  "hedging-04": {
    lead: "Importer/exporter FX hedges on USDINR, and commodity input hedges on MCX, are corporate tools that traders copy badly. Copy the named risk, not the lot count of a company 40× your size.",
    covers: ["Hedge the invoice, not a view.", "Tenor matches the payable/receivable.", "Overhedging is a spec."],
    blocks: [
      { t: "p", text: "A company with a $2m payable in 90 days buying USDINR futures for $2m is a hedge. You buying 20 lots because 'rupee looks weak' is a spec. If you want the spec, call it a spec on the commodities desk and size the heat. Don't call it 'like the corporates'." },
      { t: "p", text: "Overhedging (hedging $3m on a $2m bill) is a directional bet on the leftover million. Finance teams get fired for that. You can fire yourself earlier." },
    ],
    takeaways: ["Invoice defines size.", "Overhedge = spec.", "Name it honestly."],
    quiz: { q: "Hedging $3m of USDINR when the payable is $2m is:", options: ["Prudent extra", "A $1m spec on top of a $2m hedge", "Required by RBI always", "A REIT"], answer: 1, why: "The extra million is a view." },
  },
  "hedging-05": {
    lead: "Event hedges: defined-risk structures around results, Budget, RBI. The hedge should die when the event dies. A 'hedge' you still own three weeks later is a leftover position.",
    covers: ["Calendar the removal.", "Defined risk so the hedge cannot become the book.", "Do not stack three event hedges that are the same Nifty short."],
    blocks: [
      { t: "p", text: "Budget put spread, RBI put spread, and 'geopolitical' put spread on the same Nifty, all 1 lot, is 3 lots of one bet. Correlation 1 on the event Monday. Combined shock cell, please." },
    ],
    takeaways: ["Remove after the event.", "Don't stack clones.", "Defined risk on the hedge itself."],
    quiz: { q: "Three 'different' Nifty put hedges into the same week are:", options: ["Diversified", "Often one bet — sum the shock", "Legal alpha", "Duration"], answer: 1, why: "Same underlying, same week." },
  },
  "hedging-06": {
    lead: "Gap risk cannot be perfectly hedged overnight in Indian cash. You can cut size, own puts, or be flat. Pretending a 9:15 market order is a hedge of the 2am print is a category error.",
    covers: ["Overnight is a different market.", "Puts before the close are the on-exchange gap tool.", "Size is the hedge of last resort."],
    blocks: [
      { t: "p", text: "If FOMC is at 1:30am IST and you are max long Nifty futures, your hedge was yesterday's cut or yesterday's put. Today's hope is not a hedge." },
    ],
    takeaways: ["Gap tools: size, puts, flat.", "After-close you cannot click Nifty.", "Hope is not a Greek."],
    quiz: { q: "The on-exchange tool for a known overnight event is usually:", options: ["A 9:16 market order plan", "Smaller size and/or puts bought before the close", "A tweet", "Jewellery"], answer: 1, why: "You will be closed." },
  },
  "hedging-07": {
    lead: "Tail hedges: rarely, small, and allowed to expire worthless most years. If a tail hedge 'makes money every quarter', it wasn't a tail hedge. It was a short-term short.",
    covers: ["Cheap tails are not always cheap in IV.", "Budget the premium as a TER.", "Don't sell the tail because this year was quiet."],
    blocks: [
      { t: "p", text: "Far OTM Nifty puts as a 0.2% of NAV yearly spend can be rational for a family that would otherwise panic-sell the core. They will expire worthless often. That is the insurance working, not 'wasted'. If you cannot stand waste, cut the core instead — that is also a hedge." },
    ],
    takeaways: ["Tails should usually expire dead.", "Budget them.", "Quiet years are not a refund."],
    quiz: { q: "A tail put that expires worthless most years is:", options: ["Proof insurance is stupid", "Normal — like fire insurance on a house that did not burn", "A SEBI violation", "A calendar you must roll into a strangle"], answer: 1, why: "Insurance is a spend, not a profit centre." },
  },
  "hedging-08": {
    lead: "A hedge register: risk named, instrument, ratio, cost, review date, kill. If the hedge is only in your head, it will be lifted when it works (hurts) and kept when it doesn't.",
    covers: ["Write the hurt as success.", "Review dates prevent zombie hedges.", "Net beta after hedges is a cell on the IPS."],
    blocks: [
      { t: "steps", title: "Register row", items: [
        "Risk named (beta / FX / oil / event / tail).",
        "Instrument and expiry.",
        "Ratio maths.",
        "Max cost and shock.",
        "Review / kill date.",
        "What 'hurting' looks like when it works.",
      ] },
    ],
    takeaways: ["Register or it isn't a hedge.", "Hurting can be success.", "Net beta is visible."],
    quiz: { q: "Lifting a short-Nifty overlay because its MTM is red during a rally is:", options: ["Tactical brilliance always", "Often destroying the hedge at the moment it is paying the book", "Required by SPAN", "A REIT move"], answer: 1, why: "That red MTM is the beta you sold." },
  },

  "options-13": {
    lead: "Conversion and reversal: synthetic futures made from options plus cash. Put-call parity is not a slogan; it is an arb boundary. When it looks 'off', costs, dividends, and bans are usually the explanation — not a free mint.",
    covers: ["C + PV(K) ≈ P + S (European, simplified).", "Indian stock options have dividends and early-exercise wrinkles.", "If parity looks wide, look at borrow, ban, and fees first."],
    blocks: [
      { t: "formula", expr: "C − P ≈ F discounted − K terms", meaning: "The difference between call and put at the same strike wants to look like a forward. If it doesn't, someone is paying for a constraint you may not see." },
      { t: "p", text: "Do not run conversions in a ₹5 lakh account. The edge after STT and slippage is a professional-width thing. The lesson is to understand why your long call + short put is a synthetic long future — so you don't accidentally double a beta." },
    ],
    takeaways: ["Parity is a boundary.", "Synthetics duplicate futures.", "Wide parity is often a constraint, not a gift."],
    quiz: { q: "Long call + short put at the same strike is roughly:", options: ["A straddle", "A synthetic long forward / futures-like beta", "A REIT", "Zero risk"], answer: 1, why: "Parity makes a synthetic underlying." },
  },
  "options-14": {
    lead: "Weekly expiry as a game: pin, charm, dealer inventory, and the last two hours. If you do not have a role — pin participant, fade the scramble, or flat — expiry afternoon will assign you one. Nifty weekly: Tuesday (NSE, from 28 Nov 2024). Sensex weekly: Thursday (BSE). Confirm the live contract.",
    covers: ["Charm bleeds delta as time dies.", "Pin is a hypothesis, not a law.", "Last-two-hours liquidity is not your friend if you are sizing then."],
    blocks: [
      { t: "p", text: "Dealers short gamma into a magnet strike will buy dips and sell rips near it — until they don't, because they flattened. Trading 'max pain' as a destination in the last hour without seeing whether OI is still there is folklore. See the positioning track, then come back and pick a role." },
      { t: "example", title: "Role card", body: "Flat by 14:30 unless I am a defined-risk pin butterfly sized to 0.4R, kill at 15:20. That is an expiry. 'Let's see if it pins' is not." },
    ],
    takeaways: ["Pick an expiry-day role.", "Pain is not a duty.", "Don't size in the scramble.", "Nifty weekly is Tuesday until a circular says otherwise."],
    quiz: { q: "Max pain at 24,000 with OI already unwound at 14:10 means:", options: ["Spot must pin", "The magnet may have left the building — check live OI", "You must sell both wings", "VIX is 0"], answer: 1, why: "Pain without OI is a ghost." },
  },
  "options-15": {
    lead: "Broken-wing butterflies and jade-lizard-style credit structures exist to bias a defined-risk shape toward a side. They are still defined (if you structure them so) — they are not 'income'.",
    covers: ["Broken wing: skip a symmetric wing to cheapen or bias.", "You trade a residual directional leak on purpose.", "Draw the payoff; don't buy a nickname."],
    blocks: [
      { t: "p", text: "A nickname is not a risk system. If the broken wing leaves you with naked-ish residual on one side, you found a fancy short. ABC's rule: if you cannot bound the loss in rupees on a 1-lot card, it does not go in a 'defined' column." },
    ],
    takeaways: ["Draw it.", "Nicknames aren't bounds.", "Residual leak must be sized."],
    quiz: { q: "If a 'defined' structure has unbounded loss on one side, it belongs in:", options: ["The defined column anyway", "The undefined book — nickname or not", "Tax-free", "SGB"], answer: 1, why: "The payoff is the truth." },
  },
  "options-16": {
    lead: "Poor man's covered call (diagonal long deep ITM call, short near call) is a capital-light covered-call mimic. It still has assignment, roll, and IV risk. It is not a covered call on stock.",
    covers: ["Deep ITM long call ≈ synthetic stock with less capital and more Greek mess.", "Short near call is the 'cover'.", "Early assignment and rolls are the work."],
    blocks: [
      { t: "p", text: "In India, stock options liquidity at deep ITM can be ugly. If the long call's spread is 8 points, your 'capital light' edge just paid a toll. Prefer names where the ITM actually trades, or don't mimic US PMCC Twitter on a midcap." },
    ],
    takeaways: ["It's a diagonal, not stock.", "Liquidity at ITM is the toll.", "Rolls are the job."],
    quiz: { q: "A PMCC is closest to:", options: ["A cash G-Sec", "A diagonal that mimics a covered call with extra Greek risk", "A futures calendar", "A REIT annuity"], answer: 1, why: "Long option + short nearer option." },
  },
  "options-17": {
    lead: "Assignment and exercise on Indian stock options can surprise people who thought 'I'll just let it expire'. Know cash-settled index versus physically settled stock. Know pin risk on a short ITM stock call into a dividend.",
    covers: ["Index options: cash settled.", "Stock options: delivery exists.", "Dividends + short calls = a known trap."],
    blocks: [
      { t: "p", text: "Short a stock call that goes ITM into a dividend: you can be assigned, owe the stock, miss the dividend mechanics you didn't model. If that sentence is fuzzy, do not short ITM stock calls into record dates. Flatten or roll." },
    ],
    takeaways: ["Product settlement is the law.", "Dividend + short call is a circular.", "Don't 'let it expire' on a short stock option you haven't modelled."],
    quiz: { q: "Short ITM stock calls into a dividend without a plan is:", options: ["Free theta", "Assignment and corporate-action risk", "Cash-settled always", "A bulk deal"], answer: 1, why: "Stock options can deliver." },
    sources: [NSE],
  },
  "options-18": {
    lead: "An advanced options journal has Greeks at entry and exit, not just P&L. Delta, vega, theta, IV, and the shock cell. Without that, you cannot tell whether you made money the way the ticket intended.",
    covers: ["P&L attribution: delta vs vega vs theta.", "If you made money on delta while selling vol, you were a directional trader in a vol hat.", "That is allowed — if you admit it."],
    blocks: [
      { t: "p", text: "You sold a condor, Nifty trended, you lost on delta more than you made on theta, IV was quiet. That was a failed direction bet wearing a condor. Next time either delta-hedge, choose a directional vertical, or skip. The journal forces the honesty. The nickname 'income' hides it." },
    ],
    takeaways: ["Attribute P&L.", "Hats off.", "Shock cell stays."],
    quiz: { q: "A short condor that loses because spot trended while IV was quiet is mainly a miss on:", options: ["Vega", "Delta / location — you were directional", "STT only", "Demat"], answer: 1, why: "Quiet IV and a trend is a delta problem." },
  },

  "risk-09": {
    lead: "Gap risk is the risk that the next print is not next to the last one. Stops in the book do not exist between 15:30 and 9:15. Size and options are the tools; hope is not.",
    covers: ["Overnight is a hole in the stop.", "Events in the hole are a calendar.", "A guaranteed-fill stop is a fantasy after a gap."],
    blocks: [
      { t: "p", text: "Stop at 23,980, open 23,820. You did not get 23,980. You got 23,820 plus slippage. If that is −2.4R, the system was not 1R. It was 1R on quiet days and 2.4R on gap days. Average them like an adult or cut size into known holes." },
    ],
    takeaways: ["Stops don't work closed.", "Gap days dominate averages.", "Calendar the holes."],
    quiz: { q: "A stop in the book overnight is:", options: ["A guaranteed 1R", "An instruction that may fill at the next live price, which can be through the stop", "A SEBI insurance", "A REIT"], answer: 1, why: "Gaps skip the price." },
  },
  "risk-10": {
    lead: "Liquidity risk: the exit is part of the entry. A 4R theoretical edge in a name where 1 lot of futures is the whole open interest is a joke. Haircut size for days-to-exit.",
    covers: ["Days-to-exit at X% of volume.", "F&O ban is a liquidity event.", "Illiquid options: the spread is the stop."],
    blocks: [
      { t: "formula", expr: "Days to exit ≈ position / (k × typical daily volume)", meaning: "Pick a k you won't be (say 10% of volume). If days-to-exit is 7, your 'tactical 2-day trade' is a fiction." },
    ],
    takeaways: ["Exit is a sizing input.", "Spreads can be the whole stop.", "Ban list = liquidity shock."],
    quiz: { q: "If one lot is 30% of an option's typical day volume, a 4-lot 'tactical' is:", options: ["Fine", "A liquidity fantasy — you are the event", "Required", "A G-Sec"], answer: 1, why: "You cannot leave without moving it." },
  },
  "risk-11": {
    lead: "A kill switch is a pre-committed halt: −3R day, −6R week, 4 rule-breaks, platform lag, body not slept. It is not a mood. It is a fuse.",
    covers: ["Write the fuse before the fire.", "A kill switch that you negotiate is not a switch.", "Restart criteria too — not 'next impulse'."],
    blocks: [
      { t: "ul", items: ["−3R day: flat, no new risk, walk.", "−6R week: reduce size 50% next week or off.", "4 broken rules in 10 trades: off the system until a written review.", "Sleep < 5 hours: no F&O.", "Restart: next session after a written note, not after a 'sure thing'. "] },
    ],
    takeaways: ["Fuses are numbers.", "No negotiating the fuse.", "Restart is written."],
    quiz: { q: "Negotiating a −3R kill because 'the next trade will fix it' is:", options: ["Resilience", "How fuses fail — the switch was theatre", "Kelly-optimal", "Required by SPAN"], answer: 1, why: "The next trade is the fire." },
  },
  "risk-12": {
    lead: "VaR and CVaR are languages for 'how bad is a bad day' on a book. They are not a stop. A 1-day 99% VaR of ₹1.2 lakh means nothing if your gap risk lives in the 1%. Use them as conversation, not as a talisman.",
    covers: ["VaR is a quantile, not the worst.", "CVaR (expected shortfall) looks into the tail.", "India gaps can sit outside a 1-year sample."],
    blocks: [
      { t: "p", text: "If you run a tiny book, a shock cell (±2% Nifty, IV +8) is a better daily tool than a VaR engine you don't understand. If you run a family office-sized book, learn both. Don't print a VaR from a vendor and ignore the shock cell." },
    ],
    takeaways: ["VaR ≠ worst case.", "Shock cells for small books.", "Samples miss new gaps."],
    quiz: { q: "A 99% 1-day VaR does not include:", options: ["Typical quiet days", "The worst 1% of days — which is where gaps live", "STT", "Theta"], answer: 1, why: "VaR stops at the quantile." },
  },

  "desk-09": {
    lead: "A pre-market ritual that fits in 12 minutes: calendar, overnight six, levels, OI snapshot, 'do I trade?'. If your pre-market is 90 minutes of YouTube, you are warming up the wrong muscle.",
    covers: ["Time-box it.", "Output is a yes/no and a size.", "No new indicators at 9:05."],
    blocks: [
      { t: "steps", title: "12-minute open", items: [
        "Calendar: RBI, results, US, India data (2 min).",
        "Overnight six from the macro page (2 min).",
        "Nifty / BN levels, VWAP plan (3 min).",
        "OI walls / PCR glance (2 min).",
        "Write: trade / reduce / flat, and max R today (3 min).",
      ] },
    ],
    takeaways: ["Time-box.", "Output is size.", "No new toys at 9:05."],
    quiz: { q: "Adding a new indicator at 9:08 is:", options: ["Preparation", "Usually improvisation — ritual should be frozen", "Required", "A hedge"], answer: 1, why: "The ritual is a freeze." },
  },
  "desk-10": {
    lead: "Post-market: 10 minutes to journal fills, shortfall, mood, and whether the ticket matched the ritual. Tomorrow's edge is in today's notes, not in today's P&L screenshot.",
    covers: ["Fills and shortfall first.", "Mood tag: tilt / bored / sharp.", "One screenshot of P&L is not a journal."],
    blocks: [
      { t: "p", text: "If you only journal winners, you are building a museum of luck. Force two losers onto the page. The brain will resist. That resistance is the lesson." },
    ],
    takeaways: ["Losers on the page.", "Mood is a tag.", "Shortfall column."],
    quiz: { q: "A journal of only winning screenshots is:", options: ["Professional", "A bias machine — force the losers onto the page", "SEBI-compliant", "A VaR"], answer: 1, why: "Selection bias is a strategy killer." },
  },
  "desk-11": {
    lead: "Event calendar as a shared desk object: Budget, RBI, CPI, results of names you hold, US FOMC, MCX expiries. Colour: no-trade / defined-only / normal. If it lives in your head, it will be forgotten on the one Thursday that matters.",
    covers: ["Colour-code days.", "MCX and NSE expiries both belong.", "Share it with anyone who can size your account (including you tomorrow)."],
    blocks: [
      { t: "p", text: "Put the calendar on the same wall as the kill switch. They are cousins." },
    ],
    takeaways: ["Calendar is a control.", "Colour beats memory.", "Expiries included."],
    quiz: { q: "A 'normal' size day that is also FOMC night should have been coloured:", options: ["Normal, it's US not India", "At least defined-only / gap-aware — you are closed overnight", "Mandatory max long", "SGB day"], answer: 1, why: "You cannot hedge at 2am." },
  },
  "desk-12": {
    lead: "Playbook versioning: v1.4 of the Nifty pullback system, date, what changed, why. If you change a stop from 1.5 ATR to 1.2 because of two losers, that is a new version — or it is tinkering. Call it.",
    covers: ["Changes need a reason and a review date.", "Don't stealth-edit.", "Old versions go to the museum, not into live mash."],
    blocks: [
      { t: "p", text: "Creativity on a desk is controlled mutation: one change, a sample, a keep/kill. Ten silent mutations is how you never know what you run." },
    ],
    takeaways: ["Version or it didn't happen.", "One mutation at a time.", "Museum the rest."],
    quiz: { q: "Changing three parameters after two losers without a version note is:", options: ["Agile", "Tinkering — you no longer have a sample", "Walk-forward", "A collar"], answer: 1, why: "The system identity broke." },
  },

  "strategies-13": {
    lead: "When not to adjust: most adjustments are a new trade with the old name. If the original ticket's invalidation printed, flattening is the adjustment. Adding wings because you 'don't want to lose' is how condors become identities.",
    covers: ["Invalidation first.", "An add is a new R.", "Don't morph a defined trade into an undefined one to avoid a 1R loss."],
    blocks: [
      { t: "p", text: "Short condor, spot through the short strike, you buy a further wing 'to repair'. You just paid, widened, and maybe left a naked residual. That can be valid as a new defined trade with a new shock cell. It is invalid as denial." },
    ],
    takeaways: ["Flatten is an adjustment.", "Repairs need a new card.", "Don't undefine a defined book."],
    quiz: { q: "Turning a defined condor into a naked short to 'avoid the loss' is:", options: ["Repair", "A new, worse risk — usually forbidden by the IPS", "Theta magic", "Required"], answer: 1, why: "You changed species to dodge 1R." },
  },
  "strategies-14": {
    lead: "Expiry-week verticals versus monthlies: weeklies are gamma and pin; monthlies are slower vega. Matching the structure to the week is the whole 'advanced strategies' skill that nicknames skip.",
    covers: ["Weekly vertical = location bet with little time.", "Monthly vertical = location + vol path.", "Don't sell weekly credit if you needed monthly vega."],
    blocks: [
      { t: "p", text: "A 15-day view does not belong in a 2-day weekly just because 'theta is faster'. Faster theta is faster gamma. You were not paid to be a pin tourist unless that was the view." },
    ],
    takeaways: ["Horizon matches expiry.", "Weekly credit is gamma work.", "Monthlies still die; they just die slower."],
    quiz: { q: "A two-week directional view is usually a better fit for:", options: ["A 0–2 day weekly credit strangle", "A vertical in an expiry that actually contains the two weeks", "A REIT", "A 3-year SGB"], answer: 1, why: "Contain the view in the contract." },
  },
  "strategies-15": {
    lead: "Ratio spreads bite when the naked leftover runs. A 1×2 call ratio is a defined-looking picture until the melt-up. If you cannot bound it, it is not a 'spread' in the ABC sense.",
    covers: ["Count the leftover lots.", "Shock the unbounded side.", "Prefer broken-wing defined over ratios until the journal is long."],
    blocks: [
      { t: "example", title: "1×2", body: "Buy 1× 24,200 CE, sell 2× 24,400 CE. Looks cute until 24,700. The second short is a runner. Shock cell at +3% must be a number you can stand — or don't click." },
    ],
    takeaways: ["Leftover lots are the trade.", "Shock the runner.", "Defined > cute ratios for most books."],
    quiz: { q: "A 1×2 call ratio's hidden species is often:", options: ["A G-Sec", "A short extra call — unbounded on a melt-up", "A collar", "A liquid fund"], answer: 1, why: "The extra short is naked-ish." },
  },
  "strategies-16": {
    lead: "Strategy selection is a table, not a personality. View (up / down / range / jump), horizon, vol (cheap/rich), and 'defined only?'. The table picks the family; you pick the strikes from the chain.",
    covers: ["View × vol → family.", "Defined-only is a column, not a preference you drop when bored.", "If two families fit, pick the one you can execute."],
    blocks: [
      { t: "table", caption: "Family picker (sketch)", headers: ["View", "Vol cheap", "Vol rich"], rows: [
        ["Up", "Long call / call debit spread", "Call debit still, or covered / CSP if you want stock"],
        ["Down", "Long put / put debit", "Put debit, or defined bear credit if you really must sell"],
        ["Range", "Calendar / fly (careful)", "Iron condor / iron fly defined"],
        ["Jump", "Long straddle/strangle", "Verticals / skip short vol"],
      ] },
      { t: "p", text: "The creativity is in the discipline of using the table when you are excited. Excitement wants a nickname. The table wants a family." },
    ],
    takeaways: ["Table first.", "Defined-only holds under excitement.", "Executable beats exotic."],
    quiz: { q: "Vol rich + range view most cleanly maps to:", options: ["Naked short strangle immediately", "Defined range-selling (iron condor/fly) if the shock cell passes", "Long straddle", "A buyback"], answer: 1, why: "Rich vol + range = defined sale, not a naked identity." },
  },

  "futures-09": {
    lead: "Calendar spreads in futures (near versus next) trade the roll, not the headline direction. Contango bleeds the long-near; backwardation is another animal. Index and commodity calendars are different weather.",
    covers: ["You are long the spread, not the bull story.", "Roll yield is a P&L.", "Expiry week of the near is the work."],
    blocks: [
      { t: "p", text: "Long gold near / short next is a different ticket from long gold. If you 'just want gold' you want BeES or a fully funded future you will roll on a rule. If you want the spread, write the spread." },
    ],
    takeaways: ["Calendars are rolls.", "Don't confuse with outright.", "Near expiry is the job."],
    quiz: { q: "Long near crude, short next, is primarily:", options: ["A full bullish crude book", "A calendar / roll view", "A REIT", "A covered call"], answer: 1, why: "Net crude beta may be small." },
  },
  "futures-10": {
    lead: "SPAN + exposure is a daily conversation. A quiet book can need more cash after a vol-up day without you adding a lot. If you are always at 90% of available margin, you are one SPAN hike from a forced square-off.",
    covers: ["Margin is not the risk; it is the collateral.", "Keep a cash buffer above SPAN.", "Forced square-off is a strategy the broker runs on you."],
    blocks: [
      { t: "p", text: "Buffer: if SPAN on the book is ₹4 lakh, keep ₹6–7 lakh related to that book, not ₹4.05. The extra is not inefficiency. It is how you avoid the broker's strategy." },
    ],
    takeaways: ["Buffer is part of size.", "SPAN can jump.", "Don't let the broker trade your book."],
    quiz: { q: "Sitting at 95% of available margin means:", options: ["Optimal Kelly", "A SPAN hike can force the broker's square-off on you", "Zero risk", "A bulk deal"], answer: 1, why: "You left no buffer." },
  },
  "futures-11": {
    lead: "Stock futures versus index futures: stock futures carry borrow, corporate actions, and ban-list drama. Index futures are cleaner beta. Use stock futures when you have a name view that options cannot express cleanly — and you can survive the ban.",
    covers: ["Ban list is a hard constraint.", "Basis on stock futures can be the whole trade.", "Index is the default hedge tool."],
    blocks: [
      { t: "p", text: "If the name is in ban, you cannot add. A 'I'll average the short future' plan is illegal in the only sense that matters: the exchange will not let you. Plan the add before ban, or don't plan an add." },
    ],
    takeaways: ["Index for beta.", "Stock futures for names, with ban risk.", "No averaging into ban."],
    quiz: { q: "A stock future entering the F&O ban list means you:", options: ["Must average", "Cannot increase the position — square or hold", "Get free SPAN", "Convert to SGB"], answer: 1, why: "Ban is a constraint." },
    sources: [NSE],
  },
  "futures-12": {
    lead: "Extreme days: circuit on the index, liquidity holes, basis blowing out. The professional plan is pre-committed: flatten discretionary, keep only hedges that still match a named risk, no new heroes.",
    covers: ["A written extreme protocol.", "Basis can lie on extreme days.", "Communication (if you trade family money) is part of the protocol."],
    blocks: [
      { t: "steps", title: "Extreme day", items: [
        "No new discretionary risk.",
        "Check margin and buffer first, not Twitter.",
        "Hedges: only if still matching a named risk.",
        "Do not fade the first circuit as a personality.",
        "After the close: journal, IPS check, maybe a week of half-size.",
      ] },
    ],
    takeaways: ["Protocol > personality.", "Margin first.", "Half-size after extremes."],
    quiz: { q: "On a circuit-limit index day, the first professional click is usually:", options: ["Max fade", "Margin/buffer and no new hero risk", "Sell a naked strangle", "Buy jewellery"], answer: 1, why: "Survive, then think." },
  },

  "psychology-09": {
    lead: "Tilt is a state, not a story. Heart rate, narrowed attention, urge to 'get it back'. A tilt protocol is physical: stand up, close the DOM, 10 minutes outside, no click until a written sentence exists.",
    covers: ["Body first.", "The get-it-back urge is the tell.", "Protocol is rehearsed on a calm day."],
    blocks: [
      { t: "p", text: "Rehearse tilt on a Saturday: walk through 'I just lost 2R on a gap'. Where do you put the phone. What sentence do you write. If the first time you try the protocol is live, you will negotiate it. See kill switch." },
    ],
    takeaways: ["Tilt is physical.", "Rehearse off-line.", "No click without a sentence."],
    quiz: { q: "The 'get it back' urge after −2R is best treated as:", options: ["Motivation", "A tilt tell — protocol, not a new ticket", "Kelly", "A bulk deal"], answer: 1, why: "That urge is the state." },
  },
  "psychology-10": {
    lead: "Identity: 'I am a Nifty option seller' is a trap when the regime wants you to be flat. Attach identity to process ('I am someone who follows the card'), not to a product.",
    covers: ["Product identities freeze you.", "Process identity can skip.", "Ego hates skipping."],
    blocks: [
      { t: "p", text: "The market does not owe your identity a week of condors. If the shock cell is red, a process-identity person is flat and still themselves. A product-identity person sells the condor to remain themselves. That is an expensive personality." },
    ],
    takeaways: ["Identity → process.", "Skipping is a skill.", "Product loyalty is not a Greek."],
    quiz: { q: "Passing on your favourite setup because the shock cell failed is:", options: ["Weakness", "Process identity doing the job", "FOMO alpha", "A REIT"], answer: 1, why: "You stayed yourself by skipping." },
  },
  "psychology-11": {
    lead: "After a blow-up: capital, confidence, and process all crack. The repair order is process first (tiny compliance sample), then confidence, then capital. Trying to 'make it back' with capital first is how blow-up two happens.",
    covers: ["Time off is a control.", "Tiny size to rebuild compliance.", "Tell someone if family money was involved."],
    blocks: [
      { t: "p", text: "Two weeks off, then 0.25R, 20 trades, 90%+ compliance, then 0.5R. If that feels too slow, that feeling is why you blew up. Sit with it without a click." },
    ],
    takeaways: ["Process → confidence → capital.", "Slow is the repair.", "Family money needs a conversation."],
    quiz: { q: "After a −15R month, immediately doubling lots to 'recover' is:", options: ["Resilience", "The usual path to a second blow-up", "Half-Kelly", "A collar"], answer: 1, why: "Capital-first repair is revenge." },
  },
  "psychology-12": {
    lead: "Performance psychology for a one-person desk: sleep, sunlight, no alcohol on trade nights, a finish time. Talent is common. A nervous system that can run a boring process for a year is not.",
    covers: ["Body is infrastructure.", "Finish time prevents revenge evening reviews that become night trades (you don't have night trades — don't invent them).", "Boredom is a signal you are doing it right, or that you need a walk — not a new system."],
    blocks: [
      { t: "p", text: "The creative advanced trader is not the one with a secret oscillator. It is the one who can stay kind of bored, kind of alive, and still click only when the card says so. That is a craft. It is unglamorous. It compounds." },
    ],
    takeaways: ["Body is part of risk.", "Boredom can be success.", "Craft > secret."],
    quiz: { q: "Chronic boredom on a compliant, profitable process is often:", options: ["A sign to add 8 indicators", "A sign the process is working — walk, don't tinker", "A SEBI alert", "Proof of no edge"], answer: 1, why: "Boredom is frequently the job." },
  },
});

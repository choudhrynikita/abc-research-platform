const { expandLesson } = require("./expand");

const NSE = { label: "NSE", href: "https://www.nseindia.com" };
const SEBI = { label: "SEBI", href: "https://www.sebi.gov.in" };
const RBI = { label: "RBI", href: "https://www.rbi.org.in" };
const BSE = { label: "BSE", href: "https://www.bseindia.com" };
const MCA = { label: "MCA", href: "https://www.mca.gov.in" };
const ITD = { label: "Income Tax India", href: "https://www.incometax.gov.in" };
const NISM = { label: "NISM", href: "https://www.nism.ac.in" };
const MCX = { label: "MCX", href: "https://www.mcxindia.com" };

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "forensic-01": {
    lead: "Fraud in listed India is usually a process: a few years of aggressive accounting, related-party fog, then a gap that 'nobody saw'. Intermediate investors learn ratios. Advanced ones learn which ratios can be lied about, and which cash cameras are harder to fake.",
    covers: ["Fraud is a movie, not a tweet.", "Start with cash, related parties, and the auditor.", "Walk-away is a position."],
    blocks: [
      { t: "p", text: "You will not catch every fraud. You do not need to. You need a list of 'I do not need to own this' that fires early: chronic receivables growth versus revenue, promoter pledges at the ceiling, auditor hopping, SEBI show-cause, and a stock that only goes up on thin delivery. Missing a 10-bagger in a foggy name is not a career error. Owning the gap is." },
      { t: "table", caption: "First cameras (not a court)", headers: ["Camera", "Green-ish", "Walk-away-ish"], rows: [
        ["Cash vs PAT", "Cash from ops tracks profit over years", "Profit up, cash from ops down, again"],
        ["Receivables / revenue", "Stable or explained by mix", "Chronic climb, 'channel' stories"],
        ["Related parties", "Small, disclosed, priced", "Sales to cousins, loans to promoters"],
        ["Auditor", "Stable, big-name or clean history", "Resignation, emphasis of matter, hop"],
      ] },
      { t: "callout", kind: "caution", title: "A rising stock is not forensic evidence", text: "Operators can keep a name aloft while the cameras go red. Price is the last camera you should trust in a fog." },
    ],
    takeaways: ["Process, not a tweet.", "Cash and RPTs first.", "Skip is a skill."],
    quiz: { q: "Profit up three years while cash from operations lags and receivables climb is best treated as:", options: ["Proof of a compounder", "A quality-of-earnings warning, not a bargain by itself", "A buy-the-dip rule", "SEBI certification"], answer: 1, why: "Accruals can print profit without cash." },
    sources: [SEBI, MCA],
  },
  "forensic-02": {
    lead: "The cash-flow statement is the adult in the room. Operating cash should, over a cycle, rhyme with reported profit. Chronic divergence is the first forensic sentence. One year of capex or a working-capital swing can explain a gap. Three years of 'explained' gaps is a pattern.",
    covers: ["CFO versus PAT over a cycle.", "CFO minus capex (free cash) versus dividend and buyback.", "Interest and related-party cash."],
    blocks: [
      { t: "formula", expr: "CFO − maintenance capex − interest  should, over years, be able to fund owners", meaning: "If owners are paid while this residual is negative and debt is climbing, someone is being funded by lenders or by fog." },
      { t: "p", text: "Worked habit: print three years of CFO, PAT, capex, dividends, and net debt. If PAT is a hero and the other four are a mess, you do not need a forensic accounting degree. You need a skip." },
      { t: "example", title: "The generous dividend", body: "PAT ₹400 cr, CFO ₹90 cr, dividend ₹180 cr, net debt +₹250 cr. They are not 'sharing profits'. They are borrowing to look like a compounder. Your job is not to moralise. It is to not own it." },
    ],
    takeaways: ["CFO over a cycle.", "Owner cash vs lender cash.", "One year is a swing; three is a pattern."],
    quiz: { q: "Paying a large dividend while CFO is weak and net debt is rising most honestly means:", options: ["Shareholder friendliness", "Owners are being paid with someone else's money until it stops", "A buy signal", "A G-Sec"], answer: 1, why: "Cash has to come from somewhere." },
  },
  "forensic-03": {
    lead: "Related-party transactions are legal. Related-party fog is a business model. Sales to entities that share an address, loans to promoters, purchases from a 'supplier' that exists mainly on paper — these are how reported revenue becomes a family event.",
    covers: ["RPT table in the annual report is mandatory reading.", "Revenue concentration in related entities.", "Loans, guarantees, and pledged cashflows."],
    blocks: [
      { t: "p", text: "Open the related-party note. If 40% of revenue is to a private company with a similar name, you do not have a customer franchise. You have a family. Price that as a private company with a listed wrapper — or walk." },
      { t: "ul", items: ["Look for sales, purchases, loans, guarantees, leases, and 'management contracts'.", "Follow the cash: does the related party ever pay on time?", "If the name only works because of RPTs, a governance cleanup can kill the P&L. That is not a bonus. That is the thesis dying."] },
      { t: "callout", kind: "india", title: "SEBI and Companies Act already asked for the table", text: "You are not a detective. You are a reader. The note is there. Not reading it is a choice." },
    ],
    takeaways: ["RPT note is a camera.", "Family revenue is a family business.", "Cleanup can kill the P&L."],
    quiz: { q: "40% of listed-company revenue billed to promoter-owned private entities is primarily:", options: ["A moat", "A related-party concentration — price it as a family business", "A Nifty inclusion certificate", "Free cash"], answer: 1, why: "Customers that are cousins are not a franchise." },
    sources: [SEBI, MCA],
  },
  "forensic-04": {
    lead: "Auditors are not your friends, but their behaviour is a camera. Resignation mid-mandate, an emphasis of matter, a switch to a no-name firm after a Big-4, or a qualification you need a lawyer to parse — these are not footnotes. They are the plot.",
    covers: ["Resignation letters are documents.", "Emphasis of matter vs qualification.", "Fee too low for the complexity is a smell."],
    blocks: [
      { t: "p", text: "When an auditor resigns, they sometimes say the quiet part: information not provided, going-concern worry, disagreement on a number. Read the letter on the exchange filing, not the company's press-note. Then decide if you need to be paid to stay. Usually you do not stay." },
      { t: "callout", kind: "caution", title: "A clean audit is not a buy", text: "Plenty of disasters had clean reports the year before. Audits are a lagging, sampled camera. Red is useful. Green is not a halo." },
    ],
    takeaways: ["Resignation letters > press notes.", "Red is useful; green is not a halo.", "Complexity vs fee is a smell."],
    quiz: { q: "After a mid-mandate auditor resignation citing 'information not provided', the default desk action is:", options: ["Buy the dip — uncertainty is opportunity", "Treat it as a serious information-risk event, usually a skip or exit", "Ignore until the AGM", "Hedge with gold"], answer: 1, why: "The information set just failed." },
    sources: [SEBI, NSE, BSE],
  },
  "forensic-05": {
    lead: "Promoter pledge is a fuse. A high pledged percentage means a price drop can force more selling, which drops the price, which forces more selling. You do not need a gossip channel. You need the shareholding pattern and a rule: above X% pledged, size goes to zero or to a tiny defined expression.",
    covers: ["Pledge % of promoter holding.", "Invocation is a mechanical seller.", "Creeping pledge into a rally is not 'skin in the game'."],
    blocks: [
      { t: "p", text: "On ABC's stock pages you already see shareholding. The advanced habit is a hard skip: if promoters have pledged enough that a 25% drawdown threatens invocation, you do not own a business. You own a margin account with a listed name. Put that in the IPS forbidden list." },
      { t: "example", title: "The cascade", body: "Promoter holding 52%, pledged 70% of that. Stock −28% on a weak quarter. Lenders invoke, dump hits a thin book, −40%, more invocation. Your 'I am a long-term investor' sentence does not bind the lender." },
    ],
    takeaways: ["Pledge is a fuse.", "Invocation is mechanical.", "Hard skip above your X%."],
    quiz: { q: "A 25% stock drop triggering promoter-pledge invocation is primarily:", options: ["A healthy transfer of ownership", "A mechanical seller hitting the book — often a cascade", "A buy-the-dip law", "A bonus issue"], answer: 1, why: "Forced selling does not care about your DCF." },
    sources: [SEBI, NSE],
  },
  "forensic-06": {
    lead: "Working-capital games: channel stuffing, bill-and-hold, extended credit to 'win' the quarter, inventory that never turns. The cameras are receivable days, inventory days, and cash. Intermediate readers compute the ratios. Advanced readers ask what the next quarter must do to keep the game going.",
    covers: ["Receivable days up + revenue up = maybe stuffing.", "Inventory up in a 'just-in-time' story.", "The game needs acceleration. Acceleration ends."],
    blocks: [
      { t: "p", text: "If revenue grew 30% and receivable days went from 50 to 82, a chunk of that growth is 'we let them pay later'. Next year you need even more of that, or the growth prints negative. That is not a secret. It is the cash cycle from the Fundamentals track, used as a fuse." },
      { t: "formula", expr: "Receivable days ≈ 365 × receivables / revenue", meaning: "Use trailing twelve months, and compare to peers and to this firm's own history — not to a textbook 30." },
    ],
    takeaways: ["Days are cameras.", "Games need acceleration.", "Peers + own history, not a magic number."],
    quiz: { q: "Revenue +30% with receivable days 50 → 82 most cleanly suggests:", options: ["A stronger moat", "Part of the growth may be credit, not demand", "Guaranteed cash", "Index inclusion"], answer: 1, why: "Customers were allowed to delay paying." },
  },
  "forensic-07": {
    lead: "SEBI orders, show-cause notices, stock-exchange clarifications, and forensic-audit appointments are primary documents. They are more useful than a thread. Advanced research starts at the filing PDF, then the order, then — maybe — the newspaper.",
    covers: ["Exchange filings first.", "Orders have facts, not just adjectives.", "A forensic audit announced is already a regime change."],
    blocks: [
      { t: "steps", title: "Document protocol", items: [
        "Search the name on NSE/BSE corporate filings, SEBI orders, and MCA.",
        "Read the PDF. Highlight dates, amounts, related parties, and what was admitted versus alleged.",
        "Separate: alleged, admitted, settled, appealed.",
        "If a forensic auditor is appointed, your default is flatten or tiny — the information set is broken until the report.",
        "Do not average down into an information blackout.",
      ] },
      { t: "callout", kind: "india", title: "SCORES and orders are not gossip", text: "Investor complaints on SCORES are a weak camera (noisy). Formal orders are a strong one. Don't mix them." },
    ],
    takeaways: ["PDFs > threads.", "Forensic audit = regime change.", "No averaging into a blackout."],
    quiz: { q: "A company appointing a forensic auditor after a whistle-blower letter is, for a long book:", options: ["Automatically a 10-bagger setup", "A broken information set — default flatten or tiny", "Irrelevant if RSI is 30", "A buyback"], answer: 1, why: "You no longer know the numbers." },
    sources: [SEBI, NSE, BSE],
  },
  "forensic-08": {
    lead: "Governance is how minorities get paid — or not. Boards that never disagree, RPTs that never shrink, succession that is a family WhatsApp, and independent directors who collect seats like stamps: these are discounts you apply before the DCF, not after.",
    covers: ["Minority alignment.", "Board quality is a discount rate.", "A cheap multiple on a governance discount is still a governance discount."],
    blocks: [
      { t: "p", text: "If the promoter can move cash to a private company faster than you can sell, your '8× earnings' is a poster. Apply a governance haircut to the multiple, or walk. Creativity here is a written haircut (e.g. 'I will not pay more than 12× for this governance'), not a story about 'they will professionalise'." },
    ],
    takeaways: ["Governance is a discount.", "Write the haircut.", "'They will professionalise' is not a thesis."],
    quiz: { q: "Paying a full-quality multiple for a chronic RPT, pledge-heavy name because 'the stock is cheap vs peers' is:", options: ["Value investing", "Ignoring the governance discount the peers already priced", "A pair trade", "SEBI-approved"], answer: 1, why: "Cheap versus peers can be the discount working." },
  },
  "forensic-09": {
    lead: "Smallcap illiquidity is a fraud enabler. Thin books are easier to paint. Delivery % can look high because the float is a handkerchief. Circuit filters stop you from exiting, not from being wrong. Size from days-to-exit, and treat 'operator' tapes as a skip unless you are the operator (you are not).",
    covers: ["Thin books + circuits = exit risk.", "Delivery % without float context lies.", "You cannot scale a 4-crore-a-day name."],
    blocks: [
      { t: "p", text: "A name doing ₹4 cr a day of volume cannot absorb your ₹80 lakh 'conviction' without you becoming the tape. If that name also has pledge, RPTs, and a no-name auditor, you have a museum of red cameras. The advanced move is boredom: own liquid compounders, skip the circus." },
      { t: "formula", expr: "Impact budget: never more than ~10–20% of a typical day's volume if you might need 3 days to exit", meaning: "Conviction does not increase the book on the other side." },
    ],
    takeaways: ["Illiquidity enables painting.", "Circuits trap exits.", "Boredom is advanced."],
    quiz: { q: "Putting 8% of equity into a ₹4-cr-a-day name with 70% promoter pledge is primarily:", options: ["High-conviction investing", "An exit and cascade problem dressed as conviction", "Index-like risk", "A G-Sec"], answer: 1, why: "You cannot leave, and the fuse is lit." },
  },
  "forensic-10": {
    lead: "A walk-away checklist you actually use: cash vs profit, RPTs, auditor, pledge, working capital, SEBI/exchange fog, liquidity, and 'do I need this name?'. Two reds = no new money. Three = exit remaining. This is not cowardice. It is how professionals keep a career.",
    covers: ["Two-red rule.", "No new money vs full exit.", "Document the skip so you don't 'revisit' on a green day."],
    blocks: [
      { t: "card", title: "Walk-away checklist", fields: [
        ["CFO vs PAT (3-year)", "ok / yellow / red"],
        ["RPT concentration", "ok / yellow / red"],
        ["Auditor camera", "ok / yellow / red"],
        ["Promoter pledge", "ok / yellow / red"],
        ["Receivable / inventory days", "ok / yellow / red"],
        ["SEBI / forensic / show-cause", "none / fog / red"],
        ["Days-to-exit", "ok / yellow / red"],
        ["Decision", "hold / no new money / exit"],
      ] },
      { t: "p", text: "Put the date on the card. A name that was three-red in March does not become a buy in April because it is up 12%. The cameras have to change, not the candles." },
    ],
    takeaways: ["Two reds: no new money.", "Three: exit.", "Cameras, not candles."],
    quiz: { q: "A name that scored three reds last month and rallied 12% is, until cameras change:", options: ["A confirmed turnaround", "Still a three-red name — candles are not cameras", "A mandatory cover", "Index-eligible"], answer: 1, why: "Price is not a forensic camera." },
  },

  "tradertax-01": {
    lead: "In India, equity delivery, equity intraday, and F&O are not the same tax animal. F&O (and typically intraday equity) are treated as business income, not as the 12.5%-style LTCG poster people quote from television. If you mix them in one mental P&L, March will educate you.",
    covers: ["Delivery equity: capital gains rules (holding period, STCG/LTCG as then in force).", "Intraday equity: generally speculative business.", "F&O: generally non-speculative business income — still business, still books."],
    blocks: [
      { t: "p", text: "This course is not your CA. Rules move. Finance Act 2026 changed STT on option sales to 0.15% of premium (see Regulations). Tax rates and holding periods have been rewritten more than once. The advanced habit is: classify every ticket at entry (delivery / intra / F&O / commodity / currency), keep the contract notes, and let a CA map the year — not a WhatsApp forward." },
      { t: "table", caption: "Species (conceptual — confirm with a CA)", headers: ["Product", "Typical tax bucket", "What people wrongly quote"], rows: [
        ["Delivery equity", "Capital gains", "Same as F&O"],
        ["Intraday equity", "Speculative business", "STCG"],
        ["Equity/index F&O", "Non-speculative business", "LTCG if held 'long'"],
        ["Commodities F&O", "Business (check the year)", "Jewellery rules"],
      ] },
      { t: "callout", kind: "caution", title: "Holding an option for 13 months does not make it LTCG", text: "Expiry and daily MTM are not a listed-share holding period. Don't import delivery folklore onto a weekly." },
    ],
    takeaways: ["Species at entry.", "F&O is business income.", "CA maps the year; forwards don't."],
    quiz: { q: "A Nifty weekly option held for two expiries is typically taxed as:", options: ["Listed-equity LTCG because it lasted over a year in spirit", "Business income from F&O (confirm with a CA) — not a listed-share holding-period story", "Tax-free", "Agricultural income"], answer: 1, why: "F&O is a different species from delivery shares." },
    sources: [ITD],
  },
  "tradertax-02": {
    lead: "Turnover for a trader is a defined (and argued) number that decides tax-audit thresholds. For F&O it is not 'the notional of every lot'. It is closer to absolute profit + absolute loss (and premium on sales, depending on the year's guidance). Getting this wrong is how people miss an audit they owed.",
    covers: ["Turnover ≠ notional.", "Absolute profits and losses both count in common F&O practice.", "Audit threshold is a calendar — ask your CA for the year you are in."],
    blocks: [
      { t: "p", text: "A year with ₹8 lakh of winning trades and ₹7 lakh of losing trades is not '₹1 lakh turnover'. Common F&O practice treats turnover as something like 8+7 = 15 lakh (plus relevant premium terms). That can cross an audit line even if net P&L is tiny. This is why a 'small' active year still needs books." },
      { t: "callout", kind: "india", title: "Don't learn turnover from a reel", text: "ICAI guidance and the Finance Act in force for that AY are the documents. The number in this paragraph is a teaching sketch. Your CA's worksheet is the one that files." },
    ],
    takeaways: ["Turnover is not notional.", "Gross wins+losses matter.", "Audit can hit a tiny net year."],
    quiz: { q: "₹8 lakh gross F&O profits and ₹7 lakh gross F&O losses in one year usually means turnover is closer to:", options: ["₹1 lakh net", "The sum of absolute profits and losses (plus applicable premium terms) — not the net", "Zero because you 'almost broke even'", "Only the winning tickets"], answer: 1, why: "Turnover is a gross-style measure in common F&O practice." },
    sources: [ITD],
  },
  "tradertax-03": {
    lead: "ITR-3 (or whatever form the year specifies for business income) is a books-and-accounts story. If you run F&O, you are closer to a proprietor than to a SIP uncle. Keep a ledger: contract notes, ledger from the broker, bank, and a simple P&L. Creativity here is a folder, not a structure.",
    covers: ["Books: contract notes + broker ledger + bank.", "Don't mix personal UPI with the trading account without a trail.", "If you have a CA, send them a clean zip in April, not a panic in July."],
    blocks: [
      { t: "steps", title: "A trader's books (minimum)", items: [
        "One folder per FY: contract notes (digital is fine), monthly ledgers, bank statements of the trading-linked account.",
        "A worksheet: month, turnover sketch, net P&L, STT, stamp, GST on brokerage, other charges.",
        "Reconcile broker ledger to bank. Differences get a note, not a shrug.",
        "Separate delivery capital-gains worksheet from F&O P&L.",
        "Hand the pack to a CA. Do not file a creative ITR from memory.",
      ] },
    ],
    takeaways: ["You are a proprietor-ish.", "Folder per FY.", "Reconcile, then CA."],
    quiz: { q: "Filing F&O income from memory without contract notes is:", options: ["Agile", "How people invent a P&L the officer will not share", "Allowed if net is small", "Same as a SIP statement"], answer: 1, why: "Business income needs books." },
    sources: [ITD],
  },
  "tradertax-04": {
    lead: "Advance tax exists because the government does not want to wait until 31 July for your F&O year. If you are profitable by December, a January surprise is on you. Set aside a percentage as you go — boring, professional, career-saving.",
    covers: ["Installments have dates.", "Profit is not spendable until tax is parked.", "A good year with no advance tax is how interest and notice enter the chat."],
    blocks: [
      { t: "p", text: "A practical desk rule: every month that F&O is net green, sweep 30–40% of that month's net (pick a number with your CA) into a tax FD or a liquid fund earmarked 'not for margin'. If the year reverses, you have a conversation, not a hole." },
      { t: "callout", kind: "caution", title: "Don't pay tax from the margin account on a whim", text: "Sweep to a named bucket. Paying advance tax by raiding SPAN buffer is how a March square-off and a tax cheque collide." },
    ],
    takeaways: ["Park tax as you earn.", "Named bucket, not SPAN.", "Dates exist."],
    quiz: { q: "Using SPAN surplus in March to pay a forgotten advance-tax installment is risky because:", options: ["SEBI forbids taxes", "You can collide a margin need with a tax cheque", "VIX will fall", "It is illegal to pay tax"], answer: 1, why: "Two cash bosses, one pile." },
    sources: [ITD],
  },
  "tradertax-05": {
    lead: "The contract note is the DNA of the year: brokerage, GST, STT, stamp, exchange charges. STT on option sale is 0.15% of premium from 1 Apr 2026 (Finance Act 2026) — confirm the live circular. If your backtest ignored STT, your edge was a PDF.",
    covers: ["Read one contract note line by line.", "STT is not optional.", "GST on brokerage is not STT."],
    blocks: [
      { t: "p", text: "On a short weekly, STT on sale plus STT on square-up plus GST plus stamp can turn a '₹8 average credit' into a job that needed ₹12. ABC's equity-charges helper uses 0.15% on option premium sold as of 1 Apr 2026. If Parliament or a circular changes it again, the helper and this sentence both yield to the circular." },
      { t: "example", title: "STT on a short option", body: "Sell 1 lot Nifty 24,200 CE at ₹40, lot 65. Premium = 40×65 = ₹2,600. STT at 0.15% on sale ≈ ₹3.90 per lot per sell-side event — small here, not small on a fat premium or on a 20-lot habit. Add the other side, stamp, GST. The coupon is the residual after this stack, not before." },
    ],
    takeaways: ["Contract note is the stack.", "STT 0.15% of option premium sold (as of Apr 2026).", "Backtests without costs are fiction."],
    quiz: { q: "From 1 Apr 2026, STT on sale of an option is (confirm live circular):", options: ["Zero", "0.15% of premium (Finance Act 2026)", "0.15% of notional spot", "A GST input"], answer: 1, why: "The Act moved option-sale STT to 0.15% of premium." },
    sources: [ITD, NSE],
  },
  "tradertax-06": {
    lead: "Mixing delivery, intraday, and F&O in one spreadsheet called 'P&L' is how people mis-file. Keep three columns, then a total. A delivery LTCG cannot offset an F&O business loss the way a YouTuber implied in 2019. Confirm current set-off rules with a CA — they have moved.",
    covers: ["Separate worksheets.", "Set-off rules are a legal table, not a vibe.", "Don't plan a year on a dead blog."],
    blocks: [
      { t: "p", text: "The advanced trader's March is boring: three sheets, a CA meeting, a set-off question asked in writing. The intermediate trader's March is a screenshot and hope. Pick." },
    ],
    takeaways: ["Three species, three sheets.", "Set-off is a legal table.", "Ask in writing."],
    quiz: { q: "Netting F&O losses against listed-equity LTCG in your head because a 2019 blog said so is:", options: ["Best practice", "A good way to file the wrong species — confirm current set-off with a CA", "SEBI policy", "A pair trade"], answer: 1, why: "Rules move; species differ." },
    sources: [ITD],
  },
  "tradertax-07": {
    lead: "Loss carry-forward usually needs a return filed in time and the right head of income. A late ITR can donate a year's F&O loss to the void. Wash-sale folklore from the US does not map 1:1 onto India. Don't import it; don't ignore genuine related-party loss games either.",
    covers: ["On-time filing is part of the trade.", "Carry-forward is a calendar skill.", "US wash-sale ≠ Indian law."],
    blocks: [
      { t: "p", text: "If you had a −₹6 lakh F&O year and filed late, you may have turned a carry-forward asset into a story. That is an operational blow-up with no ticker. Put 'ITR date' on the desk calendar next to MPC." },
    ],
    takeaways: ["File on time or lose the loss.", "Carry-forward is an asset.", "Don't import US wash-sale blindly."],
    quiz: { q: "A late ITR after a large F&O loss year most dangerously risks:", options: ["Nothing", "Losing the ability to carry that loss forward (confirm with a CA)", "A Nifty circuit", "A bonus issue"], answer: 1, why: "Timely filing is often a condition." },
    sources: [ITD],
  },
  "tradertax-08": {
    lead: "Reconcile: broker P&L, contract-note sum, bank movements, and your journal. If they disagree by more than rounding, you have either a missed trade, a corporate-action, a funding charge, or a lie you told yourself in the journal. Advanced desks do this monthly, not in July.",
    covers: ["Monthly close.", "Corporate actions and spins break naive sums.", "Funding, MTM, and 'ledger vs P&L' are different cameras."],
    blocks: [
      { t: "steps", title: "Monthly close", items: [
        "Download broker ledger and contract notes.",
        "Sum F&O realised; note open MTM separately (not 'I made it').",
        "Match bank: pay-ins, pay-outs, charges.",
        "Journal vs broker: if your R-multiple diary disagrees, the broker wins until you find the ticket.",
        "Park GST/STT/stamp into the tax worksheet.",
      ] },
    ],
    takeaways: ["Monthly, not July.", "Broker wins until proven.", "MTM is not realised."],
    quiz: { q: "Your journal says +4.2R and the broker ledger says +1.1R. First move:", options: ["File the journal", "Treat the broker as right until you find the missing costs/tickets", "Ignore costs as noise", "Delete the ledger"], answer: 1, why: "The ledger is what files." },
  },
  "tradertax-09": {
    lead: "GST on brokerage is an invoice story. You are usually the end consumer — do not invent input-credit theatre without a CA. TDS, if any appears, is a credit you track. The professional move is a charges ledger, not a debate on Twitter about whether STT is GST.",
    covers: ["GST ≠ STT ≠ stamp.", "Keep invoices.", "Don't claim credits you don't have."],
    blocks: [
      { t: "p", text: "Read the contract note columns until you can explain each one out loud. That 20-minute drill saves a 20-lakh misunderstanding. Regulations-02 in this course sits next to this chapter — they are the same stack from two doors." },
    ],
    takeaways: ["Name each charge.", "Invoices in the FY folder.", "No invented credits."],
    quiz: { q: "STT and GST on brokerage are:", options: ["The same tax", "Different lines on the contract note — don't conflate them", "Optional on weeklies", "Refundable as LTCG"], answer: 1, why: "Different statutes, different lines." },
  },
  "tradertax-10": {
    lead: "March is a desk: freeze new exotic products, reconcile 11 months, meet the CA, pay what is owed, and do not 'make it back' in the last week of the FY. A tax-driven trade is usually a bad trade. File, then trade next year's IPS.",
    covers: ["No FY-end heroics.", "CA meeting with a zip, not a vibe.", "Next year's IPS can change after you know the tax."],
    blocks: [
      { t: "card", title: "March desk", fields: [
        ["FY folder complete?", "yes / missing months"],
        ["Three sheets (delivery / intra / F&O)", ""],
        ["Advance tax parked", ""],
        ["CA slot", "date"],
        ["Open F&O into 31 Mar (intended?)", "flatten / hold with a reason"],
        ["No new product after", "15 Mar (example)"],
      ] },
    ],
    takeaways: ["March is operations.", "No tax-driven heroes.", "File, then IPS."],
    quiz: { q: "Putting on a huge F&O risk on 28 March to 'use a loss' is usually:", options: ["Tax alpha", "A tax story driving a trading risk — often the wrong boss", "Mandatory", "A collar"], answer: 1, why: "The tax tail should not wag a 4R dog." },
  },

  "intermarket-01": {
    lead: "An India desk that only watches Nifty is a one-camera sitcom. Four screens: Nifty (or BN), USDINR, crude, and US index futures. You are not a global-macro fund. You are refusing to be surprised by a 9:15 that started in New York and Houston.",
    covers: ["Four cameras, one sentence each.", "Aligned vs fighting (see FX bosses).", "The overnight note is a job."],
    blocks: [
      { t: "diagram", name: "intermarket-triangle" },
      { t: "p", text: "Before size: S&P futures overnight, US 10-year, DXY, Brent, USDINR last, Nifty SGX/our basis if you have it. Six words can be enough: 'US risk-off, oil quiet, rupee soft'. That sentence decides whether today's Nifty long is a fight." },
    ],
    takeaways: ["Four screens.", "One sentence before size.", "Refuse to be surprised."],
    quiz: { q: "Nifty gap-down with S&P futures −1.8% and no India headline is first a:", options: ["Nifty DCF event", "Global risk-off leaking into the open", "A buyback", "Max pain"], answer: 1, why: "The world is allowed to shove 9:15." },
  },
  "intermarket-02": {
    lead: "Oil–rupee–Nifty is a triangle, not a slogan. Crude up is a tax (CAD, inflation, OMCs) and a boom for producers. The rupee often feels the tax. Nifty's mix (IT dollar vs energy vs banks) decides the index print. Write which vertex you own.",
    covers: ["Split energy: OMCs vs producers vs aviation.", "Rupee is the exhaust.", "Index mix is not 'India hates oil'."],
    blocks: [
      { t: "p", text: "Brent +8% in a week. Producer names bid, OMCs a mess unless they get a policy cushion, aviation hurt, rupee softer, banks a second-round inflation story. Nifty may look 'held' because IT is bid on the rupee. If you are long an OMC because 'Nifty is strong', you own the wrong vertex." },
      { t: "table", caption: "Oil up — who is the ticket", headers: ["Sleeve", "Often", "Not"], rows: [
        ["Producers", "Bid", "A rupee hedge"],
        ["OMCs", "Hurt unless policy", "A mechanical long"],
        ["IT", "Sometimes bid via rupee", "An oil play"],
        ["USDINR long (importer)", "Hedge-friendly", "A Nifty substitute"],
      ] },
    ],
    takeaways: ["Split the energy complex.", "Index mix can hide the tax.", "Own a vertex, not a slogan."],
    quiz: { q: "Nifty flat, Brent +6%, your OMC long −4%: the honest sentence is:", options: ["The market is wrong about Nifty", "I own the taxed vertex while the index hid it", "Oil doesn't matter in India", "VIX is 12"], answer: 1, why: "The index mix is not your book." },
  },
  "intermarket-03": {
    lead: "Gold in India is jewellery demand, import bills, global real rates, and a fear bid. MCX gold, Gold BeES, SGBs, and jewellery are different products (see Alts and Commodities). Intermarket gold is the global real-rate + dollar camera that leaks into MCX via USDINR.",
    covers: ["MCX gold ≈ COMEX × USDINR × conversion (estimate, not a promise).", "Falling US real rates + weak dollar is the friendly mix.", "A jewellery-demand festival is a local overlay."],
    blocks: [
      { t: "p", text: "ABC's commodities engine already translates COMEX and USDINR into a rupee gold sketch. The course point: if COMEX is quiet and MCX rips, look at the rupee. If both rip, look at real rates and fear. If MCX lags a COMEX spike, look at USDINR the other way or at a lag that may fill. Don't invent a 'domestic only' story until the product identity is named." },
    ],
    takeaways: ["Gold is a mix.", "MCX can be the rupee.", "Name the product (BeES vs future vs SGB)."],
    quiz: { q: "COMEX flat, USDINR up hard, MCX gold up is primarily:", options: ["A mystery squeeze", "The rupee leg of the conversion", "A Nifty pair", "SEBI policy"], answer: 1, why: "Rupee gold can move on the FX leg alone." },
  },
  "intermarket-04": {
    lead: "US 10-year yields are a gravitational field for EM: they shove the dollar, FII debt and equity, and 'why is Nifty down when India news is fine'. You do not need a duration fund to care. You need one line on the overnight note.",
    covers: ["US real yields up → EM pressure, often.", "Not 1:1, not every day.", "Combine with DXY, not in isolation."],
    blocks: [
      { t: "p", text: "A 20 bp US 10-year shock with DXY bid is a risk-off open until proven otherwise. A 20 bp grind over a month with India flows strong can be digested. The advanced skill is matching the speed of the yield move to your Nifty product: weeklies care about the shock; a 15-day vertical can look through a grind." },
    ],
    takeaways: ["US 10y is a camera.", "Speed matters.", "With DXY, not alone."],
    quiz: { q: "A sudden +20 bp US 10-year with DXY bid, India headlines quiet, is first:", options: ["A Nifty earnings event", "An EM-risk camera for the open", "A buyback", "A G-sec OMO"], answer: 1, why: "Global yields leak." },
  },
  "intermarket-05": {
    lead: "China is a metals, supply-chain, and risk-appetite camera for Indian materials, some autos, and chemicals. A China scare is not 'sell India'. It is 'check metals, check chemicals, check risk-on midcaps'. Name the sleeve.",
    covers: ["Metals and chemicals first.", "Not a Nifty-wide law.", "Supply-chain cuts vs demand-scare are different."],
    blocks: [
      { t: "p", text: "If China demand-scare hits copper and steel, Indian metal names are in that weather even if Nifty IT is green. If China supply cuts, the same names can bid. Read the headline until you know demand vs supply. Then pick a vertex — or skip because you don't know." },
    ],
    takeaways: ["Sleeve, not 'India'.", "Demand scare ≠ supply cut.", "Skip if you can't name which."],
    quiz: { q: "China demand-scare headlines with copper dumping: your Indian metal long is:", options: ["Hedged by Nifty IT", "In that weather — index mix will not save you", "A G-Sec", "Unrelated always"], answer: 1, why: "You own the sleeve." },
  },
  "intermarket-06": {
    lead: "Overnight gap protocol: you already have one in Risk and Intraday. Intermarket version: if US hours were a shock, your first job is classification, not a fade. Write: 'gap type, which camera, product allowed, size multiplier'. The people who lose the year fade the first 9:16 of a true shock.",
    covers: ["Classify the gap (US / oil / India / mixed).", "Half size or skip on mixed shocks.", "Hedges that still match a named risk can stay."],
    blocks: [
      { t: "steps", title: "Shock-open", items: [
        "Name the camera that moved (US, oil, FX, India print).",
        "If two cameras moved, skip new discretionary.",
        "Existing hedges: keep only if they still match the named risk.",
        "No OR-fade of a 1.2× ATR news gap.",
        "Reassess at 9:50 with OR closed, not at 9:16.",
      ] },
    ],
    takeaways: ["Classify first.", "Two cameras → skip new.", "Wait for OR on true shocks."],
    quiz: { q: "S&P −2% and Brent +5% into our open: new discretionary Nifty longs at 9:16 are usually:", options: ["Brave", "Two-camera shock — skip or wait for OR, half size at most", "A cash-and-carry", "Mandatory covers"], answer: 1, why: "Two bosses moved." },
  },
  "intermarket-07": {
    lead: "In a crash, correlations go to 1: your 'diversified' book of banks, metals, and midcaps becomes one short India. Gold and duration sometimes help. Sometimes they don't (2020-style everything-sold hours). Advanced IPS names a crash correlator and a sleeve that is allowed to be the ballast.",
    covers: ["Crash ≠ normal correlation matrix.", "Ballast must be a different product (not another equity beta).", "Rebalance rules need a crash clause."],
    blocks: [
      { t: "p", text: "If 80% of your net worth is equity-beta (including 'balanced' hybrids that are 70% equity), you do not have ballast. You have a story. SGB/gilt/liquid and a written hedge overlay are ballast. Another midcap 'defensive' is not." },
    ],
    takeaways: ["Crash correlation → 1.", "Ballast is a different product.", "IPS crash clause."],
    quiz: { q: "A book of 12 unrelated Indian stocks in a 6% Nifty crash will usually:", options: ["Behave like 12 uncorrelated coins", "Trade as one India-beta pile", "Hedge itself", "Convert to gold"], answer: 1, why: "Crash correlator." },
  },
  "intermarket-08": {
    lead: "Elections, Union Budget, and monsoon are dated vol events with sector fingerprints. They belong on the calendar in colour (see Desk). Trading them as 'direction I saw on TV' is how weeklies die. Trading them as vol and sector maps is advanced.",
    covers: ["Budget: vol + sector, not a Nifty coin-flip.", "Election: path vol, not a one-night binary unless it is.", "Monsoon: food CPI → RBI path → banks/duration, with a lag."],
    blocks: [
      { t: "p", text: "A Budget-day Nifty condor can be a vol ticket if the shock cell includes the sector gap you cannot see from the index. A Budget-day naked short strangle is a jump-sale into a document. You already knew that from the vol track. Here is the intermarket add-on: pre-map 4 sectors that the document can shove, and decide if your book is accidentally one of them." },
    ],
    takeaways: ["Dated events are vol + sector.", "Pre-map sleeves.", "No naked jump-sales into documents."],
    quiz: { q: "A Union Budget naked short Nifty strangle is primarily:", options: ["A clever pin", "A jump sale into a document", "A monsoon hedge", "A G-Sec"], answer: 1, why: "The document can gap sectors and the index." },
  },
  "intermarket-09": {
    lead: "Intermarket lies: oil down and OMCs still dumped on a policy scare; DXY down and rupee still weak on a domestic print; S&P up and Nifty down on FII tax or a local fraud cluster. When the usual map fails, the local camera is in charge. Don't force the textbook.",
    covers: ["Maps are defaults, not laws.", "Local print overrides the textbook for that session.", "Write 'map failed' in the journal — that tag is research."],
    blocks: [
      { t: "p", text: "The creativity is noticing the lie quickly: 'S&P +1, Nifty −1, FII tax headline — local boss'. Then you stop fading Nifty as if it were a lagged S&P. That sentence is worth more than a new indicator." },
    ],
    takeaways: ["Maps fail.", "Local boss can override.", "Tag the lie."],
    quiz: { q: "S&P green, Nifty red on a domestic tax headline: fading Nifty as 'it will catch US' is:", options: ["Classic intermarket", "Forcing a map after the local boss took over", "A pair arb", "Required"], answer: 1, why: "The local camera is in charge." },
  },
  "intermarket-10": {
    lead: "Layout is a strategy. Four tiles, a rates strip, and the index open card from the Indices track. If your screen is 14 Nifty indicators and no USDINR, you built a museum of the same camera. Creativity is subtraction.",
    covers: ["Fewer cameras, filled in.", "A layout you can run at 8:50 and at 15:35.", "Mobile: three numbers, not fourteen."],
    blocks: [
      { t: "card", title: "Four-tile overnight", fields: [
        ["US / S&P futures / 10y / DXY", ""],
        ["Brent", ""],
        ["USDINR", ""],
        ["Nifty basis / BN vs Nifty", ""],
        ["Local event today", ""],
        ["Map aligned or fighting?", ""],
        ["Product allowed", ""],
        ["Size multiplier", "1.0 / 0.5 / 0"],
      ] },
    ],
    takeaways: ["Layout is risk.", "Subtract indicators.", "Three numbers on a phone."],
    quiz: { q: "Fourteen Nifty oscillators and no USDINR/oil tile on an FOMC night is:", options: ["Deep technical analysis", "One-camera theatre — you skipped the bosses", "A hedge", "A DCF"], answer: 1, why: "The bosses are off-screen." },
  },

  "researchcraft-01": {
    lead: "A thesis is one sentence with a kill. 'HDFC Bank is a good bank' is a poster. 'I own it while deposit share holds and pledge stays under X, kill on a forensic or a NIM collapse versus my sheet' is a thesis. Advanced books are collections of kills, not collections of stories.",
    covers: ["One sentence.", "Kill is observable.", "If you cannot kill it, you cannot size it."],
    blocks: [
      { t: "p", text: "Write the thesis before the size. If the sentence needs a paragraph, you do not understand it yet — or you are hiding two theses in one name. Split them. The second thesis gets its own card or it does not get capital." },
      { t: "example", title: "Poster vs thesis", body: "Poster: 'India aviation will compound.' Thesis: 'I own this airline while load factor and yield hold in a band, fuel hedge is on, and net debt/EBITDAR under Y; kill on a forensic, a promoter-pledge jump, or two quarters of yield collapse without a cost offset.'" },
    ],
    takeaways: ["Sentence + kill.", "Observable kill.", "No kill, no size."],
    quiz: { q: "A name with a two-page story and no observable kill is:", options: ["High conviction", "Not yet a thesis — you cannot know when you were wrong", "A pair", "SEBI-approved"], answer: 1, why: "Without a kill you cannot be wrong, so you cannot be right." },
  },
  "researchcraft-02": {
    lead: "Evidence hierarchy: statute and filing > exchange disclosure > audited statement > concall transcript > reputable primary journalism > sell-side note > Twitter. Treating the stack upside-down is how rumours become tickets.",
    covers: ["Primary documents first.", "Notes are opinions with incentives.", "A viral clip is not a 10-K."],
    blocks: [
      { t: "table", caption: "Who is talking", headers: ["Source", "Use as", "Don't use as"], rows: [
        ["Exchange filing / SEBI order", "Fact (still read dates)", "A buy signal by itself"],
        ["Annual report / notes", "The business's own camera", "Marketing page 4 in isolation"],
        ["Concall", "Tone and weasel words", "A number the filing doesn't have"],
        ["Sell-side", "Map of what the street already thinks", "Your thesis"],
        ["Social", "A mood camera", "Evidence"],
      ] },
      { t: "callout", kind: "caution", title: "Incentives", text: "Brokers write notes to talk. Promoters write slides to raise. You write a card to size. Those are not the same sport." },
    ],
    takeaways: ["Filings first.", "Notes are maps of the street.", "Social is mood."],
    quiz: { q: "A viral thread contradicting last night's exchange filing should be treated as:", options: ["Faster truth", "Mood — the filing still wins until amended", "A pair trade", "Insider-quality"], answer: 1, why: "Hierarchy." },
  },
  "researchcraft-03": {
    lead: "The one-page note is the product of research. If it doesn't fit, you are not ready to size. Sections: what it is, the thesis sentence, three cameras, the kill, the product (cash / defined F&O / skip), 1R, next review date.",
    covers: ["One page.", "Product is a field.", "Review date is a field."],
    blocks: [
      { t: "card", title: "One-page note", fields: [
        ["Name / product", ""],
        ["Thesis (one sentence)", ""],
        ["Camera 1 / 2 / 3", ""],
        ["Kill", ""],
        ["Why now (catalyst or lack of one)", ""],
        ["What the street already thinks", ""],
        ["Product & 1R", ""],
        ["Next review date", ""],
      ] },
      { t: "p", text: "Creativity is the constraint. A 19-tab model that cannot fit on this page is a hobby. A page that can be reread at 7:40am by a tired you is a desk." },
    ],
    takeaways: ["Constraint is the craft.", "Product and 1R on the page.", "Tired-you is the audience."],
    quiz: { q: "A 19-tab model with no one-page note is usually:", options: ["More professional", "A hobby until it can fit on one page with a kill", "A hedge", "A G-Sec"], answer: 1, why: "If it cannot compress, it cannot be traded when you are tired." },
  },
  "researchcraft-04": {
    lead: "Kill criteria you cannot negotiate: the camera printed, you exit, you do not 'give it one more quarter' because the chart is pretty. Pre-commit the kill on a calm day. Live-you is a lawyer for the position. Calm-you is the judge.",
    covers: ["Write kills when flat.", "Live-you will bargain.", "A delayed kill is a new thesis — write it or don't."],
    blocks: [
      { t: "p", text: "If the kill was 'two quarters of CFO divergence' and you just got the second, the trade is over. A new thesis — 'CFO will catch up because of X' — is allowed only as a new page, new 1R, usually smaller. Same name, new species. Don't pretend it is the old one." },
    ],
    takeaways: ["Kills written flat.", "Bargain = new thesis.", "New page, new 1R."],
    quiz: { q: "The kill printed and you hold because 'the chart looks strong' is:", options: ["Flexibility", "The live-you lawyer firing the judge", "A pair", "Process"], answer: 1, why: "You negotiated the kill." },
  },
  "researchcraft-05": {
    lead: "Sell-side notes are useful as a map of consensus, target-price gravity, and what would surprise. They are not research you outsource. Read the variant view: what would make the analyst wrong. That paragraph is the only one that sometimes pays.",
    covers: ["Consensus as positioning.", "Variant view.", "Incentives: banking, access, brokerage."],
    blocks: [
      { t: "p", text: "If 18 of 20 notes say buy with a 12-month target 8% above last, the street is not nervous. Your long is a crowded carry. That can still work. It is not a secret. If you need a secret, you need a camera the notes don't have — a filing, a channel check you actually did, a kill they didn't write." },
    ],
    takeaways: ["Notes = consensus map.", "Variant paragraph first.", "Crowded carry is a named bet."],
    quiz: { q: "Twenty buy notes, target 8% above spot, your edge is:", options: ["Secret", "Probably not the note — you need a camera they don't share", "Guaranteed", "A VIX short"], answer: 1, why: "Consensus is already in the price, more or less." },
  },
  "researchcraft-06": {
    lead: "Idea pipeline with a WIP limit: 8 names in research, 5 in the book, 2 on deck. Unlimited tabs is how nothing gets a kill. Advanced creativity is a kanban, not a new sector.",
    covers: ["WIP limit.", "Promote / kill weekly.", "On-deck names don't get FOMO size."],
    blocks: [
      { t: "p", text: "A new idea must kill an old WIP or wait. That sentence is a risk rule. It keeps you from owning 22 half-theses. Half-theses do not have kills. They have vibes." },
    ],
    takeaways: ["WIP is a cap.", "New idea kills old WIP or waits.", "Half-theses are vibes."],
    quiz: { q: "Adding a 23rd half-researched name because it 'looks interesting' is:", options: ["Hustle", "Breaking the WIP cap — usually a vibe", "A hedge", "Required"], answer: 1, why: "WIP exists so kills exist." },
  },
  "researchcraft-07": {
    lead: "After-action: process versus luck. A winning trade that broke three rules is a warning. A losing trade that followed the card is a sample. Journals that only record P&L train you to chase outcomes. Journals that grade process train you to have a career.",
    covers: ["Process grade independent of R.", "Tag luck (gap your way / against).", "Promote rules that survive; museum the rest."],
    blocks: [
      { t: "p", text: "ABC's worksheet journal already has process_grade and followed_plan. Use them. A month of +8R with C-grades is how blow-ups schedule themselves. A month of −1R with A-grades is a system you can keep." },
    ],
    takeaways: ["Grade process, not just R.", "Luck tags.", "A-grade losses are keepers."],
    quiz: { q: "A +3R trade that broke the stop rule is:", options: ["Proof the rule is wrong", "A warning — outcome rewarded a process break", "A reason to delete stops", "A G-Sec"], answer: 1, why: "You were paid to break the rule. That bill arrives later." },
  },
  "researchcraft-08": {
    lead: "Cadence: daily (tickets, kills that printed), weekly (WIP, process grades), quarterly (IPS, factor mix, tax). Mixing cadences — rewriting the IPS because of a Tuesday — is how people have no IPS.",
    covers: ["Daily ≠ quarterly.", "Tuesday does not get to rewrite the forbidden list.", "Quarterly report to yourself (see Portfolio)."],
    blocks: [
      { t: "table", caption: "Cadence", headers: ["When", "Allowed to change", "Forbidden to change"], rows: [
        ["Daily", "Tickets, flatten on kills", "IPS, 1R definition, forbidden list"],
        ["Weekly", "WIP, setup weights, review grades", "Risk caps unless a cap already hit"],
        ["Quarterly", "IPS, factor mix, products", "Nothing in a revenge mood"],
      ] },
    ],
    takeaways: ["Cadence is governance.", "Tuesday ≠ IPS.", "Quarterly is the grown-up meeting."],
    quiz: { q: "Deleting a forbidden product from the IPS on a losing Tuesday is:", options: ["Agile", "A cadence break — live-you is rewriting law", "A pair", "Required after −1R"], answer: 1, why: "IPS is quarterly, not revenge." },
  },
  "researchcraft-09": {
    lead: "Ethics is a risk control. No WhatsApp tips as a business, no front-running a client's (or a cousin's) order, no lying in a journal, no pumping a thin name you own. SEBI's insider and market-abuse rules are the floor. Your IPS is the ceiling you actually need.",
    covers: ["Insider information is a stop, not an edge.", "Thin-name pumping is abuse.", "A clean journal is part of the craft."],
    blocks: [
      { t: "p", text: "If you learn something material, non-public, you are done clicking that name. That is not a vibe. That is the law and the career. The advanced trader's edge is process in public information, not a cousin on a board." },
      { t: "callout", kind: "caution", title: "Tips are a product with someone else's residual", text: "If you cannot write the thesis and the kill, you cannot size the tip. Most tips fail that sentence. Skip." },
    ],
    takeaways: ["Law is the floor.", "MNPI = stop.", "Tips without kills = skip."],
    quiz: { q: "Material non-public information on a name you wanted to buy means:", options: ["A gift", "You stop — that is not your edge", "A bigger 1R", "A pair against it"], answer: 1, why: "Insider rules and career risk." },
    sources: [SEBI],
  },
  "researchcraft-10": {
    lead: "Write for a future you who is tired, biased, and one bad night from tilt. Short sentences, a kill, a product, a 1R. If clever-you cannot be understood by tired-you, clever-you is a liability. That is the whole craft of an advanced one-person desk.",
    covers: ["Tired-you is the user.", "Short beats clever.", "The course's cards were the point."],
    blocks: [
      { t: "p", text: "You now have cards for index opens, OR breaks, pairs, rates, FX hedges, forensic walk-aways, March tax, and overnight tiles. Using them is the creativity. Inventing a fifteenth oscillator because the card felt boring is how the museum starts. Boredom on a compliant desk is often the job — see Psychology." },
      { t: "callout", kind: "idea", title: "Give the future you a boring gift", text: "A filled card at 8:50 is a kindness. A blank DOM at 9:16 is a dare." },
    ],
    takeaways: ["Tired-you is the user.", "Cards > clever.", "Boredom can be the job."],
    quiz: { q: "The user of your research note is:", options: ["A conference audience", "Tomorrow's tired you under live risk", "SEBI", "A YouTube comment"], answer: 1, why: "The note is an operational document." },
  },

  "technicals-23": {
    lead: "Relative strength versus the index is how you stop buying a 'breakout' that is actually a lagging name in a bull tape. Price making highs while RS is making lows is a heavyweight-or-beta story, not a leader. Leaders show both.",
    covers: ["RS = name / index, smoothed.", "Leaders: price and RS both behave.", "Laggard breakouts need a name thesis, not a pattern nickname."],
    blocks: [
      { t: "p", text: "If Nifty is at highs and your candidate is at highs but RS vs Nifty has been falling for a month, you are late to a name the index already passed. Either you have a fundamental kill-based thesis (see Research craft), or you skip the breakout because it is a laggard in disguise." },
    ],
    takeaways: ["RS vs index is a camera.", "Laggard highs are not leaders.", "Name thesis or skip."],
    quiz: { q: "Stock at 52-week high, RS vs Nifty at a 3-month low, usually means:", options: ["A powerful leader", "A laggard catching a bid — treat as a different species than a leader breakout", "A guaranteed follow-through", "A VIX buy"], answer: 1, why: "Price highs can be the index carrying a weak name." },
  },
  "technicals-24": {
    lead: "Failed breakouts are a named trade: the break, the stall, the close back in, the fade toward the other side of the range. They are not 'the opposite of my long' you invent in anger after a stop. Separate cards, separate 1R.",
    covers: ["Close back inside > a wick.", "Stop above the failed high.", "Don't fade a news break as a failed pattern."],
    blocks: [
      { t: "p", text: "Pattern books love failures. Live tapes love news. A breakout that fails because a SEBI order hit is not a failure pattern. It is a new information set. See Intraday news-spike. Don't donate a fade to a document." },
    ],
    takeaways: ["Failures are named.", "New info ≠ a pattern fail.", "Separate 1R."],
    quiz: { q: "A breakout that reverses on a forensic-audit filing is:", options: ["A textbook failed breakout fade", "A new information set — not the pattern you studied", "A VWAP law", "A pair"], answer: 1, why: "The document changed the species." },
  },
  "technicals-25": {
    lead: "Delivery % in India is a participation camera, not a buy signal. High delivery on an up-day is a hypothesis of real hands. High delivery on a down-day can be real selling. Low delivery with a spike is often F&O or intra noise. Always pair it with volume versus average and with the story's other cameras.",
    covers: ["Delivery % needs volume context.", "Up-day vs down-day.", "F&O names can lie."],
    blocks: [
      { t: "p", text: "A 70% delivery print on 0.2× average volume is a handkerchief. A 55% delivery print on 3× volume at a break of a range is a camera worth writing down. The number without the volume is a poster." },
    ],
    takeaways: ["Delivery × volume.", "Direction of the day matters.", "Thin prints lie."],
    quiz: { q: "70% delivery on 0.2× average volume is best treated as:", options: ["Institutional accumulation always", "A small sample — not a strong camera", "A buy signal", "A circuit"], answer: 1, why: "Percentage on a tiny base is noisy." },
  },
  "technicals-26": {
    lead: "A weekly chart is a regime camera; a 5-minute chart is a timing camera. Using the 5-minute to argue with the weekly is how people fade trends for a living. Multiple timeframes (you met them in Technicals-10) become advanced when the higher one is a veto, not a decoration.",
    covers: ["Higher timeframe vetoes.", "Lower timeframe only times.", "If they fight, size goes to zero or to a defined scratch."],
    blocks: [
      { t: "p", text: "Rule: no 5-minute shorts against a weekly that is still making higher lows unless the weekly kill is in play. You can scratch a 5-minute long that is a pullback. You cannot build a personality as the weekly's opponent on 5-minute hope." },
    ],
    takeaways: ["HTF veto.", "LTF times.", "Don't be the weekly's opponent for a living."],
    quiz: { q: "Shorting every 5-minute RSI 70 against a weekly higher-low trend is:", options: ["Precision", "Arguing with the veto timeframe", "A hedge", "Required"], answer: 1, why: "The weekly is the regime." },
  },

  "funds-15": {
    lead: "SEBI's category boxes (large-cap, flexi, mid, small, sectoral, debt duration buckets) exist so you know what you bought. A 'flexi' that is a closet large-cap is a fee on Nifty. A 'short duration' fund that quietly owns credit is a spread you didn't consent to. Read the style box and the holdings, not the advertisement.",
    covers: ["Category is a constraint.", "Closet indexing is a fee story.", "Debt categories hide credit and duration."],
    blocks: [
      { t: "p", text: "If a large-cap fund's active share versus Nifty is tiny, you wanted Nifty BeES or an index fund. Paying active TER for a closet is how households leak. The advanced household move is: index the core, pay active only where the holdings actually differ — and still size that satellite." },
    ],
    takeaways: ["Category + holdings.", "Closet = fee on the index.", "Debt boxes hide risks."],
    quiz: { q: "A 'flexi cap' with 92% overlap with Nifty 50 is primarily:", options: ["Skill", "A closet index with extra TER", "A hedge", "An SGB"], answer: 1, why: "You could have bought the recipe cheaper." },
    sources: [SEBI],
  },
  "funds-16": {
    lead: "Rolling returns beat a single 5-year number. A fund that is a hero from a lucky start date and a zero from the others is a start-date story. Look at rolling 3-year versus the category and versus the index, plus worst drawdown, plus tracking error. Then decide if the TER is a tax on a real residual.",
    covers: ["Rolling windows.", "Start-date bias.", "Drawdown and tracking error with the return."],
    blocks: [
      { t: "p", text: "A page of 'since inception' from 2009 is an advertisement. A table of rolling 3-year excess versus Nifty, every month-end for 10 years, is research. If that excess is 0.4% with 4% extra drawdown, you do not have a satellite. You have a fidget." },
    ],
    takeaways: ["Rolling > since-inception.", "Excess vs drawdown.", "TER needs a residual."],
    quiz: { q: "'Since inception +18%' from a 2009 start, without rolling windows, is:", options: ["Complete research", "A start-date advertisement until rolling excess is shown", "A G-Sec yield", "SEBI-certified alpha"], answer: 1, why: "Start date can be the whole story." },
  },
  "funds-17": {
    lead: "Debt-fund duration and credit are the two dials. A 'corporate bond' fund can be a 3-year duration with AAA, or a yield-chase with thin names. The factsheet's Macaulay duration and the top holdings are the cameras. Yield is the advertisement.",
    covers: ["Duration dial.", "Credit dial.", "Yield is not the expected return after credit events."],
    blocks: [
      { t: "p", text: "If you needed T-bill-like behaviour, you wanted a liquid or a T-bill fund, not a 6.8% 'short duration' that owns credit. The extra 80 bp is a coupon for a jump. See Rates. Households that learned this in a credit event learned it expensive." },
    ],
    takeaways: ["Two dials.", "Yield is an ad.", "Match the product to the liability."],
    quiz: { q: "Picking a debt fund solely on advertised yield usually means you ignored:", options: ["The AMFI logo", "Duration and credit — the two risks that pay that yield", "Nifty OI", "India VIX"], answer: 1, why: "Yield is compensation for those dials." },
  },
  "funds-18": {
    lead: "Factor/smart-beta ETFs (momentum, quality, value, low-vol) are recipes with a rebalance calendar and a tracking residual. They are not magic. They are a named factor plus costs plus a crowd at the rebalance. If you cannot write why that factor should earn a rupee in India over your horizon, you wanted Nifty BeES.",
    covers: ["Factor is a recipe.", "Rebalance is a crowd.", "Costs and crowding can eat the textbook premium."],
    blocks: [
      { t: "p", text: "Momentum ETFs can gap around the review. Low-vol can lag a melt-up for a year and still be doing the job. If you fire a factor for a year of lag, you never had a factor — you had a performance-chasing SIP. Put the factor in the IPS with a five-year clock or don't buy it." },
    ],
    takeaways: ["Named factor + calendar.", "Don't fire a factor for a year of lag.", "BeES remains the default core."],
    quiz: { q: "Selling a momentum ETF after 11 months of lag versus Nifty, against a five-year IPS clock, is usually:", options: ["Discipline", "Firing a factor for a sample that was too short", "A pair", "Tax alpha"], answer: 1, why: "The IPS clock was the rule." },
  },

  "sectors-09": {
    lead: "PSU banks versus private banks are different animals: deposit franchise, treasury duration, governance, and the state's hand. 'Banks' as a sector bet that ignores this split is a slogan. Advanced sector work starts with the split, then NIM, then credit costs.",
    covers: ["Split PSU vs private vs wholesale NBFC.", "Treasury marks vs core NIM.", "State as a shareholder is a feature and a risk."],
    blocks: [
      { t: "p", text: "A gilt sell-off hits PSU treasuries differently from a deposit-rich private book. A credit cycle hits unsecured retail differently from a PSU agri overhang. Your Bank Nifty ticket is a blend. Your stock ticket should not be." },
    ],
    takeaways: ["Split the banks.", "Treasury vs NIM.", "BN is a blend."],
    quiz: { q: "A gilt shock will often first print on:", options: ["CASA of a retail private bank", "Marked gilt books — often heavier in some PSU books", "India VIX only", "Gold BeES"], answer: 1, why: "Duration marks now." },
  },
  "sectors-10": {
    lead: "NBFC ALM is the job: assets that live longer than liabilities, wholesale funds that vanish, and a CP camera you met in Rates. An NBFC 'cheap on book' with a 1-year liability stack funding 5-year assets is not cheap. It is a fuse.",
    covers: ["ALM mismatch is the risk.", "Wholesale vs deposit-like.", "CP prints before the rating language."],
    blocks: [
      { t: "p", text: "Read the liability mix in the presentation. If 'we will always roll CP' is the strategy, you are long a weather system. Size accordingly, or don't. 2018-style events don't email you first." },
    ],
    takeaways: ["ALM is the name.", "Roll-risk is the fuse.", "Cheap book can be a mismatch."],
    quiz: { q: "A 'cheap' NBFC funding 5-year assets with 3-month CP is primarily:", options: ["Efficient ALM", "A roll-risk fuse that can reprice the equity first", "A G-Sec substitute", "A pair vs Nifty"], answer: 1, why: "Liabilities can leave before assets do." },
  },
  "sectors-11": {
    lead: "Life-insurance 'embedded value' and general-insurance combined ratios are the cameras, not the monthly premium advertisement. If you cannot explain EV movement in one paragraph, you are buying a story about 'underpenetration' that everyone already owns.",
    covers: ["EV / VNB margins for life.", "Combined ratio and float for general.", "Rate cycles exist."],
    blocks: [
      { t: "p", text: "Underpenetration is a poster that has been true for decades. Your edge, if any, is VNB quality, persistency, and whether the market already paid for the poster. Pay for cameras, not for a map of India with 'low insurance' written on it." },
    ],
    takeaways: ["EV and combined ratio.", "Poster ≠ edge.", "Persistency is a camera."],
    quiz: { q: "'India is underpenetrated in insurance' as a standalone buy thesis is:", options: ["A complete model", "A poster the street already has — you still need EV/quality cameras", "A G-Sec", "A VIX trade"], answer: 1, why: "Known stories need a residual camera." },
  },
  "sectors-12": {
    lead: "Realty is a cycle of launches, unsold inventory, funding, and regulation (RERA). A 'housing supercycle' slogan without unsold months and cashflow after construction spend is a brochure. Pre-sales that never convert to collections are a working-capital game in concrete.",
    covers: ["Unsold inventory months.", "Collections vs pre-sales.", "RERA and funding are constraints."],
    blocks: [
      { t: "p", text: "Look at completed unsold, under-construction, and collections. A developer who launches to print pre-sales and then sits on cash-poor completion is a story you can skip. Land banks that never become projects are posters." },
    ],
    takeaways: ["Inventory and collections.", "Launches ≠ cash.", "Cycle, not slogan."],
    quiz: { q: "Pre-sales up 80% while collections and completed unsold look ugly is primarily:", options: ["A supercycle proof", "A possible brochure-versus-cash gap", "RERA certification", "A pair vs Nifty"], answer: 1, why: "Pre-sales can print without cash completing." },
  },
  "sectors-13": {
    lead: "Capital goods and industrials live on order books, execution, and working capital. A record order book with stretching receivables is a stuffed future. Execution and cash conversion are the cameras. 'India capex supercycle' is the poster.",
    covers: ["Order book quality (cancellable?).", "Execution cycle.", "WC as a fuse."],
    blocks: [
      { t: "p", text: "Ask: whose capex (govt, private, export), how long to execute, and whether the customer can pay. A PSU order that pays slow is not the same as an export order with advances. Mix matters more than the headline number." },
    ],
    takeaways: ["Order quality.", "Execution + cash.", "Poster is not a ticket."],
    quiz: { q: "Record order book plus receivable days exploding usually warns that:", options: ["The supercycle is confirmed", "Cash conversion may be the real story", "Capex is prepaid", "VIX fell"], answer: 1, why: "Orders without cash are a working-capital game." },
  },
  "sectors-14": {
    lead: "Chemicals and some speciality names are China-supply, spread, and environmental-permission businesses. A spread compression can kill a 'great management' story in a quarter. If you cannot name the spread (product minus input) you do not have a chemicals thesis.",
    covers: ["Named spread.", "China as supply and demand.", "Permissions and plant utilisation."],
    blocks: [
      { t: "p", text: "When China restarts a plant, your speciality margin can go from hero to footnote. That is not unfair. That is the industry. Size as a spread business, or skip because you cannot track the spread without a sell-side crib — and then you don't have an edge, you have a crib." },
    ],
    takeaways: ["Name the spread.", "China is a boss.", "No spread, no thesis."],
    quiz: { q: "A speciality chemical long without a named product-minus-input spread is:", options: ["A quality compounder by default", "Usually a poster — you don't know the P&L engine", "A G-Sec", "A Nifty hedge"], answer: 1, why: "The engine is the spread." },
  },

  "regulations-09": {
    lead: "PIT (Prohibition of Insider Trading) and UPSI are not only for people with 'insider' on their visiting card. If you are a connected person, a consultant, or you just learned something material non-public, the law is the stop. This chapter sits next to Research craft ethics — one is law, one is IPS.",
    covers: ["UPSI: unpublished, price-sensitive.", "Trading plans and windows for designated persons.", "You don't need a title to be in trouble."],
    blocks: [
      { t: "p", text: "If you are not a designated person, you still cannot trade on UPSI you received. Tips from a cousin who 'heard from finance' are a career-ending cheap thrill. The advanced desk's edge is public process. Repeat it until it is boring." },
    ],
    takeaways: ["UPSI = stop.", "Titles optional.", "Public process is the edge."],
    quiz: { q: "A cousin 'in finance' tells you a number not yet filed and you buy is:", options: ["Alpha", "A legal and career problem — stop", "A pair", "A delivery LTCG trick"], answer: 1, why: "MNPI is not an edge." },
    sources: [SEBI],
  },
  "regulations-10": {
    lead: "Peak margin and VAR+ELM are why your broker can square you off on a quiet-looking day. SPAN on F&O plus haircuts on stocks are a daily conversation. Sitting at 95% of available margin is a strategy the broker will finish for you.",
    covers: ["Peak margin is intra-day, not just EOD.", "VAR+ELM on cash.", "Buffer is part of size (see Futures-10)."],
    blocks: [
      { t: "p", text: "Intraday 'I always use the full limit' is how a two-sided book meets a peak-margin shortfall at 11:40. Keep a buffer as a written percentage. If the platform offers 5×, your IPS offers 1× or less. The rest is a museum of liquidations." },
    ],
    takeaways: ["Peak is intra-day.", "Don't use the full limit.", "Buffer is size."],
    quiz: { q: "Using 95% of the broker's intra-day limit as a habit means:", options: ["Optimal Kelly", "A peak-margin or SPAN hike can let the broker trade your book", "Zero risk", "A G-Sec"], answer: 1, why: "No buffer." },
    sources: [SEBI, NSE],
  },
  "regulations-11": {
    lead: "Broker default is a tail you hedge with behaviour: don't leave idle cash at a broker beyond need, understand IPEF/settlement guarantee at a high level, and never keep unique assets only in one flaky place. This is operations, not paranoia.",
    covers: ["Idle cash is a credit to the broker.", "Know the difference between your demat (depository) and the broker's pool.", "Diversify access, not just stocks."],
    blocks: [
      { t: "p", text: "Securities in your demat with a depository participant are a different residual from surplus cash sitting as a ledger balance. Sweep idle cash out. Don't get cute with unregistered 'advisory' apps that want your OTP." },
    ],
    takeaways: ["Sweep idle cash.", "Demat ≠ ledger cash.", "OTP is a vault key."],
    quiz: { q: "Leaving a year's living expenses as unused ledger cash at a broker is:", options: ["Efficient", "An unpriced credit exposure — sweep it", "IPEF-required", "A hedge"], answer: 1, why: "You lent the broker money without a credit thesis." },
    sources: [SEBI],
  },
  "regulations-12": {
    lead: "Nomination, transmission, and account hygiene are part of a household desk. A trading account without a nomination is a gift to paperwork and delay. This is not glamorous. It is how families don't fight a broker instead of a market.",
    covers: ["Nomination on trading, demat, funds, NPS.", "Keep a one-page map of accounts.", "Passwords and OTPs are estate issues too."],
    blocks: [
      { t: "p", text: "Once a year: list every demat, trading, MF folio, NPS, SGB, and bank used for settlement. Nominations, joint vs single, and where the 2FA lives. Put the list where a spouse can find it. That is advanced operations. A new indicator is not." },
    ],
    takeaways: ["Nomination is a control.", "Yearly account map.", "2FA is part of estate."],
    quiz: { q: "A sole trading account with no nomination is primarily a risk to:", options: ["Nifty OI", "Your family's time and access when you cannot click", "India VIX", "SPAN"], answer: 1, why: "Hygiene is the trade." },
    sources: [SEBI],
  },

  "commodities-15": {
    lead: "MCX options are options: defined if you buy or spread, a jump-sale if you naked-short a thin metal. Liquidity is name- and strike-specific. A gold option with a 8-rupee spread is not a Nifty weekly. If you cannot exit, you do not have a strategy.",
    covers: ["Spread first.", "Defined unless you are a hedger with inventory.", "Event vol on geopolitics and USDINR."],
    blocks: [
      { t: "p", text: "Importers of bullion and industrials use these as hedges. You, without inventory, are spec. Size 1R on the defined max loss, and skip strikes where the bid-ask is a double-digit percentage of premium." },
    ],
    takeaways: ["Liquidity is the product.", "Defined for specs.", "Spread can be the whole TER."],
    quiz: { q: "Naked-shorting a thin MCX option because 'theta looks good' is:", options: ["Carry", "A jump-sale in a book you may not exit", "A G-Sec", "Required for hedgers"], answer: 1, why: "Thin + naked + jump." },
    sources: [MCX],
  },
  "commodities-16": {
    lead: "COMEX–MCX is a conversion plus a residual, not an arb you will run from a phone. ABC already sketches rupee gold from COMEX × USDINR. The residual can stay because of duties, hours, and official flow. Don't treat a 0.4% gap as free money.",
    covers: ["Conversion is an estimate.", "Duties and hours break arb.", "Residual can persist."],
    blocks: [
      { t: "p", text: "If MCX is rich to the sketch, possible stories: rupee, local demand, lag, duties. A retail short-MCX / long-COMEX fantasy ignores that you don't have COMEX. Write a view on the residual or skip. Don't dress it as arb (see RelVal). " },
    ],
    takeaways: ["Sketch ≠ arb.", "Residual persists.", "No COMEX leg, no arb."],
    quiz: { q: "Shorting MCX gold because it is 0.5% over a COMEX×USDINR sketch, with no COMEX leg, is:", options: ["Classic arb", "A directional MCX view with an arb story", "Risk-free", "A BeES"], answer: 1, why: "One leg is a view." },
  },
  "commodities-17": {
    lead: "Agri seasonality is real and still a way to lose money. Warehouse receipts, MSP, monsoon, and bans are the cameras. A 'sugar always rallies in X month' table without the year's monsoon and policy is a calendar superstition.",
    covers: ["Seasonality is a prior, not a ticket.", "Policy can suspend the prior.", "Delivery intent vs spec (you already met this)."],
    blocks: [
      { t: "p", text: "If you do not have a weather and policy sheet, you do not have an agri desk. Equity people who 'diversify' into agri weeklies are usually selling a jump they cannot name. Skip is allowed." },
    ],
    takeaways: ["Seasonality is a prior.", "Policy overrides.", "Skip is a desk."],
    quiz: { q: "Buying an agri future solely because 'this month is historically strong' is:", options: ["A complete agri desk", "A prior without this year's monsoon/policy cameras", "A G-Sec", "A pair vs Nifty"], answer: 1, why: "This year can suspend the table." },
    sources: [MCX],
  },
  "commodities-18": {
    lead: "Energy cracks and spreads (crude vs gasoil/gasoline conceptually, crude vs NG) are how professionals think. A crude long and an OMC long is often the same oil-beta twice. Name the crack or name the duplicate.",
    covers: ["Don't double oil-beta by accident.", "NG is a different jump animal from crude.", "Refinery margin is a spread, not a slogan."],
    blocks: [
      { t: "p", text: "If you are long crude futures and long an OMC, you may be long oil and short crack (OMC hurt when crude rips without pricing power). That mix can be a hedge or a mess. Write it. The Commodities strategy card on ABC is a fill sheet — use it." },
    ],
    takeaways: ["Name the crack.", "Don't double oil-beta.", "NG ≠ crude."],
    quiz: { q: "Long crude futures and long an OMC into a crude spike is often:", options: ["A perfect hedge", "Long oil plus a crack residual that can hurt the OMC", "Market-neutral", "A VIX trade"], answer: 1, why: "OMC is not a crude clone." },
  },

  "ai-07": {
    lead: "RAG on filings (retrieval-augmented generation) is the honest use of AI on a desk: the model must quote the PDF you retrieved, not a memory of a 2021 annual report. If it cannot show the paragraph, it is not research. It is a parrot.",
    covers: ["Retrieve then generate.", "Citations or it didn't happen.", "Hallucinated numbers are a risk event."],
    blocks: [
      { t: "p", text: "ABC's copilot is a copilot. Your rule: any number an AI states about a company must be checkable in a filing you have open. If you cannot click through, you cannot size. That gate is the whole AI track's punchline." },
    ],
    takeaways: ["Cite the PDF.", "No citation, no size.", "Hallucination is a risk event."],
    quiz: { q: "An AI-stated PAT figure with no filing paragraph attached is:", options: ["Fine if the model is large", "Not research — you cannot size it", "A SEBI number", "A pair"], answer: 1, why: "Uncited numbers are parrots." },
  },
  "ai-08": {
    lead: "Prompt hygiene: ask for cameras, kills, and what would falsify — not for 'what should I buy'. The model will happily sell you a story. Your job is to force it into the course's card shape.",
    covers: ["Card-shaped prompts.", "Falsification first.", "No 'what should I buy'."],
    blocks: [
      { t: "p", text: "Bad: 'Give me 5 Nifty options for tomorrow.' Good: 'Here is the chain snapshot and my IPS (defined only, 1R ₹X). List which named structures fit a range view with vol rich, and which fields I still must fill.' The second prompt cannot click for you. That is the point." },
    ],
    takeaways: ["Force the card.", "Ask for falsifiers.", "No order-button prompts."],
    quiz: { q: "'What should I buy tomorrow in Nifty?' as a prompt is:", options: ["Professional", "Outsourcing the IPS — refuse that shape", "A hedge", "Required"], answer: 1, why: "The model will invent a story." },
  },
  "ai-09": {
    lead: "Evaluate the copilot like a junior: sampled tickets, cited numbers, killed theses. If it is wrong 3/10 on numbers, it is a search box, not a junior. Don't promote a search box to 'the desk'.",
    covers: ["Sampled evaluation.", "Number error rate.", "Promotion criteria."],
    blocks: [
      { t: "p", text: "Once a month: 10 questions with known answers from filings. Score citations and numbers. If it fails, you still use it to draft sentences you verify. You do not use it to draft sizes." },
    ],
    takeaways: ["Score it.", "Draft ≠ size.", "Juniors get reviewed."],
    quiz: { q: "If the copilot flubs 4 of 10 filing numbers, you should:", options: ["Let it size weeklies", "Keep it as a drafter you verify, not as a number source", "Fire the IPS", "Increase lots"], answer: 1, why: "Error rate is the job grade." },
  },
  "ai-10": {
    lead: "When not to use AI: live order routing, peak-margin minutes, MNPI, and anything where a confident sentence would rush a click. The model is patient. You are not, at 9:16. That's why the gate is human and pre-trade.",
    covers: ["No live routing.", "No MNPI in prompts (leakage and law).", "No 9:16 chat as a substitute for the open card."],
    blocks: [
      { t: "p", text: "Pasting an unpublished number into a cloud prompt can be a leak. Don't. And don't argue with the model during a spike. Flatten or wait. The chat is not a kill switch." },
    ],
    takeaways: ["Human gate.", "No MNPI in prompts.", "No spike-chat."],
    quiz: { q: "Pasting unpublished, price-sensitive numbers into a cloud AI prompt is:", options: ["Clever RAG", "A leak and a process break — don't", "Required for citations", "A pair"], answer: 1, why: "MNPI and vendors don't mix." },
  },

  "modelling-09": {
    lead: "A bank model is not a three-statement industrial model. It is NIM, credit costs, treasury, and capital. If you force a DCF with 'FCF' on a bank, you will invent a number the business does not throw off that way. Use residual income or a dividend-discount-with-capital-constraint — or skip the DCF theatre.",
    covers: ["Banks ≠ FCF machines.", "Capital is the constraint.", "Split NIM / credit / treasury."],
    blocks: [
      { t: "p", text: "If you cannot model CET-1 as a constraint, you do not have a bank DCF. You have an industrial template with a bank logo. That's worse than a multiple versus book with a governance haircut." },
    ],
    takeaways: ["Don't FCF a bank.", "Capital constraint.", "Multiple + cameras can beat a fake DCF."],
    quiz: { q: "Running a standard industrial FCF DCF on a deposit-taking bank is usually:", options: ["Best practice", "The wrong engine — banks are NIM/credit/capital animals", "Required by SEBI", "A pair"], answer: 1, why: "The cash engine is different." },
  },
  "modelling-10": {
    lead: "Residual income (earnings minus a charge on equity) is often the honest bank/NBFC frame. It forces you to name the cost of equity and the excess return. If excess return is zero, the 'cheap P/B' is a fair P/B.",
    covers: ["RI = PAT − r_e × book.", "Cheap P/B with no excess return is a trap.", "r_e is a camera, not a decoration."],
    blocks: [
      { t: "formula", expr: "Residual income ≈ PAT − (cost of equity × opening equity)", meaning: "If this is structurally ~0, paying 1.0× book is paying for 'a bank exists', not for a compounding machine." },
    ],
    takeaways: ["Name r_e.", "P/B needs excess return.", "RI is an honest frame."],
    quiz: { q: "A bank at 1.0× book with residual income structurally near zero is:", options: ["Deep value always", "Often fairly priced for zero excess return", "A G-Sec", "A VIX long"], answer: 1, why: "P/B is a function of excess return." },
  },
  "modelling-11": {
    lead: "Circularity (interest depends on debt depends on cash depends on interest) is why three-statement models iterate. If you plug a number to 'make it balance', you hid a hole. Plug flags are a process break.",
    covers: ["Iterate, don't plug.", "Balance-sheet plugs are a smell.", "Interest and cash sweep last."],
    blocks: [
      { t: "p", text: "A professional model shows the plug if any remains, and you are not allowed to size off a model with a silent plug. That is model hygiene from Modelling-08, now as a hard gate." },
    ],
    takeaways: ["No silent plugs.", "Iterate interest/cash.", "Hygiene is a gate."],
    quiz: { q: "A three-statement model that 'balances' because of a hidden plug should be used to size:", options: ["Freely", "Not at all until the plug is visible and understood", "Weeklies only", "A pair"], answer: 1, why: "You don't know which camera is fake." },
  },
  "modelling-12": {
    lead: "A model without a one-page (Research craft) is a hobby. Compress: three drivers, two risks, one kill, the implied multiple, and what the street has to be wrong about. If the model cannot compress, you will not use it live.",
    covers: ["Compression is the test.", "Implied multiple from the DCF.", "Street-wrong sentence."],
    blocks: [
      { t: "p", text: "Write: 'This DCF needs 14% revenue CAGR and stable WC to justify last price; street has 11%; kill if WC days +10.' That sentence is the model. The tabs are the appendix." },
    ],
    takeaways: ["Compress or don't trade.", "Implied vs street.", "Kill from a driver."],
    quiz: { q: "The live product of a model is:", options: ["The 19th tab", "A compressed sentence with drivers, implied price, and a kill", "The Monte Carlo GIF", "The logo"], answer: 1, why: "Tired-you needs a sentence." },
  },

  "bonds-09": {
    lead: "A butterfly on the G-sec curve (long belly, short wings, or the reverse) is a curvature view. It is not 'I like bonds'. If you cannot name curvature, you wanted a duration ETF or a gilt fund with a duration number.",
    covers: ["Curvature is a third risk.", "Net duration of a butterfly can sneak.", "Retail usually wants level, not a butterfly."],
    blocks: [
      { t: "p", text: "Most household books should not run butterflies. They should name duration and credit (Funds-17) and stop. This chapter exists so you don't get sold a 'barbell strategy' that is a curvature spec in a wrapper." },
    ],
    takeaways: ["Butterflies are curvature.", "Households: duration + credit.", "Wrappers can hide specs."],
    quiz: { q: "A 'barbell' debt fund that is secretly a curvature spec is:", options: ["The same as a gilt index", "A different risk than advertised duration — read holdings", "A Nifty hedge", "Tax-free"], answer: 1, why: "Species must match the label." },
  },
  "bonds-10": {
    lead: "T-bill auctions are a calendar of short-end supply. Cut-off yields are a camera for money-market funds and for 'where is the floor versus the corridor'. You don't need to bid. You need to read the cut-off when your liquid fund is the ballast.",
    covers: ["Cut-off is a print.", "Auction calendar.", "Ballast funds live here."],
    blocks: [
      { t: "p", text: "If cut-offs are jumping while RBI looks on hold, the short end is telling you about liquidity, not about the GIF. See Rates-02. Your liquid-fund TER better be worth this camera being boring." },
    ],
    takeaways: ["Cut-off is a camera.", "Short end can move on hold.", "Ballast is allowed to be boring."],
    quiz: { q: "T-bill cut-offs jumping with repo unchanged primarily camera:", options: ["Nifty OI", "Short-end liquidity / supply, not the MPC GIF", "Gold jewellery", "Max pain"], answer: 1, why: "Operations vs integer." },
    sources: [RBI],
  },
  "bonds-11": {
    lead: "Inflation-indexed or floating-rate government paper (when issued) is a different duration animal. Treating it like a fixed 10-year is how people get the sign of the trade wrong. Read the reset, the index, and the lag.",
    covers: ["Know the index and the lag.", "Not a fixed gilt clone.", "Useful as a named sleeve, not as a toy."],
    blocks: [
      { t: "p", text: "If you wanted inflation protection, confirm the product still exists in the form you think, then size as ballast. Don't buy a lookalike corporate floater with credit risk and call it a government inflation hedge." },
    ],
    takeaways: ["Reset rules.", "Don't mix with credit floaters.", "Ballast, not a toy."],
    quiz: { q: "A corporate floater with credit risk is:", options: ["The same as a government inflation-indexed gilt", "A different species — credit + reset, not a sovereign inflation clone", "A BeES", "A VIX"], answer: 1, why: "Credit is a camera gilts don't have." },
  },
  "bonds-12": {
    lead: "Credit-spread duration is how much you lose when spreads blow. A 4-year credit with 80 bp spread has a different shock cell from a 4-year AAA. If the factsheet won't give you a spread-duration sketch, assume pain and size the satellite smaller.",
    covers: ["Spread duration ≠ interest duration.", "Shock spreads in a risk-off.", "Satellites stay small."],
    blocks: [
      { t: "formula", expr: "Sketch: Δvalue ≈ −spread duration × Δspread", meaning: "A 4-year spread duration on +100 bp credit shock is about −4% before default. Default is extra." },
    ],
    takeaways: ["Spread duration is a number.", "Default is extra.", "Small satellite."],
    quiz: { q: "A credit fund's −5% NAV week while G-secs rallied is often:", options: ["NAV fraud always", "Spread (and maybe credit) duration doing its job in risk-off", "A Nifty circuit", "A pair vs gold"], answer: 1, why: "Spread is a separate P&L." },
  },

  "volatility-11": {
    lead: "India VIX versus the weekly ATM straddle is two cameras on the same weather. VIX is ~30-day. The weekly straddle is this week's jump. A quiet VIX with a rich weekly is a week-specific event. A spiked VIX with a cheap weekly is a term-structure story. Don't mix them in one slogan.",
    covers: ["Tenor match.", "Event in the weekly not in VIX.", "Use both or say which."],
    blocks: [
      { t: "p", text: "RBI Thursday: weekly straddle can be rich while VIX barely moved. Selling 'VIX is 13 so vol is cheap' that week is the wrong tenor. Buy or skip the event, don't sell it because a 30-day thermometer looks calm." },
    ],
    takeaways: ["Match tenor.", "Weekly ≠ VIX.", "Event weeks are weekly cameras."],
    quiz: { q: "Selling a rich RBI-week straddle because India VIX is 13 is:", options: ["Tenor-correct", "Using a 30-day camera to sell a 2-day jump", "A G-Sec", "Required"], answer: 1, why: "Wrong thermometer." },
  },
  "volatility-12": {
    lead: "Vol-of-vol is how jumpy the thermometer is. A VIX that went 11→18→12 in eight sessions is a different desk from a VIX that sat at 13 for a month. Short vol in a high vol-of-vol regime is a jump-sale even if VIX 'looks high' (rich can get richer).",
    covers: ["Regime of the thermometer.", "Rich can richer.", "Size short vol on vol-of-vol, not on a level slogan."],
    blocks: [
      { t: "p", text: "Rule sketch: if 1-month realised of VIX itself is elevated, cut short-vol size in half or go defined-only. You are not paid extra for heroism in a noisy thermometer." },
    ],
    takeaways: ["Vol-of-vol is a regime.", "Cut size when the thermometer jumps.", "Defined-only is allowed."],
    quiz: { q: "VIX oscillating 11–18 every week while you sell naked strangles is:", options: ["Harvesting richness", "Selling jumps in a high vol-of-vol regime", "A gilt", "A pair"], answer: 1, why: "The thermometer is the jump." },
  },
  "volatility-13": {
    lead: "Weekend and holiday theta is not a gift if the jump moved. Indian weeks have a Saturday-Sunday and often a regional holiday. Short vol over a long weekend into a geopolitics tape is a three-day jump for two days of theta. Count the calendar, not the GIF of 'theta positive'.",
    covers: ["Calendar days vs sessions.", "Event on the other side of a holiday.", "If the jump is on Monday, Sunday theta is not your friend."],
    blocks: [
      { t: "p", text: "Expiry on Tuesday (Nifty weekly) or Thursday (Sensex weekly), geopolitics on a Friday night, market closed Monday: leftover short premium is a weekend product. Flatten before the gap or hold with a shock cell that includes Monday. 'Theta over the weekend' is how people pay Monday." },
    ],
    takeaways: ["Count closed days.", "Monday jumps eat Sunday theta.", "Flatten or size the holiday."],
    quiz: { q: "Holding a short weekly over a long weekend into a known event is:", options: ["Free theta", "A multi-day jump sale — size or flatten", "A SIP", "A G-Sec"], answer: 1, why: "Closed days still have news." },
  },
  "volatility-14": {
    lead: "Event-vol crush: implied stays bid into the print, then dumps if the print is 'inside' the implied move. Buying the straddle the morning of results without a view that the real move > implied is how people donate crush. You met this in Specials-02. Here is the vol-desk version with a number.",
    covers: ["Implied move vs your move.", "Crush is the default after a quiet print.", "Defined directional can beat a straddle if you have a side."],
    blocks: [
      { t: "formula", expr: "Straddle-implied move ≈ ATM straddle / spot", meaning: "If the weekly ATM is ₹180 on Nifty 24,000, the market prices ~0.75% (plus the rest of the surface). If you think the print is a 0.4% event, you do not buy that straddle." },
      { t: "example", title: "Inside the move", body: "Implied 0.9%, print 0.3%, IV crushed 8 vol points. Long straddle dies of vega even if you 'sort of' had the side. A debit spread with a side would have been the card — or a skip." },
    ],
    takeaways: ["Compare implied vs your move.", "Crush is the default.", "Side + defined can beat a straddle."],
    quiz: { q: "Buying a results-day straddle when you think the print is smaller than the implied move is:", options: ["A vol-edge", "Paying for a jump you don't believe — skip or sell defined if that's your IPS", "Mandatory", "A pair vs gold"], answer: 1, why: "You are long a jump you think won't happen." },
  },

  "options-19": {
    lead: "Synthetics: long call + short put ≈ long future (same strike/expiry), plus carry details. Accidental synthetics happen when you 'just sell a put' under a long call you forgot. P&L attribution will look like a future. Name it or you will size it like a defined debit.",
    covers: ["Conversion/reversal cousins (see options-13).", "Accidental beta.", "Margin will tell on you."],
    blocks: [
      { t: "p", text: "If the book is long 24,200 CE and short 24,200 PE, you are approximately long the future. SPAN will ask for futures-like margin. If you thought you were 'defined', the platform disagrees. Flatten one leg or write 'synthetic long' on the card." },
    ],
    takeaways: ["Synthetics are futures in costume.", "Margin is a camera.", "Name accidental beta."],
    quiz: { q: "Long ATM call + short ATM put, same expiry, is approximately:", options: ["A defined condor", "A synthetic long future", "A gilt", "A VIX"], answer: 1, why: "Put-call parity's living cousin." },
  },
  "options-20": {
    lead: "A box (bull call + bear put at the same strikes) is a locked-rate trade in textbooks. In Indian weeklies with spreads and STT, the box is often a fee machine, not a cash-and-carry. If the box isn't paying after costs, you don't have a box. You have four tickets.",
    covers: ["Boxes need rates and tight markets.", "Costs kill retail boxes.", "Don't assemble one by accident."],
    blocks: [
      { t: "p", text: "If you find a 'mispriced' box on a weekly chain, compute STT (0.15% of premium sold, as of Apr 2026), stamp, and two bid-asks. The mispricing had to be larger than that stack. Usually it isn't. Skip." },
    ],
    takeaways: ["Costs eat boxes.", "Don't accidental-box.", "Textbook ≠ weekly chain."],
    quiz: { q: "A 4-legged weekly 'box' with 0.4% of edge before costs in India is usually:", options: ["Risk-free alpha", "A fee machine once STT and spreads hit", "A G-Sec clone", "Required"], answer: 1, why: "The stack is the trade." },
  },

  "desk-13": {
    lead: "A weekly review is 25 minutes: process grades, WIP, event calendar, tax parking, and one mutation max. If the review is a 3-hour self-argument, you are bargaining, not reviewing. Timer, card, done.",
    covers: ["Timer.", "One mutation.", "Calendar next week."],
    blocks: [
      { t: "steps", title: "25-minute weekly", items: [
        "Process grades: count A/B/C. If C>20%, next week is half size.",
        "WIP kanban: promote, kill, wait.",
        "Calendar: RBI, results, US prints, holidays.",
        "Tax parking check.",
        "At most one playbook mutation, versioned (Desk-12).",
      ] },
    ],
    takeaways: ["Timer is governance.", "Half size after C-weeks.", "One mutation."],
    quiz: { q: "A 3-hour Sunday rewrite of five setups after a −2R week is usually:", options: ["Professional", "Bargaining — cap mutations at one, or rest", "Walk-forward", "A pair"], answer: 1, why: "Review ≠ a new personality." },
  },
  "desk-14": {
    lead: "Apprenticeship 2.0: after the 90-day plan (Desk-08), the next 90 is one product, one session, one review cadence. Adding BN weeklies, gold, and a smallcap long book in week 14 is how people stay perpetual beginners. Depth is the creativity.",
    covers: ["One product to competence.", "Add by IPS, not by boredom.", "Competence = a sample with costs and a kill history."],
    blocks: [
      { t: "p", text: "You are competent in a product when you can fill its card in 4 minutes, you have 40 tickets with grades, and your kills fired without negotiation. Until then, 'adding a sleeve' is tourism. Tourism is expensive in F&O." },
    ],
    takeaways: ["Depth before width.", "Competence is a sample.", "Tourism is a cost."],
    quiz: { q: "Adding three new F&O underlyings in a week because Nifty felt boring is:", options: ["Growth", "Tourism — you reset the sample", "A hedge", "Required"], answer: 1, why: "Boredom is not a product launch." },
  },

  "library-05": {
    lead: "Advanced field glossary — not to memorise, to recognise on a desk: basis, residual, peak margin, UPSI, iNAV, SDF, MSF, VNB, ALM, spread duration, vol-of-vol, synthetic, box, implied move, days-to-exit, WIP, kill. If a word on this list shows up in a ticket without a number, the ticket is not finished.",
    covers: ["Words need numbers.", "Glossary is a gate, not a quiz-night.", "Official links still live in Library-01."],
    blocks: [
      { t: "table", caption: "Word → number", headers: ["Word", "Needs"], rows: [
        ["Basis", "Points vs fair, costs"],
        ["Residual", "Units and kill"],
        ["Peak margin", "Buffer %"],
        ["Implied move", "% vs your move"],
        ["Days-to-exit", "Days at 20% volume"],
        ["WIP", "Count vs cap"],
      ] },
      { t: "p", text: "Official classrooms remain NSE Learn, SEBI investor, NISM, MCX. This course is original ABC language. Use both. Don't pirate PDFs. Don't treat this glossary as a regulator." },
    ],
    takeaways: ["Word without number = unfinished.", "Official classrooms still win on law.", "No piracy."],
    quiz: { q: "A ticket that says 'basis rich' with no points and no cost hurdle is:", options: ["Advanced jargon", "Unfinished — the word needed a number", "A G-Sec", "SEBI-complete"], answer: 1, why: "Glossary is a gate." },
    sources: [NSE, SEBI, NISM],
  },
});

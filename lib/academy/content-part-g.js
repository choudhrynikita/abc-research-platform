const { expandLesson } = require("./expand");

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "bonds-01": {
    lead: "A bond is a loan you can often sell. The issuer promises coupons and principal (unless they default). Price on the screen is the market's view of that promise, discounted.",
    covers: ["Face value, coupon, maturity.", "Issuer: government vs company.", "You can lose money if you sell before maturity after rates rise."],
    blocks: [
      { t: "p", text: "Buy a 7% G-Sec at face value, hold to maturity, and you collect 7% (subject to tax). Buy the same bond after prices have risen and the yield you actually earn (yield to maturity) is lower. Bonds are maths plus credit, not a 'safe SIP'." },
    ],
    takeaways: ["Bond = loan with a market price.", "Hold-to-maturity and mark-to-market are different experiences.", "Credit risk is real on corporates."],
    quiz: { q: "If you sell a G-Sec before maturity after yields have risen, you may:", options: ["Only make a profit", "Sell below what you paid — a capital loss", "Force RBI to cancel the bond", "Convert it to equity"], answer: 1, why: "Price and yield move inversely." },
  },
  "bonds-02": {
    lead: "When yields go up, existing bond prices go down. Duration is a first-order map of how much. Long duration is a bet on falling yields (or a willingness to sit through the mark).",
    covers: ["Yield to maturity.", "Macaulay / modified duration as sensitivity.", "Convexity is the curve beyond the first order."],
    blocks: [
      { t: "formula", expr: "ΔPrice ≈ −Duration × ΔYield × Price", meaning: "A rough linear map. Big yield jumps need convexity. This is why long-bond funds fell when rates rose." },
      { t: "p", text: "A 10-year G-Sec moves more for a 1% yield change than a 91-day T-bill. If you need the money in six months, do not own a 30-year duration product just because last year's return looked pretty." },
    ],
    takeaways: ["Price and yield are inverse.", "Duration is interest-rate sensitivity.", "Match duration to horizon."],
    quiz: { q: "Rates jump 1%. A long-duration bond fund will typically:", options: ["Rise in NAV", "Fall in NAV", "Turn into equity", "Be frozen by SEBI automatically"], answer: 1, why: "Duration maps the hit." },
  },
  "bonds-03": {
    lead: "G-Secs are loans to the Government of India. They sit at the centre of India's rupee rate market. RBI's auctions and operations set a lot of the weather.",
    covers: ["Central government credit versus states.", "How retail can access (RBI Retail Direct, gilt funds).", "Benchmark for other rupee yields."],
    blocks: [
      { t: "p", text: "A G-Sec still has price risk if you trade it. What it does not have, in ordinary conversation, is the same default debate as a small corporate. That is why it is the benchmark other bonds spread off." },
    ],
    takeaways: ["G-Secs are the rupee risk-free complex.", "Price still moves.", "RBI is part of the tape."],
    quiz: { q: "A 10-year G-Sec is best described as:", options: ["Default-free in the casual sovereign sense, but not mark-to-market-free", "A Nifty option", "A fixed NAV forever", "An IPO"], answer: 0, why: "Sovereign credit vs rate risk are different." },
  },
  "bonds-04": {
    lead: "T-bills are short sovereign paper. SDLs are state development loans. Corporate bonds add credit spread. Each is a different risk sleeve.",
    covers: ["T-bills: discount instruments, short tenor.", "SDLs: state credit, usually a spread over G-Secs.", "Corporates: read the rating and the business."],
    blocks: [
      { t: "table", caption: "Map", headers: ["Paper", "Main extra risk vs T-bill"], rows: [["G-Sec long bond", "Duration"], ["SDL", "State + duration"], ["AAA corporate", "Small credit + liquidity"], ["AA or lower", "Credit that can actually gap"]] },
    ],
    takeaways: ["Name the extra risk.", "Short sovereign ≠ long corporate.", "Liquidity in corporates can vanish."],
    quiz: { q: "State development loans compared with G-Secs typically offer:", options: ["Identical everything", "A spread for state credit and sometimes less liquidity", "Equity upside", "No duration"], answer: 1, why: "SDLs are not the same name as the Centre." },
  },
  "bonds-05": {
    lead: "Ratings are opinions about credit, not guarantees. They lag. A AAA that becomes a newspaper story is how people learn that spread was never free.",
    covers: ["Rating agencies are not oracles.", "Diversify issuers.", "Read covenants and security, not only the coupon."],
    blocks: [
      { t: "callout", kind: "caution", title: "Credit events", text: "Indian bond history has names that went from 'safe extra yield' to recovery maths. Extra coupon is the fee for that possibility — not a gift." },
    ],
    takeaways: ["Yield extra = risk extra.", "Ratings lag.", "One-issuer 'high yield' is a concentration bet."],
    quiz: { q: "A corporate bond yielding far above G-Secs of the same tenor is mainly offering you:", options: ["A free lunch", "Compensation for extra credit and liquidity risk", "An equity option", "A tax refund"], answer: 1, why: "Spread is the price of extra risk." },
  },
  "bonds-06": {
    lead: "When RBI hikes, new paper offers higher yields; old paper cheapens. When RBI cuts, the reverse. Your duration sleeve is a policy bet whether you admit it or not.",
    covers: ["Policy rate vs bond yields — related, not identical.", "Inflation surprises move the belly and the long end.", "Do not 'wait for a cut' with money you need this quarter."],
    blocks: [
      { t: "p", text: "A hike cycle can last longer than a Twitter consensus. If you own long gilt funds as a trade on cuts, size it as a trade. If you own them as ballast, accept the mark-to-market." },
    ],
    takeaways: ["Policy is a duration event.", "Cuts are not owed to your NAV.", "Horizon still rules."],
    quiz: { q: "You need cash in three months. A 20-year gilt fund because 'RBI will cut' is:", options: ["A matched horizon", "A duration mismatch dressed as a view", "A G-Sec held to maturity", "NPS Tier I"], answer: 1, why: "The money is needed before the view may pay." },
  },
  "bonds-07": {
    lead: "A gilt or debt mutual fund gives you a portfolio, a NAV, and professional ops. Direct bonds give you a specific cash-flow ladder — and operational work (demat, auctions, reinvestment).",
    covers: ["Funds: easy, marked daily, duration decided by the manager.", "Direct: known cash dates if you hold to maturity.", "Tax treatment can differ — confirm."],
    blocks: [
      { t: "p", text: "Target-maturity funds sit in between: a defined end date, a basket of bonds, a fund wrapper. They still mark to market until the end. Read the index they track." },
    ],
    takeaways: ["Wrapper changes the experience.", "Hold-to-maturity is a behaviour, not a fund label.", "Ops and tax differ — check both."],
    quiz: { q: "A gilt fund NAV can fall even if no G-Sec has defaulted because:", options: ["SEBI confiscates gilts", "Bond prices fell when yields rose", "T+1 failed", "F&O ban"], answer: 1, why: "Mark-to-market." },
  },
  "bonds-08": {
    lead: "A ladder staggers maturities so money comes back on a schedule. It reduces the chance that all of your rate risk sits in one year.",
    covers: ["Rungs: 1y, 3y, 5y, 10y as a sketch.", "Reinvest each rung at then-prevailing yields.", "Write the purpose of each rung."],
    blocks: [
      { t: "p", text: "Example: money for a known fee in 18 months sits in T-bills or a short fund; a 5-year rung is for a child's later fee; long gilts only if that money is truly long. Ladders are boring. Boring is the point." },
    ],
    takeaways: ["Stagger maturities.", "Match rungs to dates.", "Boring income is a feature."],
    quiz: { q: "Putting every rupee of 'safe money' into a single 30-year bond is:", options: ["A ladder", "A concentrated duration bet", "Cash", "An ETF by definition"], answer: 1, why: "One rung, far out." },
  },

  "sectors-01": {
    lead: "A bank is not an IT company with a different logo. Sector analysis is the habit of asking how this industry makes money, what can kill it, and where we are in its cycle.",
    covers: ["Value chain and unit economics.", "Regulation as a driver.", "Cycle versus secular story."],
    blocks: [
      { t: "p", text: "Before you open a ticker, write ten lines on the sector: customer, cost, capital intensity, regulation, and what a bad year looks like. Then the annual report makes sense. The next seven chapters do that for India's large groups." },
    ],
    takeaways: ["Sector before ticker.", "Cycles differ.", "Regulation can be the whole story."],
    quiz: { q: "The first page of a stock note should usually be:", options: ["A RSI screenshot", "How the sector earns and can fail", "A lucky target", "A Telegram tip"], answer: 1, why: "Context first." },
  },
  "sectors-02": {
    lead: "Banks borrow short, lend longer, and live on net interest margin, credit costs and fees. NBFCs do similar jobs with different funding and rules.",
    covers: ["NII, NIM, slippages, PCR.", "Deposit franchise versus wholesale funding.", "RBI is a character in every note."],
    blocks: [
      { t: "p", text: "A cheap P/B on a bank with rising slippages is often cheap for a reason. Watch credit cost through the cycle, not only this quarter's RoA. For NBFCs, ask who funds them when markets freeze." },
    ],
    takeaways: ["Credit cost is the swing factor.", "Funding quality matters.", "Regulation can reprice the book overnight."],
    quiz: { q: "Net interest margin is closest to:", options: ["A stock's RSI", "The spread between what a bank earns on assets and pays on liabilities", "A put option", "AUM of a mutual fund"], answer: 1, why: "NIM is the core spread." },
  },
  "sectors-03": {
    lead: "Indian IT services sell skilled time and large contracts to global clients. The cycle is overseas tech spend, the dollar, and wage inflation — not the Nifty's mood alone.",
    covers: ["Deal TCV, attrition, utilisation.", "USDINR as a tailwind or a trap in estimates.", "Product vs services mix."],
    blocks: [
      { t: "p", text: "A strong dollar can lift reported rupee revenue even if volume is flat. That is not the same as a demand boom. Read constant-currency growth when the company reports it." },
    ],
    takeaways: ["Demand is global.", "Currency distorts rupee headlines.", "People costs are the COGS."],
    quiz: { q: "IT rupee revenue up only because USDINR jumped is:", options: ["A demand supercycle", "A currency translation effect until proven otherwise", "A domestic consumption story", "A G-Sec"], answer: 1, why: "Ask for constant currency." },
  },
  "sectors-04": {
    lead: "Energy, oil refiners and metal names are price-takers on global benchmarks, plus India-specific taxes and PSUs. Earnings swing with the commodity, not with your RSI.",
    covers: ["Upstream vs refining vs marketing.", "Metal cycle and China demand.", "Policy: windfall taxes, export duties."],
    blocks: [
      { t: "p", text: "Peak-margin metal companies look 'cheap' on trailing P/E at the top of the cycle. Normalise earnings or you will buy a cyclical as if it were an FMCG." },
    ],
    takeaways: ["Commodity earnings mean-revert.", "Policy can add a third driver.", "Do not trailing-P/E a peak year."],
    quiz: { q: "A steel maker at 5× peak-year earnings is often:", options: ["Statistically the bargain of the decade", "Cyclically expensive if mid-cycle earnings are much lower", "A bond", "Duration-matched to T-bills"], answer: 1, why: "Peak earnings overstate the E." },
  },
  "sectors-05": {
    lead: "Auto OEMs live on volumes, mix (2W/PV/CV), and margin. Ancillaries live on the OEM's schedule and on export books. Rural vs urban, rates, and fuel prices all show up in the monthly volume print.",
    covers: ["Monthly volumes as a tape.", "Mix: SUVs vs entry cars vs two-wheelers.", "EV transition as both threat and capex."],
    blocks: [
      { t: "p", text: "A volume beat with worse mix can be a margin miss. Read realisations, not only units. Dealers' inventory is the hidden cycle." },
    ],
    takeaways: ["Volumes + mix + realisations.", "Inventory at dealers matters.", "EV is a capex and mix story, not a slogan."],
    quiz: { q: "Units up 8% and realisations down 10% is usually:", options: ["Purely good", "A mix or discounting story you must unpack", "Proof of a moat", "A G-Sec rally"], answer: 1, why: "Revenue is units × price." },
  },
  "sectors-06": {
    lead: "Pharma in India is a mix of domestic formulations, US generics, APIs, and hospitals. USFDA letters, price controls, and currency all walk into the P&L uninvited.",
    covers: ["Regulated vs emerging markets.", "Compliance risk is binary on a plant.", "Hospitals are a different business with different working capital."],
    blocks: [
      { t: "p", text: "A plant import alert can erase a generic launch calendar. Do not model US generics as a smooth annuity. Domestic chronic brands are a different, stickier book." },
    ],
    takeaways: ["Compliance is a binary risk.", "US generics are not FMCG.", "Read the mix of geographies."],
    quiz: { q: "An FDA warning letter on a key plant is primarily:", options: ["A rounding error", "An operational and revenue risk until cleared", "A reason to increase leverage", "A buyback trigger by law"], answer: 1, why: "That plant's sales can stall." },
  },
  "sectors-07": {
    lead: "Staples sell things people buy in most years. Discretionary sells things people delay in a bad monsoon or a rate shock. Both still fight GST, commodity costs and distribution.",
    covers: ["Volume growth vs price growth.", "Gross margin and RM basket.", "Rural vs urban split when reported."],
    blocks: [
      { t: "p", text: "A quarter of 'growth' that is only price hikes with volume down is a different animal from volume-led growth. Premiumisation can lift mix. Input cost spikes (palm oil, crude derivatives) hit with a lag." },
    ],
    takeaways: ["Volume vs price.", "Input costs lag into margins.", "Discretionary is cycle-sensitive."],
    quiz: { q: "Revenue up, volume down, prices up is:", options: ["Always a quality compounder print", "Price-led — ask whether volumes recover", "A bank NIM story", "An option Greek"], answer: 1, why: "Price vs volume tells you the health." },
  },
  "sectors-08": {
    lead: "A sector notebook is a living page: drivers, current cycle, three names, what would change your mind. Without it every ticker is a stranger.",
    covers: ["One page per sector.", "Refresh on results and policy.", "Link it to your watchlist thesis."],
    blocks: [
      { t: "ul", items: ["Demand driver this year.", "Cost driver.", "Regulation to watch.", "Where we are in the cycle.", "What would invalidate a long in this sector."] },
    ],
    takeaways: ["Write it down.", "Cycle position is a first-class field.", "Invalidation belongs on the page."],
    quiz: { q: "The most useful line in a sector notebook is often:", options: ["A motivational quote", "What would prove the current view wrong", "The CEO's horoscope", "Yesterday's RSI"], answer: 1, why: "Invalidation keeps you honest." },
  },

  "modelling-01": {
    lead: "A model is a story with arithmetic. It exists to show what must be true for a price to make sense — not to print a single sacred target.",
    covers: ["Decisions, not decoration.", "Assumptions on one sheet.", "If it cannot be wrong, it is not a model."],
    blocks: [
      { t: "p", text: "If you cannot change growth by 2 points and see the value move, you built a poster. Good models are ugly, annotated, and have a date on them." },
    ],
    takeaways: ["Models test stories.", "Assumptions visible.", "Sensitivity is the point."],
    quiz: { q: "A model that cannot be stressed is:", options: ["Institutional-grade", "A poster of a target price", "A G-Sec", "SPAN"], answer: 1, why: "Without knobs it is not analysis." },
  },
  "modelling-02": {
    lead: "P&L feeds retained earnings into equity. Capex and working capital feed the cash flow. Cash and debt sit on the balance sheet. If those three do not talk, the model is fiction.",
    covers: ["Net income → equity.", "Cash flow statement as the truth serum.", "Balance sheet must balance every year."],
    blocks: [
      { t: "diagram", name: "statements" },
      { t: "p", text: "When cash goes down and the cash flow statement cannot say why, stop forecasting years 8–10. Fix the plumbing." },
    ],
    takeaways: ["Three statements, one system.", "Cash flow is the audit of the other two.", "Balance every year of the forecast."],
    quiz: { q: "If the balance sheet does not balance in year 3 of the forecast:", options: ["Ignore it if EPS looks nice", "The model is broken — fix the links", "SEBI will correct it", "It means cheap equity"], answer: 1, why: "Assets must equal liabilities plus equity." },
  },
  "modelling-03": {
    lead: "Revenue is units × price, or a growth rate you can defend with drivers — not a copied 15% from a broker PDF.",
    covers: ["Driver-based where possible.", "Price vs volume.", "Mix and new products as separate lines if they matter."],
    blocks: [
      { t: "p", text: "A bank: loan book × yields. An auto OEM: volumes × realisations. An SaaS-like name: seats × ARPU. If you cannot name the driver, you are plugging a percentage into a void." },
    ],
    takeaways: ["Drivers over copied growth.", "Separate volume and price.", "Write why year 4 is 12% not 8%."],
    quiz: { q: "The best revenue forecast starts from:", options: ["A round 20% forever", "Operational drivers you can argue", "Last year's RSI", "The IPO grey market"], answer: 1, why: "Drivers can be checked." },
  },
  "modelling-04": {
    lead: "Working capital in a model is usually days: inventory, receivables, payables. Those days × the relevant P&L line become balance-sheet stocks, and the change is cash.",
    covers: ["Days → rupees.", "Growth that consumes cash.", "Negative WC businesses fund themselves through payables."],
    blocks: [
      { t: "formula", expr: "ΔNWC as a cash use (or source)", meaning: "If receivables rise faster than sales, cash is trapped even when PAT looks fine." },
    ],
    takeaways: ["Days are the assumption.", "Growth can be cash-hungry.", "Watch the cash conversion, not only PAT."],
    quiz: { q: "Rising receivables days in the forecast will typically:", options: ["Increase cash", "Use cash", "Cancel debt automatically", "Raise the coupon on G-Secs"], answer: 1, why: "More IOUs outstanding." },
  },
  "modelling-05": {
    lead: "Interest depends on debt, debt depends on cash shortfall, cash depends on interest. That circularity is why models use a cash sweep or a plug — and why you should know which plug you used.",
    covers: ["Revolver / cash plug.", "Interest calculated on average debt.", "Do not hide a circular plug you do not understand."],
    blocks: [
      { t: "p", text: "If the company generates extra cash, the model should pay down the revolver or build surplus cash. If it needs cash, the revolver draws. That is a cash sweep. A random 'plug' that never pays down is how models explode in year 7." },
    ],
    takeaways: ["Name the plug.", "Interest and debt must talk.", "Sweeps beat mystery plugs."],
    quiz: { q: "A model that funds every shortfall with endless new debt and never checks interest coverage is:", options: ["Conservative", "Easy to break — it can hide insolvency", "IFRS 17", "A covered call"], answer: 1, why: "Leverage without a governor." },
  },
  "modelling-06": {
    lead: "DCF: forecast free cash flow, discount it, add terminal value, subtract net debt, divide by shares. Every fight is about the assumptions, not the Excel function.",
    covers: ["FCFF vs FCFE.", "WACC pieces.", "Terminal growth must be humble."],
    blocks: [
      { t: "formula", expr: "EV = Σ FCFFₜ/(1+WACC)ᵗ + TV/(1+WACC)ⁿ", meaning: "Equity value then subtracts net debt and other claims. Share count must include dilution you actually expect." },
      { t: "p", text: "If terminal value is 80% of EV, your 10-year spreadsheet is a footnote to a Gordon growth debate. Say that out loud in the note." },
    ],
    takeaways: ["DCF is discounting + a terminal argument.", "Net debt and dilution matter.", "Admit TV's weight."],
    quiz: { q: "Using 12% terminal growth in rupees forever is usually:", options: ["Fine because India grows", "Heroic — it can exceed the economy and explode value", "Required by SEBI", "The same as a T-bill"], answer: 1, why: "Perpetual growth above the economy is a red flag." },
  },
  "modelling-07": {
    lead: "A base case is one story. Bull and bear are two more. A data table on WACC versus terminal growth tells you where the argument really is.",
    covers: ["Three cases, not a fan-chart of 40.", "One two-way sensitivity on the two most debated inputs.", "What would have to be true for the current price."],
    blocks: [
      { t: "p", text: "Price the stock at ₹2,400. Your base is ₹2,100, bull ₹3,000, bear ₹1,400. The question is not 'the target is 2,100'. It is 'which case is the market in, and what evidence would move it'." },
    ],
    takeaways: ["Cases over a fake-precise target.", "Sensitivities show fragility.", "Reverse-DCF the live price."],
    quiz: { q: "The most honest output of a model is often:", options: ["A single rupee target", "A range and what would have to be true", "A RSI overlay", "The printer"], answer: 1, why: "Assumptions are the product." },
  },
  "modelling-08": {
    lead: "Colour, circular refs you do not understand, hard-coded year-7 numbers, and no date on the file are how you ship a wrong answer with confidence.",
    covers: ["Inputs on one sheet, in one colour.", "No silent hard-codes in formulas.", "Version and date in the filename."],
    blocks: [
      { t: "ul", items: ["Blue / a named style for inputs only.", "Every forecast year from a driver, not a typed 18%.", "Error checks: BS balances, cash ≥ 0 or revolver draws.", "Print the three statements and read them like an annual report."] },
    ],
    takeaways: ["Hygiene is accuracy.", "Checks on the sheet.", "If you cannot audit it, do not pitch it."],
    quiz: { q: "A typed 18% growth sitting inside a formula in year 6 is:", options: ["Elegant", "A silent assumption that will be forgotten", "Required IFRS", "A Greek"], answer: 1, why: "Hard-codes hide." },
  },

  "sse-01": {
    lead: "India's Social Stock Exchange is a SEBI-regulated path for social enterprises and non-profits to raise funds with more disclosure than a private appeal, and less of a conventional IPO story.",
    covers: ["Why SSE exists.", "It is not a second NSE for quick trades.", "Disclosure is the product."],
    blocks: [
      { t: "p", text: "For-profit social enterprises and non-profit organisations that meet the rules can access a visible venue. The investor's job is to read the social purpose and the instrument — not to assume Nifty-like liquidity." },
    ],
    takeaways: ["SSE is a funding venue with a social mandate.", "Liquidity may be thin.", "Read SEBI's live framework."],
    quiz: { q: "SSE is best thought of as:", options: ["A way to day-trade NGOs", "A regulated venue for social fundraising and disclosure", "A substitute for NPS", "A commodity exchange"], answer: 1, why: "Funding + disclosure, not a second Nifty." },
  },
  "sse-02": {
    lead: "Instruments can include zero-coupon zero-principal (ZCZP) instruments for non-profits — closer to a structured donation with disclosure — and equity or debt-like paper for eligible for-profits. Confirm the live instrument list with the exchange.",
    covers: ["ZCZP is not a G-Sec.", "Equity on SSE is still equity risk.", "Grants and donations have their own paperwork."],
    blocks: [
      { t: "p", text: "If you buy a ZCZP-style instrument, you may be funding a programme, not buying a claim on residual cash flows. Do not model it like a 7% corporate bond. If you buy equity of a for-profit social enterprise, you own business risk plus a social thesis." },
    ],
    takeaways: ["Instrument defines the claim.", "ZCZP ≠ bond yield.", "Read the offer document twice."],
    quiz: { q: "A zero-coupon zero-principal instrument is closest to:", options: ["A Nifty future", "A disclosed funding instrument, not a typical yield bond", "A covered call", "A T-bill"], answer: 1, why: "Principal/coupon mechanics are not a G-Sec's." },
  },
  "sse-03": {
    lead: "Not every NGO can list, and not every retail wallet is the target of every instrument. Eligibility, minimums and investor categories sit in SEBI circulars and exchange bye-laws — they move.",
    covers: ["Check who may invest.", "Notices and annual disclosures matter more than a logo.", "This is not financial advice to 'buy impact'."],
    blocks: [
      { t: "p", text: "Before you participate, read the latest SEBI SSE framework and the specific issue document. Capacity, governance and what 'impact' is measured as should be in writing." },
    ],
    takeaways: ["Eligibility is a live rule.", "Documents over marketing.", "Impact metrics should be specified."],
    quiz: { q: "The place to confirm who can invest in a given SSE issue is:", options: ["A motivational reel", "The issue document and current SEBI/exchange rules", "A friend who 'does CSR'", "MCX gold"], answer: 1, why: "Primary documents." },
  },
  "sse-04": {
    lead: "Social return is the programme outcome. Financial return is optional and instrument-specific. Mixing the two without language is how people feel betrayed by a product that never promised a yield.",
    covers: ["Write the two scorecards separately.", "Thin trading ≠ a scandal by itself.", "Due diligence still applies."],
    blocks: [
      { t: "p", text: "If your goal is 12% IRR, SSE may be the wrong aisle. If your goal is a disclosed, governed contribution to a social project, it may be the right one. Honesty about the goal is the whole chapter." },
    ],
    takeaways: ["Separate impact from IRR.", "Do not expect Nifty microstructure.", "Goal first, instrument second."],
    quiz: { q: "Treating every SSE listing as a high-yield bond is:", options: ["Accurate", "A category error — read the instrument", "Required by PFRDA", "How index funds work"], answer: 1, why: "The claim is in the document." },
  },
});

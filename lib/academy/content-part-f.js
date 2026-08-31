const { expandLesson } = require("./expand");

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "funds-01": {
    lead: "A mutual fund pools many investors' money and buys a portfolio a manager (or an index rule) runs. You own units, not the underlying shares directly.",
    covers: ["AMC, trustee, registrar.", "You get diversification at a fee.", "Funds do not remove market risk."],
    blocks: [
      { t: "p", text: "When you buy a fund, you buy a slice of a portfolio. If the Nifty falls 10%, a Nifty-like equity fund will not magically stay flat. What you bought is professional pooling and (sometimes) a process — not a guarantee." },
      { t: "callout", kind: "india", title: "India", text: "SEBI regulates AMCs. Factsheets, SID and KIM are the documents. WhatsApp 'this fund doubled' is not." },
    ],
    takeaways: ["Units = a slice of a portfolio.", "Market risk remains.", "Read the offer documents, not the rank on a sales app."],
    quiz: { q: "Owning an equity mutual fund means you:", options: ["Cannot lose money", "Own units whose value moves with the portfolio", "Own a bank deposit", "Avoid all tax"], answer: 1, why: "You own units, not a promise." },
  },
  "funds-02": {
    lead: "NAV is the per-unit value of the fund after expenses. AUM is the pile of money. TER is the annual fee that slowly compounds against you.",
    covers: ["NAV is not 'cheap' just because it is ₹18.", "TER eats returns every year.", "AUM size can help or hurt depending on the strategy."],
    blocks: [
      { t: "formula", expr: "NAV = (Assets − liabilities) / units", meaning: "A ₹18 NAV versus a ₹180 NAV says nothing about quality. It is just the unit scale." },
      { t: "p", text: "A 2% TER versus 0.3% on similar index exposure is a lifetime tax. On ₹10 lakh over 20 years the gap is not rounding error. Prefer low-cost vehicles when the product is a market, not a genius." },
    ],
    takeaways: ["Ignore NAV level as a value signal.", "TER is a first-class cost.", "AUM is context, not a trophy."],
    quiz: { q: "A fund at NAV ₹12 is:", options: ["Always cheaper than one at ₹120", "Not cheaper by NAV alone — unit scale differs", "Tax-free", "Guaranteed to double"], answer: 1, why: "NAV is per-unit accounting." },
  },
  "funds-03": {
    lead: "Equity funds buy shares. Debt funds buy bonds and money-market paper. Hybrids mix. The name on the app is marketing; the portfolio is the product.",
    covers: ["Open-ended versus close-ended.", "SEBI categories exist so you can compare like with like.", "Don't buy a 'balanced' label without the split."],
    blocks: [
      { t: "table", caption: "Families", headers: ["Family", "Main job"], rows: [["Equity", "Growth, high path volatility"], ["Debt", "Income and rate/credit risk"], ["Hybrid", "Mix; read the band"], ["Solution-oriented", "Retirement / children — lock-ins possible"]] },
    ],
    takeaways: ["Category first, star rating last.", "Debt is not 'safe' as a slogan.", "Hybrids need the actual mix."],
    quiz: { q: "A debt fund can lose principal if:", options: ["Never", "Rates jump or credit events hit the paper it holds", "Only on weekends", "NAV is above ₹10"], answer: 1, why: "Bonds reprice. Credit can fail." },
  },
  "funds-04": {
    lead: "An index fund and an ETF both track a rule (Nifty 50, Nifty Next 50, a debt index). The argument is cost and tracking, not a manager's story.",
    covers: ["Tracking error.", "ETF needs a demat and a live price; index fund uses AMC NAV.", "Expense plus tracking is the real cost."],
    blocks: [
      { t: "p", text: "If you want Nifty 50 exposure, a low-cost index fund or ETF is the default tool. Active funds have to beat the index after fees to earn their keep. Some do, many do not, and last year's winner is a weak forecast." },
    ],
    takeaways: ["Passive is a cost decision.", "ETF price can differ from iNAV in a panic.", "Active needs a reason beyond last year's rank."],
    quiz: { q: "The first number to compare on two Nifty 50 index funds is usually:", options: ["The fund manager's Twitter", "TER and tracking difference", "NAV height", "The app icon"], answer: 1, why: "You are buying the index; cost is the product." },
  },
  "funds-05": {
    lead: "SIP is a standing instruction to buy more units. STP moves between funds. SWP pays you by selling units. None of them change the underlying risk of what you own.",
    covers: ["SIP averages rupee cost — it does not guarantee profit.", "SWP in a falling market sells more units.", "Skip SIPs into a product you do not understand."],
    blocks: [
      { t: "p", text: "A ₹10,000 SIP into a Nifty fund buys more units when NAV is down and fewer when it is up. Over long periods that can help. Over 12 months in a bear market you can still be red. SIP is a behaviour tool, not a put option." },
    ],
    takeaways: ["SIP is discipline, not magic.", "SWP is a withdrawal plan.", "The asset class still dominates."],
    quiz: { q: "A SIP into an equity fund in a crash:", options: ["Cannot lose", "Buys more units at lower NAV — you can still be down", "Converts to a G-Sec", "Stops STT"], answer: 1, why: "You still own equities." },
  },
  "funds-06": {
    lead: "Regular plans pay a distributor. Direct plans do not. Same portfolio, different TER. The gap compounds.",
    covers: ["Direct = you transact with the AMC or a discount platform.", "Regular is not 'safer'.", "Switching can be a tax event — check before you move."],
    blocks: [
      { t: "p", text: "If you need advice, pay for advice honestly. If you are only buying an index fund, a regular plan is an expensive courtesy. Read the plan name: 'Direct — Growth' versus 'Regular — Growth'." },
    ],
    takeaways: ["Direct is cheaper for the same book.", "Advice should be a separate fee if you need it.", "Check tax before you switch."],
    quiz: { q: "Direct and regular plans of the same scheme differ mainly in:", options: ["The shares they hold", "The expense ratio (distribution)", "SEBI registration", "Demat ISIN of Nifty"], answer: 1, why: "Same scheme, different fee share." },
  },
  "funds-07": {
    lead: "A factsheet is a monthly X-ray: allocation, top holdings, turnover, trailing returns versus benchmark and category, TER, and risk measures.",
    covers: ["Benchmark and category.", "Portfolio overlap.", "Rolling returns beat a single 1-year number."],
    blocks: [
      { t: "ul", items: ["What does it actually hold?", "What is the TER?", "How much did it trail or beat the benchmark over 3/5 years — rolling, not a trophy window?", "Who manages it and for how long?", "Exit load and lock-in?"] },
    ],
    takeaways: ["Factsheet > star rating.", "Rolling returns over a single year.", "Holdings must match the story."],
    quiz: { q: "The most useful comparison for an active equity fund is:", options: ["Last month's rank on an app", "Benchmark and category over a full cycle", "NAV of ₹10 at launch", "The AMC's TV ad"], answer: 1, why: "You pay extra to beat a benchmark, not to win a month." },
  },
  "funds-08": {
    lead: "SEBI's riskometer is a label, not a personal forecast. A 'very high' equity fund can still be right for a 25-year SIP and wrong for money needed in eight months.",
    covers: ["Match product to horizon and loss you can live with.", "Do not put emergency cash in small-cap funds.", "Suitability is your job if you have no adviser."],
    blocks: [
      { t: "p", text: "Write three buckets: 0–3 years (debt/liquid), 3–7 (hybrid or conservative equity), 7+ (equity/index). Then pick funds. Reverse — picking a 'hot' small cap then inventing a horizon — is how people become forced sellers." },
    ],
    takeaways: ["Horizon first.", "Riskometer is a label.", "Emergency money does not belong in small caps."],
    quiz: { q: "Money needed for a house down-payment in 11 months belongs first in:", options: ["A small-cap fund SIP", "A liquid or short-duration vehicle, not equity beta", "Weekly Nifty options", "A pledged MTF book"], answer: 1, why: "Short horizon cannot survive equity path risk." },
  },
  "funds-09": {
    lead: "Fund tax in India depends on the type of fund and how long you held the units. Rules have changed in recent Budgets. This chapter is a map — confirm current law with a CA.",
    covers: ["Equity-oriented vs other funds.", "Holding period and rates change — verify.", "Dividend (IDCW) is not 'extra return' after tax."],
    blocks: [
      { t: "p", text: "Equity-oriented funds (generally ≥65% equity) have a different capital-gains treatment from debt funds. Debt-fund taxation was rewritten so many debt funds now follow your slab on gains — confirm the current Finance Act. Do not take a 2021 blog as today's rule." },
      { t: "callout", kind: "caution", title: "Not advice", text: "ABC is not your tax adviser. Keep statements. Use the ITR utility and a CA." },
    ],
    takeaways: ["Type of fund drives tax.", "Budgets rewrite rates.", "IDCW is not a free lunch."],
    quiz: { q: "Before you quote a 'LTCG rate' on a fund you should:", options: ["Trust a reel", "Confirm current law and whether the fund is equity-oriented", "Use 2008 rules", "Ignore holding period"], answer: 1, why: "Classification and current Act both matter." },
  },
  "funds-10": {
    lead: "A household allocation you can keep through a 30% equity drawdown is better than an optimal spreadsheet you abandon in month four.",
    covers: ["Few funds, clear jobs.", "Rebalance with bands, not every week.", "Write the policy on one page."],
    blocks: [
      { t: "p", text: "Example, not advice: 60% Nifty/Sensex index, 10% international or gold as ballast, 30% short-duration/liquid for near cash — only if your horizon and stomach agree. Two index funds plus a liquid fund beat a collection of 11 overlapping active schemes." },
    ],
    takeaways: ["Fewer funds, clearer jobs.", "Rebalance rules in writing.", "Survivable beats theoretically optimal."],
    quiz: { q: "Eleven overlapping midcap funds are usually:", options: ["Sophisticated diversification", "One bet with extra fees", "A bond ladder", "NPS"], answer: 1, why: "Same factor, more TER." },
  },

  "insurance-01": {
    lead: "Insurance moves a loss you cannot bear onto an insurer, for a premium. That is not the same product as a mutual fund, even when a salesperson staples them together.",
    covers: ["Transfer catastrophic risk.", "Do not hunt 'returns' inside a cover.", "Buy cover first, invest separately."],
    blocks: [
      { t: "p", text: "If a death, a hospital bill or a house fire can wreck the household, you need insurance. If you want equity-like returns, you need investments. Mixing them usually makes both worse: expensive cover, mediocre 'investment'." },
    ],
    takeaways: ["Cover ≠ SIP.", "Insure catastrophes.", "Invest for growth in investment products."],
    quiz: { q: "The job of term life insurance is to:", options: ["Beat Nifty", "Replace income if the insured dies", "Save tax only", "Act as an emergency fund"], answer: 1, why: "It pays a sum assured on death." },
  },
  "insurance-02": {
    lead: "Term life is cover. Endowments and many ULIPs mix cover with investing and often do neither well. If you need life cover, start with a plain term policy from a registered insurer.",
    covers: ["Sum assured versus premium.", "ULIP costs and lock-ins.", "Riders are optional extras — read exclusions."],
    blocks: [
      { t: "table", caption: "Simple split", headers: ["Product", "Main job"], rows: [["Term", "Pure death cover"], ["Health", "Hospitalisation"], ["ULIP / endowment", "Mix — usually a costly way to invest"], ["Pensions / NPS", "Retirement, not death cover"]] },
    ],
    takeaways: ["Term for life cover.", "Read the product, not the brochure yield.", "Lock-ins are a cost."],
    quiz: { q: "For a young earning parent who needs ₹1 crore death cover, the first product to price is usually:", options: ["A ULIP because of 'bonus'", "A term plan with a clear sum assured", "Weekly options", "A small-cap fund"], answer: 1, why: "You need cover, not a bundled NAV story." },
  },
  "insurance-03": {
    lead: "Health insurance pays hospital bills under a contract. Network hospitals, waiting periods, sub-limits and exclusions decide whether the policy helps when you are actually in a ward.",
    covers: ["Waiting periods and pre-existing conditions.", "Cashless versus reimbursement.", "Room-rent caps can silently cut the claim."],
    blocks: [
      { t: "p", text: "A ₹10 lakh cover with a room-rent cap that forces a 'proportionate deduction' can pay much less than ₹10 lakh. Read restoration, copay, and whether daycare is included. Employer cover can vanish when you change jobs — a personal policy is a backup." },
    ],
    takeaways: ["Read caps and waiting periods.", "Employer cover is not portable by default.", "Network list matters."],
    quiz: { q: "A room-rent cap in a health policy can:", options: ["Only increase the claim", "Reduce the whole claim via proportionate deductions", "Replace term life", "Remove waiting periods"], answer: 1, why: "Caps cascade through associated costs." },
  },
  "insurance-04": {
    lead: "The policy wording is the product. The sales deck is not. Schedule, exclusions, waiting periods, claim procedure — that is the document.",
    covers: ["Policy schedule vs wordings.", "Free-look period.", "Disclose health and habits honestly."],
    blocks: [
      { t: "p", text: "Non-disclosure of a condition is how claims die. The free-look window exists so you can return a policy you did not understand. Use it. Keep every email and the proposal form you signed." },
    ],
    takeaways: ["Wording > brochure.", "Disclose fully.", "Free-look is a real option."],
    quiz: { q: "Hiding a known medical condition on the proposal is:", options: ["Clever", "A way to get the claim rejected later", "Required for a lower premium legally", "The same as a rider"], answer: 1, why: "Non-disclosure is a classic claim killer." },
  },
  "insurance-05": {
    lead: "Claims are operational. Know the helpline, the network hospital process, and which papers you need before someone is on a stretcher.",
    covers: ["Cashless pre-authorisation.", "Keep ID, policy number, and prescriptions.", "Escalate with written trail."],
    blocks: [
      { t: "p", text: "Photograph bills, discharge summaries and test reports. If cashless is denied, reimbursement may still work — it is slower. IRDAI grievance and the insurer's ombudsman exist; use them with documents, not only a one-star review." },
    ],
    takeaways: ["Process before the emergency.", "Paper trail.", "Grievance paths exist."],
    quiz: { q: "The first thing to have at a network hospital for cashless is usually:", options: ["Your Nifty P&L", "Policy details and pre-authorisation as the insurer specifies", "A ULIP statement", "A cancelled cheque only"], answer: 1, why: "Cashless is a process, not a vibe." },
  },
  "insurance-06": {
    lead: "Cover should replace the loss. For term: a multiple of income and debts, minus existing assets you would actually sell. For health: realistic hospital inflation in your city, not last decade's ₹2 lakh policy.",
    covers: ["Income replacement, not a lucky round number.", "Separate term and health.", "Review at marriage, child, home loan."],
    blocks: [
      { t: "p", text: "A simple starting sketch (not advice): term cover of 10–15× annual take-home while dependents exist, plus outstanding home loan; health cover that would survive a serious hospitalisation without wrecking the equity SIPs. Recalculate when life changes." },
    ],
    takeaways: ["Size cover to the loss.", "Life events trigger a review.", "Do not under-insure to 'save' premium you will pay in a claim."],
    quiz: { q: "Taking a large home loan without reviewing term cover is:", options: ["Fine because the bank 'covers it'", "A reason to revisit sum assured — the family still owes the loan", "A substitute for health insurance", "Illegal"], answer: 1, why: "The debt sits on the household if you die." },
  },

  "nps-01": {
    lead: "NPS is India's voluntary (and for some, mandated) pension system: you contribute, the money is professionally allocated, and at retirement a large part typically becomes an annuity.",
    covers: ["PFRDA regulates NPS.", "It is a retirement product with exit rules.", "Not a trading account."],
    blocks: [
      { t: "p", text: "You get a Permanent Retirement Account Number (PRAN). Contributions buy units of pension funds. The point is decades, not this week's NAV. If you need money next year, this is the wrong bucket." },
    ],
    takeaways: ["NPS is a pension wrapper.", "Exit rules are part of the product.", "Horizon is retirement, not a trade."],
    quiz: { q: "NPS is primarily designed as:", options: ["A weekly options overlay", "A long-horizon retirement account", "A substitute for health insurance", "A current-account float"], answer: 1, why: "Pension first." },
  },
  "nps-02": {
    lead: "Tier I is the core pension account with withdrawal limits. Tier II is more liquid and optional. Inside, you choose asset classes: equity (E), corporate bonds (C), government bonds (G), and sometimes alternatives (A).",
    covers: ["Tier I vs II.", "E/C/G/A caps.", "Fund managers are registered pension funds."],
    blocks: [
      { t: "table", caption: "Sketch", headers: ["Sleeve", "Holds"], rows: [["E", "Equity indices / stocks within rules"], ["C", "Corporate debt"], ["G", "Government securities"], ["A", "Alternatives, with caps"]] },
      { t: "p", text: "Equity in NPS is capped (the cap has been 75% for many subscribers — confirm current PFRDA rules). You will not get a 100% small-cap book here. That is by design." },
    ],
    takeaways: ["Tier I is the pension core.", "Asset classes are constrained.", "Confirm live caps at PFRDA, not a 2018 blog."],
    quiz: { q: "NPS equity exposure for a typical subscriber is:", options: ["Always 100% small caps", "Capped by PFRDA rules — confirm the live cap", "Zero forever", "The same as a ULIP"], answer: 1, why: "There is a regulatory cap." },
  },
  "nps-03": {
    lead: "Auto choice (lifecycle) glides you from more equity when young toward more G as you age. Active choice lets you set E/C/G yourself within caps.",
    covers: ["Lifecycle is a default glide path.", "Active choice is a policy, not a weekly trade.", "Changing too often is a behaviour leak."],
    blocks: [
      { t: "p", text: "If you will not rebalance, auto choice is a respectable default. If you have a written allocation, active choice can express it. Do not 'time' E versus G every Budget day." },
    ],
    takeaways: ["Auto = glide path.", "Active = written policy.", "NPS is not a day-trading sleeve."],
    quiz: { q: "Switching NPS equity allocation every week is:", options: ["Required", "Usually a behaviour leak, not a process", "How PFRDA wants you to use Tier I", "Tax-free alpha"], answer: 1, why: "It is a pension, not a prop desk." },
  },
  "nps-04": {
    lead: "NPS has specific tax deductions and a tax treatment at withdrawal that the Income Tax Act and later amendments define. Confirm current sections (80CCD and beyond) with a CA — they have moved.",
    covers: ["Employee vs additional self contribution.", "Tax at exit is not 'fully tax-free' as folklore sometimes claims.", "This is not tax advice."],
    blocks: [
      { t: "p", text: "People contribute to NPS for the retirement default and for deductions available in the current regime they chose. Old versus new tax regime changes the value of those deductions. Do not copy a colleague's 2019 screenshot." },
    ],
    takeaways: ["Deductions depend on your regime.", "Exit tax has rules — read them.", "CA + current Act > memory."],
    quiz: { q: "NPS tax benefits should be verified against:", options: ["A forwarded PDF from 2016", "The current Income Tax Act and your regime", "A trading group", "MCX circulars"], answer: 1, why: "Tax law moves." },
  },
  "nps-05": {
    lead: "At retirement, NPS typically requires a portion of the corpus to buy an annuity that pays a pension; the rest may be withdrawn as a lump sum, subject to live rules.",
    covers: ["Annuity = a pension cheque from an insurer.", "Lump-sum portion is capped by rule.", "Partial withdrawals exist for listed reasons."],
    blocks: [
      { t: "p", text: "An annuity's rate depends on age, insurer and rates at the time you buy it. You are converting a corpus into a lifelong (or period) income. That is insurance maths, not Nifty maths. Read the annuity options before you need them." },
    ],
    takeaways: ["Exit mix is part of NPS design.", "Annuity rate is unknown today.", "Partial withdrawals are rule-bound."],
    quiz: { q: "An NPS annuity is closest to:", options: ["A Nifty weekly option", "A pension stream bought from an insurer", "A cash-and-carry arb", "A covered call"], answer: 1, why: "You are buying a pension." },
  },
  "nps-06": {
    lead: "EPF is employment-linked. PPF is a 15-year sovereign-backed savings product. NPS is a market-linked pension. SIPs are open-ended investments. They can sit together; they are not copies.",
    covers: ["Different lock, tax, and return engines.", "Do not raid all of them for the same goal.", "Write a household map."],
    blocks: [
      { t: "table", caption: "Different jobs", headers: ["Sleeve", "Job"], rows: [["EPF", "Salary-linked retirement, defined contribution"], ["PPF", "Long lock, sovereign rate"], ["NPS", "Market-linked pension + annuity rules"], ["Equity SIP", "Open-ended growth, you control exits"]] },
    ],
    takeaways: ["Products have jobs.", "Don't treat PPF like an emergency fund.", "Map EPF/NPS/SIP on one page."],
    quiz: { q: "Using PPF as a 3-month emergency fund is:", options: ["Ideal", "A mismatch — PPF is a long lock", "Required by NPS", "The same as liquid funds"], answer: 1, why: "Lock and purpose differ." },
  },
});

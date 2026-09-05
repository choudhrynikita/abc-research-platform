const { expandLesson } = require("./expand");

const NSE = { label: "NSE", href: "https://www.nseindia.com" };
const SEBI = { label: "SEBI", href: "https://www.sebi.gov.in" };
const RBI = { label: "RBI", href: "https://www.rbi.org.in" };
const MCX = { label: "MCX", href: "https://www.mcxindia.com" };
const CCIL = { label: "CCIL", href: "https://www.ccilindia.com" };

function pack(entries) {
  const out = {};
  for (const [id, raw] of Object.entries(entries)) out[id] = expandLesson(raw);
  return out;
}

module.exports = pack({
  "indices-01": {
    lead: "Nifty 50 is not a mood and not 'the market'. It is a published formula: free-float market cap, capping rules, a review calendar. If you trade the index without knowing what is inside it, you are flying a plane whose passenger list you never read.",
    covers: [
      "An index is a portfolio recipe, rebalanced on a calendar.",
      "Price-weighted (Sensex heritage) and free-float cap-weighted (Nifty) do not move the same way.",
      "Your Nifty future is a claim on that recipe, not on 'India'.",
    ],
    blocks: [
      { t: "p", text: "When HDFC Bank sneezes, Nifty catches a cold in a way a random midcap does not. That is not 'sentiment'. That is weight. A 10% name moving 2% is a 20 bp index event. A 0.4% name moving 8% is a 3 bp shrug. Advanced desks keep a weight table, not a feeling." },
      { t: "table", caption: "What 'the index' is trying to be", headers: ["Object", "Job", "Not a job"], rows: [
        ["Nifty 50", "Large-cap, liquid, free-float cap-weighted India book", "A smallcap thermometer"],
        ["Sensex 30", "BSE large-cap cousin — similar, not identical", "A 'better Nifty'"],
        ["Nifty 500", "Broad institutional India", "A day-trade vehicle"],
        ["India VIX", "30-day implied vol of Nifty options", "A direction forecast"],
      ] },
      { t: "callout", kind: "india", title: "Read the methodology, not a reel", text: "NSE publishes index methodology PDFs. Capping, replacement, and spin-off rules live there. If a mega-cap is capped, your 'it's 15% of India' story is already wrong." },
      { t: "example", title: "Weight arithmetic", body: "Name A is 8% of Nifty and prints −3%. Contribution ≈ −24 bp before the rest of the book. If you are long 2 Nifty lots (lot 65) at 24,200, notional ≈ ₹31.5 lakh. Twenty-four basis points is ~₹7,500 — one name, one print, no 'market view' required." },
      { t: "diagram", name: "index-weights" },
    ],
    takeaways: ["Index = recipe + calendar.", "Weight beats narrative.", "Keep a top-10 contribution cheat-sheet."],
    quiz: { q: "A 0.3% Nifty name rallying 12% moves the index roughly like:", options: ["A 10% name rallying 12%", "A rounding error versus a heavyweight's 1% move", "A mandatory circuit", "India VIX going to zero"], answer: 1, why: "Contribution is weight times return. Tiny weight, tiny contribution." },
    sources: [NSE],
  },
  "indices-02": {
    lead: "Free-float is the shares that can actually trade. Promoter lock-ups, strategic holdings, and government stakes sit outside. Capping stops one name from becoming the index. Together they decide who you are really long when you buy a Nifty future or Nifty BeES.",
    covers: ["Free-float ≠ total shares.", "Capping truncates mega-cap dominance.", "A government-heavy name can be 'large India' and still a modest index weight."],
    blocks: [
      { t: "p", text: "Two companies with the same total market cap are not the same index citizens. One is 70% free-float; the other is 18% free-float with a strategic holder. The index — and every passive rupee that tracks it — cares about the first number, not the newspaper market-cap." },
      { t: "ul", items: ["Passive demand is a bid for the recipe, not for 'good companies'.", "When free-float rises (offer for sale, promoter sell-down), passive must buy more of that name.", "When a name is capped, extra market-cap growth leaks into the uncapped rest of the book."] },
      { t: "callout", kind: "caution", title: "Do not confuse 'India's biggest company' with 'Nifty's biggest weight'", text: "A PSU giant with a thin free-float can be a national champion and a modest Nifty line. Trading the headline without the methodology is how people mis-size a pair." },
    ],
    takeaways: ["Free-float is the index's inventory.", "Capping is a governor.", "Passive flow follows the recipe."],
    quiz: { q: "If a promoter sells a large OFS and free-float jumps, index funds typically:", options: ["Ignore it", "Must own more of the name to stay on benchmark", "Are forbidden to buy PSUs", "Convert to gold"], answer: 1, why: "The recipe's weight rose. Passive has to match it." },
    sources: [NSE],
  },
  "indices-03": {
    lead: "Index reviews are dates with documents. Inclusions, exclusions, and capping resets create mechanical flow. That flow is not a gift. It is a calendar that everyone with an ETF or a futures hedge already circled.",
    covers: ["Announcements precede the effective date — the crowd trades the gap.", "Inclusion is a liquidity event, not a quality certificate.", "If you are late to a rebalance, you are the liquidity."],
    blocks: [
      { t: "p", text: "A name entering Nifty 50 will be bought by every fund that is not allowed to be short the benchmark. A name leaving will be sold. Between announcement and effective date the price often does a lot of the work. Buying the inclusion the night before it is effective is how you donate spread to people who read the circular when it came out." },
      { t: "steps", title: "Rebalance protocol", items: [
        "Read the NSE circular the day it drops — names, weights, effective date.",
        "Estimate passive rupees: AUM tracking that index × weight change.",
        "Ask: is that flow already in the price? If the name already ran 18% on the rumour, you are not early.",
        "Prefer being the liquidity provider into the event, or being flat. Do not be the last marketable buy.",
        "Write the leftover plan: if it gaps through on effective date, you are done — no 'average the inclusion'.",
      ] },
      { t: "callout", kind: "idea", title: "Creativity here is a calendar, not a nickname", text: "The advanced trade is boring: a spreadsheet of review dates, a size cap, and a willingness to skip. Mystery oscillators are not how inclusions pay." },
    ],
    takeaways: ["Rebalance is a dated flow.", "Announcement ≠ effective date.", "Late is liquidity."],
    quiz: { q: "Buying a Nifty inclusion in the last hour of the effective date is usually:", options: ["Insider timing", "Providing the last squeeze of passive demand — often the wrong side", "A DCF", "Required by SPAN"], answer: 1, why: "The mechanical bid is a known crowd. Last-hour chase is rarely the edge." },
    sources: [NSE],
  },
  "indices-04": {
    lead: "Bank Nifty is a concentrated financials book. It is not 'Nifty but banks'. Fewer names, fatter tails, a different options microstructure, and a different RBI-day personality. Bank Nifty weekly options were discontinued in Nov 2024 (SEBI one-weekly-per-exchange). The remaining BN book is monthly and further — treating it like an old BN weekly, or like Nifty Tuesday, is how accounts vanish on a policy day.",
    covers: ["Concentration: a few banks are the index.", "BN options are a different liquidity and pin game.", "RBI, credit events, and results cluster here."],
    blocks: [
      { t: "p", text: "If private-bank heavyweights hiccup together, Bank Nifty can move 2% while Nifty moves 0.7%. That extra torque is why BN options pay more premium and why they also confiscate more. Your shock cell on a BN condor cannot be a copy-paste of the Nifty cell." },
      { t: "table", caption: "Nifty vs Bank Nifty (desk habits)", headers: ["Lens", "Nifty", "Bank Nifty"], rows: [
        ["What it is", "Diversified large-cap recipe", "Concentrated banks/NBFCs"],
        ["Typical options personality", "Tuesday weekly pin + dealer gamma", "Fatter tails, event clustering, monthly clock"],
        ["First camera on RBI day", "Second", "First"],
        ["Shock cell", "Index-wide", "Must be wider — or skip"],
      ] },
      { t: "example", title: "Same condor, different animal", body: "A 200-point Nifty iron condor credit of ₹42 with lot 65 is ~₹2,730 credit and ~₹10,270 max loss. Copying '200 points' onto Bank Nifty because the number looks familiar is not a translation. BN's ATR is a different ruler. Width is in ATR, not in ancestral Nifty points." },
    ],
    takeaways: ["BN is a sector book with index clothing.", "Widen the shock cell or skip BN options.", "RBI day is BN's weather.", "BN weeklies are gone — monthly is a different clock."],
    quiz: { q: "Copying a Nifty 200-point condor onto Bank Nifty because '200 is 200' is:", options: ["Professional translation", "Using the wrong ruler — BN ATR and concentration differ", "Required by NSE", "A cash-and-carry"], answer: 1, why: "Points are not risk units across indices." },
    sources: [NSE],
  },
  "indices-05": {
    lead: "Nifty Next 50, Midcap 50/150, and Smallcap indices are not 'Nifty with extra alpha'. They are different liquidity regimes. A 2% midcap index day can hide 8% names you cannot exit. Advanced size starts from days-to-exit, not from the index nickname.",
    covers: ["Broad indices hide name-level liquidity holes.", "Passive midcap flow is real — so is the exit tax.", "Futures and options, where they exist, do not make a thin name thick."],
    blocks: [
      { t: "p", text: "People buy a midcap index ETF and think they bought 'diversified India'. They bought a recipe of names whose average spread and impact are a multiple of Nifty 50. In a risk-off week the ETF can gap because the underlying names have no bid. That is not a bug. That is the product." },
      { t: "callout", kind: "caution", title: "Smallcap futures are not a personality", text: "If you do not have a written days-to-exit at 20% of 20-day volume, you do not have a smallcap strategy. You have a hostage." },
      { t: "formula", expr: "Days-to-exit ≈ position shares / (0.2 × 20-day average volume)", meaning: "If this is over 3–5 sessions for a swing, you are oversized. For an event trade, over 1 session is already a problem." },
    ],
    takeaways: ["Liquidity is the hidden index factor.", "ETF NAV can lie for an afternoon.", "Size from exit, not from dream."],
    quiz: { q: "A midcap ETF gapping 4% on a risk-off open most honestly reflects:", options: ["NAV fraud", "Underlying names with thin bids — the product doing what thin books do", "A mandatory Nifty circuit", "India VIX = 0"], answer: 1, why: "The recipe's constituents are the liquidity." },
    sources: [NSE],
  },
  "indices-06": {
    lead: "India VIX is a 30-calendar-day implied-volatility index derived from Nifty option prices. It is a thermometer of what the options market is charging for a Nifty-sized move — not a forecast of direction, and not a cheap futures product you should casually day-trade.",
    covers: ["VIX up means Nifty options got more expensive, not that you must short Nifty.", "Term structure (near vs 30-day) matters more than the headline.", "Using VIX as a buy/sell trigger without a vol ticket is folklore."],
    blocks: [
      { t: "diagram", name: "vix-term" },
      { t: "p", text: "India VIX at 12 after a month of quiet weeklies is a different animal from India VIX at 12 the morning after a 3% day. The number rhymes; the surface does not. Advanced desks look at VIX, the weekly ATM straddle, and skew together — see the Volatility track." },
      { t: "ul", items: ["VIX spike + skew exploding on puts = crash insurance got bid. That can be a buy-vol story, not a 'fade VIX' coupon.", "VIX drifting to multi-year lows is a warning on short-vol size, not a dare.", "There is no reliable 'VIX 20 = buy Nifty' rule that survives a sample with costs."] },
      { t: "callout", kind: "india", title: "Do not import US VIX-futures folklore", text: "US VIX futures and ETNs are a whole ecosystem. India VIX is primarily a calculated index. If a VIX derivative is thin, you do not have a strategy — you have a quote you cannot exit." },
    ],
    takeaways: ["VIX is implied vol, not direction.", "Read it with the straddle and skew.", "Thin VIX products are not a desk."],
    quiz: { q: "India VIX jumping from 12 to 18 most directly says:", options: ["Nifty must fall tomorrow", "Nifty option premiums (vol) got marked up", "RBI hiked", "Max pain moved"], answer: 1, why: "VIX is an options-price thermometer." },
    sources: [NSE],
  },
  "indices-07": {
    lead: "Breadth is how many names participate. An index at a high on three heavyweights while 320 of Nifty 500 sit below their 50-day is a different market from an index high with 70% of names making new highs. Advanced traders keep both cameras on the same desk.",
    covers: ["Advance–decline, new highs–new lows, % above a moving average.", "Index high + weak breadth is a concentration story.", "Breadth is a regime input, not a 9:16 click."],
    blocks: [
      { t: "p", text: "On ABC's Nifty 500 desk you already see breadth-ish objects: sector heat, movers, delivery. The course version is: write three numbers before you size an index long. (1) How many Nifty names above 20-DMA. (2) New 52-week highs vs lows. (3) Equal-weight cousin vs cap-weight. If all three disagree with the index high, your long is a mega-cap bet. Call it that." },
      { t: "table", caption: "Breadth reads (hypotheses, not orders)", headers: ["Tape", "Hypothesis", "Do not"], rows: [
        ["Index up, A/D up, many new highs", "Participation — trend-follow friendlier", "Assume it lasts forever"],
        ["Index up, A/D down", "Concentration — heavyweight beta", "Buy random midcaps as 'confirmation'"],
        ["Index down, new lows expanding", "Risk-off broadening", "Fade the first hour as a personality"],
      ] },
    ],
    takeaways: ["Breadth is participation.", "Concentration is a named bet.", "Three numbers before index size."],
    quiz: { q: "Nifty at a high while 70% of Nifty 500 sit under their 50-DMA means your index long is mostly:", options: ["A diversified India SIP", "A bet on the heavyweights that still work", "A VIX short", "A G-Sec"], answer: 1, why: "Cap-weight can rise on a few names." },
  },
  "indices-08": {
    lead: "Cap-weight is how most money sits. Equal-weight is a different portfolio: it up-weights the smaller large-caps and down-weights the giants. The spread between them is a live factor. When equal-weight lags, the rally is a mega-cap story. When it leads, breadth is doing work.",
    covers: ["Equal-weight vs cap-weight is a factor camera.", "You can be right on 'India' and wrong on the recipe.", "Do not mix them in one mental P&L."],
    blocks: [
      { t: "p", text: "If you run a stock book of 'Nifty-ish names equally', you do not own Nifty. You own an equal-weight cousin plus idiosyncratic noise. In a year when two IT and bank giants do all the lifting, you will underperform and call it bad luck. It was a factor mismatch. Write the mismatch on the IPS." },
      { t: "example", title: "Naming the bet", body: "Portfolio: 15 Nifty names, ~equal rupees, no HDFC Bank because 'already ran'. Benchmark in your head: Nifty 50. You have a structural underweight to the largest weight. Either hedge with a Nifty future overlay, or change the benchmark in the quarterly note to 'equal-weight large cap'. Silence is how people fire themselves." },
    ],
    takeaways: ["Recipe mismatch is a factor.", "Name the benchmark you actually own.", "Equal-weight lag = mega-cap tape."],
    quiz: { q: "An equal-weight Nifty-ish book lagging Nifty 50 in a mega-cap year is usually:", options: ["Proof index funds are a scam", "A factor mismatch versus the cap-weighted recipe", "A SEBI violation", "India VIX going to zero"], answer: 1, why: "You did not own the recipe you judged yourself against." },
  },
  "indices-09": {
    lead: "Sector indices (Bank, IT, Auto, Pharma, Energy, FMCG, Metal, Realty) are cameras. They tell you where the contribution is coming from. A Nifty up-day that is only Energy and Banks is not 'risk-on India'. It is two sleeves. Your stock book should know which sleeve it is actually in.",
    covers: ["Contribution analysis before a story.", "Sector relative-strength versus Nifty.", "Do not buy a weak sector name because the index is green."],
    blocks: [
      { t: "p", text: "Relative strength: price of the sector index divided by Nifty, smoothed. When Bank Nifty / Nifty is making higher lows, financials are the bid. When it is breaking down while Nifty holds, your bank longs are a fight. This is not a crystal ball. It is naming the weather." },
      { t: "steps", title: "Open with sectors, not with a stock", items: [
        "Which two sector indices contributed most to Nifty overnight / pre-open?",
        "Is your candidate in that weather, or fighting it?",
        "If fighting: you need a name-specific thesis, a tighter invalidation, or a skip.",
        "If riding: still size from 1R, not from the sector story.",
      ] },
    ],
    takeaways: ["Sectors explain contribution.", "RS vs Nifty is a camera.", "Index green ≠ every name."],
    quiz: { q: "Nifty is +0.8% led by Energy while your Auto long is −1.4%. First honest sentence:", options: ["The market is wrong", "I am in a different sleeve than today's contribution", "SEBI halted Autos", "VIX must be 12"], answer: 1, why: "Contribution is sleeve-specific." },
    sources: [NSE],
  },
  "indices-10": {
    lead: "Put the index cameras on one page you can fill in 8 minutes before 9:15. Creativity here is a layout, not a new oscillator. If the page is blank, you are not allowed a new index ticket.",
    covers: ["A one-page index notebook.", "Fill it or skip the open.", "Update once at 11:00, once after close."],
    blocks: [
      { t: "card", title: "Index open card", fields: [
        ["Nifty last / gap vs prior close", ""],
        ["India VIX (and vs 5-day)", ""],
        ["BN vs Nifty (who led the gap)", ""],
        ["US futures overnight", ""],
        ["USDINR / Brent one-liners", ""],
        ["Top-2 contributing sectors", ""],
        ["Breadth: % Nifty above 20-DMA", ""],
        ["Event today (RBI, results, FOMC night)", ""],
        ["Allowed product today", "defined only / futures hedge / skip"],
        ["Max R on index today", ""],
      ] },
      { t: "p", text: "The card is the strategy. If VIX is spiked, BN is the gap, and it is an RBI afternoon, the card should force 'defined only, half size' before your excitement writes a naked short. That is advanced. Nicknames are not." },
    ],
    takeaways: ["One page before size.", "Fill or skip.", "The card outranks the mood."],
    quiz: { q: "A blank index card at 9:14 means:", options: ["You should market-buy the open", "No new index ticket until it is filled", "SPAN is optional", "Max pain is the plan"], answer: 1, why: "Process before size." },
  },

  "intraday-01": {
    lead: "An intraday trade is a job with a clock. It has a setup name, a session window, an invalidation, a time-stop, and a daily R cap. If any of those is missing, you are not day-trading. You are hanging around a DOM hoping the afternoon becomes a story.",
    covers: ["Name the setup or don't click.", "Time-stop is a risk control.", "Daily cap exists so one morning cannot become a personality."],
    blocks: [
      { t: "p", text: "Swing traders can be wrong for two days. Day traders cannot. The product expires at 15:20 whether your ego is ready or not. That is the whole craft: a written window, a written skip, and the humility to flatten into the close as a rule, not as a mood." },
      { t: "table", caption: "What must be on an intraday ticket", headers: ["Field", "Example", "If blank"], rows: [
        ["Setup name", "OR break, VWAP reclaim, gap-fill", "No trade"],
        ["Window", "9:20–10:15 only", "You will invent a new setup at 14:50"],
        ["Invalidation", "Back inside OR / lost VWAP", "A hope"],
        ["Time-stop", "If not +0.6R by 11:00, flatten", "A hostage"],
        ["Daily cap", "−2R then done", "Revenge afternoon"],
      ] },
      { t: "callout", kind: "caution", title: "Intraday is not 'small swing'", text: "Holding a day-trade through the close 'because it looks good' converts it into an overnight gap you did not size. That is a new product. New product needs a new card — or a flatten." },
    ],
    takeaways: ["Clock is part of risk.", "Named setup or skip.", "Close is a deadline."],
    quiz: { q: "An intraday long still open at 15:18 with no overnight card is:", options: ["Professional patience", "An unauthorised product change — flatten or write the overnight ticket", "A collar", "Required on expiry"], answer: 1, why: "You changed species without a card." },
  },
  "intraday-02": {
    lead: "Opening range (first 15 or 30 minutes) is a map of overnight disagreement. A break, a fail, or a skip — those are three strategies. 'It broke so I buy' is not one of them unless the rest of the card is filled.",
    covers: ["Define OR before the open (which bar, which products).", "Break needs follow-through and a stop back inside.", "Failed break is a fade with a clock, not a religion."],
    blocks: [
      { t: "diagram", name: "opening-range" },
      { t: "p", text: "Write the range. Nifty first 15-minute high 24,220 / low 24,140. A break above 24,220 is not a buy until: (1) the 15-min bar closes through, (2) VWAP is not still falling hard, (3) you have a stop under 24,140 or under the break bar — pick one and live with it, (4) news/RBI is not in 20 minutes." },
      { t: "steps", title: "OR break (long)", items: [
        "Mark 15-min high/low. No trades inside the first 15 if that is your rule.",
        "Wait a close through the high, not a wick.",
        "Stop: back inside the range (or break-bar low). Size from 1R.",
        "Time-stop: if it is still hugging the break 45 minutes later, it is not a break. Flatten.",
        "Skip if the range itself is already 1.2× a normal day ATR — there is no room left.",
      ] },
      { t: "callout", kind: "idea", title: "Failed break is a different named trade", text: "Break above OR, stall, close back inside. That can be a short to the other side of the range with a stop above the failed high. It is not 'the opposite of my long' you invent in anger. It is a second card, second 1R, or a skip if you already spent 1R on the break." },
      { t: "example", title: "Skip clause", body: "First 15-min range is 180 Nifty points after a US-hours crash. Your 1R at 0.4% of ₹8 lakh is ₹3,200. Stop through a 180-point range on 1 lot (65) is 180×65=₹11,700 ≈ 3.6R. You cannot take the OR break on 1 lot. You skip, or you wait for a tighter 5-min break later. That skip is the strategy." },
    ],
    takeaways: ["OR is a map.", "Close through, not a wick.", "Wide OR = skip or wait."],
    quiz: { q: "A 15-minute opening range that is already larger than your 1R stop budget means:", options: ["Buy more lots so it 'matters'", "Skip the OR-break or wait for a tighter later break", "Use a mental stop", "SEBI will tighten it"], answer: 1, why: "If the map is wider than 1R, that setup is not sized for you today." },
  },
  "intraday-03": {
    lead: "VWAP is the session's average rupee. Above it, buyers have been paying up; below it, sellers have been in charge. Using VWAP as a participation filter is professional. Using it as a crystal ball is a YouTube setting.",
    covers: ["VWAP is a session statistic, not a valuation.", "Reclaim with volume is a named long; lose-and-fail is a named short.", "Yesterday's VWAP is a different number — don't mix."],
    blocks: [
      { t: "p", text: "A long-only rule: 'I only add to an index long while price holds above session VWAP and the slope of VWAP has flattened or turned up.' That keeps you from buying a falling elevator and calling it a dip. A short-only mirror exists. The creativity is in not mixing them in the same hour." },
      { t: "table", caption: "VWAP plays (named)", headers: ["Name", "Trigger", "Invalidation"], rows: [
        ["VWAP reclaim long", "Dump, then 5-min close back above VWAP on rising volume", "Close back below VWAP"],
        ["VWAP reject short", "Rally into VWAP from below, stall, close down", "Close back above"],
        ["VWAP ride", "Already above, pullback holds VWAP", "Lost VWAP on a close"],
      ] },
      { t: "callout", kind: "caution", title: "VWAP after 14:30 is sticky", text: "Late-day VWAP barely moves. A 'reclaim' at 14:50 can be noise around a number that is no longer discovering. If your edge is VWAP, it mostly lives before lunch." },
    ],
    takeaways: ["VWAP = session average rupee.", "Named reclaim/reject, not a vibe.", "Early VWAP > late VWAP."],
    quiz: { q: "Session VWAP is best treated as:", options: ["Intrinsic value", "The volume-weighted average print of this session — a participation line", "Tomorrow's open", "Max pain"], answer: 1, why: "It is a statistic of today's tape." },
  },
  "intraday-04": {
    lead: "Gaps are overnight votes. Gap-and-go means the vote continues; gap-fill means the vote is faded. You need a rule for which one you are playing before 9:15, because the first print will try to recruit you into both.",
    covers: ["Measure the gap versus ATR, not versus a feeling.", "News gaps and 'just because' gaps are different.", "Fill is not owed to you."],
    blocks: [
      { t: "p", text: "A 0.3% Nifty gap on a quiet US night is often noise — fade-friendly if the first 15-min fails to extend. A 1.2% gap on a Fed night or a domestic shock is a new regime until proven otherwise. Buying a fill of a 1.2% news gap because 'gaps fill' is a proverb, not a desk." },
      { t: "formula", expr: "Gap / 14-day ATR", meaning: "Under ~0.4: often fade-eligible if OR fails. Over ~0.8 with news: treat as go until a written fail. In between: skip unless your sample says otherwise." },
      { t: "example", title: "Two Tuesdays", body: "Tuesday A: Nifty gaps +40 after a mild US green. OR fails to make a new high by 9:50. Fade toward prior close, stop above OR high, time-stop 11:30. Tuesday B: Nifty gaps +180 after a surprise domestic cut. OR holds the gap low. You do not fade. You either go with a stop under the gap low, or you skip. Same weekday. Opposite cards." },
    ],
    takeaways: ["Gap size vs ATR.", "News vs noise.", "Fill is not a law."],
    quiz: { q: "'Gaps always fill' as a reason to short a 1.5% news-gap open is:", options: ["A robust edge", "A proverb standing in for a missing card", "NSE policy", "A collar"], answer: 1, why: "Large news gaps are a different population." },
  },
  "intraday-05": {
    lead: "The first 40 minutes after 9:15 are a different market: overnight orders, stop cascades, newspaper people, and algos harvesting them. A protocol beats a talent. If you do not have one, the open will write one for you — in red.",
    covers: ["No marketable heroics in the first 5 minutes unless that is the written job.", "OR completes before most break trades.", "Size is half until the first 15-min bar is closed."],
    blocks: [
      { t: "steps", title: "9:20–9:50 protocol", items: [
        "9:08–9:15: read the cash auction draft; do not marry it.",
        "9:15–9:20: watch, log the first prints, no new discretionary size.",
        "9:20–9:30: first 15-min bar closes. Mark OR. Check VWAP slope.",
        "9:30–9:50: only named setups (OR break/fail, VWAP reclaim) at half size.",
        "If an event is due before 11:00, the protocol is 'flat or hedge' — not 'I'll scalp the headline'.",
      ] },
      { t: "callout", kind: "india", title: "9:16 market orders are a gift — to someone else", text: "Retail marketable buys dumped into the first minute are the inventory the other side wanted. If your edge needs the open, use a limit and a kill time. If it does not, wait for the bar to close." },
    ],
    takeaways: ["The open is a session.", "Half size until OR exists.", "Protocol over talent."],
    quiz: { q: "Sending a marketable Nifty buy at 9:15:20 because pre-open looked strong is usually:", options: ["Professional timing", "Paying the harvest of overnight orders", "Required by T+1", "A DCF"], answer: 1, why: "The first minute is a crowd, not a discovery you had to join." },
  },
  "intraday-06": {
    lead: "Late morning into early afternoon is where Indian cash often goes quiet. Spreads can look fine while nothing is happening. Trading lunch chop as if it were the open is how you bleed theta-like death in the cash book: many small scratches, no thesis.",
    covers: ["Chop is a regime. Stand down is a strategy.", "If you must trade it, width and time-stops get tighter, size gets smaller.", "Boredom is not a signal to invent a setup."],
    blocks: [
      { t: "p", text: "A professional calendar can say: 'No new discretionary cash between 12:15 and 13:45 unless a named news print hits.' That sentence saves more rupees than a new indicator. The advanced skill is protecting the morning's 1.2R from the afternoon's boredom." },
      { t: "callout", kind: "idea", title: "Chop is a product you can refuse", text: "You do not owe the screen activity. A closed DOM is a position." },
    ],
    takeaways: ["Chop is a regime.", "Stand-down is a trade.", "Protect morning R from afternoon boredom."],
    quiz: { q: "A quiet 12:40 tape with your morning +1.4R already booked is usually a time to:", options: ["Double lots to 'use the day'", "Stand down or tiny named-only — boredom is not a setup", "Sell a naked strangle", "Ignore the daily cap"], answer: 1, why: "Protecting R is the job." },
  },
  "intraday-07": {
    lead: "The last 60–90 minutes are inventory: funds, hedges, expiry pin, people who must be flat. Starting a fresh directional thesis at 14:40 is usually trading someone else's problem. If you participate, you need a named role: pin, fade-the-scramble, or flatten.",
    covers: ["Close is a different market (see microstructure).", "New thesis after 14:30 needs a written exception.", "Expiry close is a job posting — apply or go home."],
    blocks: [
      { t: "p", text: "On a normal non-expiry session, 14:30–15:20 is where you reduce, not invent. On Nifty weekly expiry (Tuesday on NSE, as of Nov 2024 — confirm the live circular), it is a specialist session: dealer hedges, max-pain folklore, and genuine delta to cover. Pick a role before 14:00. 'I'll see' at 15:10 is how weeklies become a tax. Sensex weekly still expires Thursday on BSE — do not mix the two clocks." },
      { t: "table", caption: "Last-90 roles", headers: ["Role", "Allowed", "Forbidden"], rows: [
        ["Flatten", "Reduce discretionary to the IPS cap", "New hero longs"],
        ["Pin participant", "Defined, sized, already on from morning", "Naked last-minute shorts"],
        ["Fade scramble", "Written, tiny, time-stop 15:22", "Averaging a fade"],
      ] },
    ],
    takeaways: ["Late day is inventory.", "Role or flatten.", "No new thesis after 14:30 without an exception."],
    quiz: { q: "Starting a fresh Nifty weekly directional at 15:12 on expiry Tuesday is usually:", options: ["Smart use of theta", "Trading inventory without a written role", "A cash-and-carry", "Required"], answer: 1, why: "The last minutes of expiry are inventory, not discovery." },
  },
  "intraday-08": {
    lead: "Nifty weekly expiry is a named session with its own playbook: pin risk, exploding gamma, and a 15:00 personality that does not exist on a regular Tuesday. As of 28 Nov 2024 NSE assigned Nifty 50 weekly options to Tuesday (SEBI: one weekly index contract per exchange). BSE Sensex weekly remains Thursday. Bank Nifty / FinNifty / Midcap Nifty weeklies were discontinued — those books are monthly and further. Confirm the live contract month and weekday on the watchlist before you write a role. If you treat expiry as 'just another day with more premium', you are the premium.",
    covers: ["Pick a role: pin, defined directional, or flat.", "Short gamma into the last two hours is a job, not a coupon.", "If you are lost at 13:00, flatten — the last two hours will not explain it to you."],
    blocks: [
      { t: "steps", title: "Expiry-day card", items: [
        "Morning: write the role. One sentence.",
        "Defined structures only unless you are a genuine delta-hedge desk (you are not, at retail size).",
        "No adding to short vol after 13:00.",
        "If spot is travelling through your short strikes, flatten or convert to a defined repair with a new 1R — see strategies track.",
        "15:20: you are flat or you have a written leftover (assignment, stock). No surprises.",
      ] },
      { t: "example", title: "Pin tourist", body: "Short 24,200/24,400 call vertical, spot 24,205 at 14:10 on expiry. You are a pin tourist. That can pay. It can also become a 15:22 spike through 24,400 if a late hedge comes in. Shock cell must already exist. If it does not, you are not a tourist. You are lost." },
    ],
    takeaways: ["Expiry is a named session.", "Role by morning.", "No late short-vol adds."],
    quiz: { q: "Adding a naked short weekly at 13:40 on expiry because 'theta is huge' is:", options: ["Advanced", "Usually forbidden — gamma is also huge and you are late", "A G-Sec", "SEBI-required"], answer: 1, why: "Late expiry short vol is a jump you are not paid enough to sell." },
  },
  "intraday-09": {
    lead: "A news spike is a clock. You either have a written fade (with a time-stop and a 'if it doesn't reverse, flatten'), a written go, or you are a spectator. Refreshing the headline and clicking is not a third option.",
    covers: ["Headline vs document: wait for the document if the edge needs it.", "Spike fades need a clock.", "Position limits and halts are part of the tape."],
    blocks: [
      { t: "p", text: "RBI 10:00 print. USDINR and Bank Nifty lurch. If your card said 'if hike, short BN defined; if hold-hawkish, short duration proxies; if cut, skip BN shorts', you click the matching ticket. If your card said nothing, you watch. The people who make money on the print wrote the tickets yesterday." },
      { t: "callout", kind: "caution", title: "Do not fade the first tick of a true shock", text: "A 3% gap on a name with a SEBI order, a default, or a war headline is not an RSI 30. First job is whether the product still exists (halt, band, ban). Second is whether you have a card. Third — maybe — is a tiny defined expression." },
    ],
    takeaways: ["Spikes need a pre-written card.", "Clock on fades.", "Halts first."],
    quiz: { q: "Fading a 4% opening gap on a stock that just got a regulatory ban headline, with no card, is:", options: ["Mean-reversion skill", "Improvising inside a new information set — usually a skip", "A VWAP reclaim", "Mandatory"], answer: 1, why: "The information set changed. Proverbs do not apply." },
  },
  "intraday-10": {
    lead: "The day-trader's kill switch is a number and a behaviour: −2R (or your IPS number) and the DOM closes. Not 'one more to get to −1.5'. The switch is rehearsed on a calm Saturday so that a live Thursday cannot negotiate it.",
    covers: ["Daily cap, weekly cap, consecutive-loss cap.", "Physical protocol: stand up, close platform, walk.", "Next session starts at half size until a compliance sample exists."],
    blocks: [
      { t: "card", title: "Intraday kill switch", fields: [
        ["Daily loss cap", "−2R then done (example — write yours)"],
        ["Consecutive losers", "3, then 60-minute hard stop"],
        ["Time stop for the seat", "No new after 14:30 except flatten"],
        ["Body tell", "Heart-rate, 'get it back' sentence"],
        ["Physical next step", "Close platform, water, outside 10 min"],
        ["Next session", "0.5× size until 8 compliant tickets"],
      ] },
      { t: "p", text: "This is the least glamorous chapter in the course and the one that keeps the rest of it from being a museum of clever setups. Talent is common. A nervous system that can stop is not." },
    ],
    takeaways: ["Cap is a behaviour.", "Rehearse off-line.", "Half-size to rebuild."],
    quiz: { q: "Hitting −2R at 11:10 and taking 'one more scalp to even the day' is:", options: ["Resilience", "Negotiating the kill switch — the usual path to −4R", "Kelly", "A bulk deal"], answer: 1, why: "The switch exists so you cannot bargain." },
  },

  "relval-01": {
    lead: "Relative value is trading a spread: A versus B, near versus next, cash versus future. The story ('banks are cheap') is optional. The residual (A minus beta×B) is the P&L. If you cannot write the residual, you do not have a pair. You have two directional bets wearing a trench coat.",
    covers: ["Name the two legs and the residual.", "Net beta/delta is a risk, not a rounding error.", "A pair with leftover directional risk is a stealth outright."],
    blocks: [
      { t: "formula", expr: "Residual ≈ A − β·B  (in rupee or % terms)", meaning: "β is how much B usually moves when A moves. You are trying to own the leftover, not the market." },
      { t: "p", text: "Long 1 lot Bank Nifty, short 2 lots Nifty is a pair only after you compute net Nifty-beta. If that net is +0.7 lot-equivalent, you are still long India. Call it a bullish-banks overlay, or add Nifty shorts until the residual is what you meant." },
      { t: "callout", kind: "caution", title: "Two charts is not a pair", text: "Buying HDFC Bank and selling ICICI because both are 'banks' without a beta, a residual band, and a kill, is two tickets. Correlation is 1 on the crash day — see intermarket." },
    ],
    takeaways: ["Residual is the trade.", "Net beta must be named.", "Two directionals ≠ a pair."],
    quiz: { q: "A 'pair' that is still +0.8 net Nifty-beta is best described as:", options: ["Market-neutral", "A stealth outright plus a leftover", "A G-Sec", "Cash-and-carry"], answer: 1, why: "The residual is not the main risk — the market is." },
  },
  "relval-02": {
    lead: "Cash-and-carry: buy the cheaper cash (or basket), sell the rich future, hold to convergence at expiry (financing and dividends included). Reverse cash-and-carry is the other way when you can actually short the cash. In India, the hard part is the short and the costs — not the cartoon.",
    covers: ["Basis = future − cash (quote conventions vary — use one and stick to it).", "Fair value ≈ cash × (1 + r·t) − dividends.", "If costs eat the basis, there is no arb."],
    blocks: [
      { t: "diagram", name: "basis-spread" },
      { t: "formula", expr: "Carry P&L ≈ (entry basis − exit basis) − financing − impact − STT/fees + dividends", meaning: "You get paid the rich basis only if you survive costs and can hold to the window you planned." },
      { t: "p", text: "Index futures in India can sit rich or cheap versus fair value around events, expiry, and heavy FII days. A 12-point Nifty richness on 1 lot is ₹780 before costs. Round-trip fees, STT on the future, and the cash-leg impact can erase that. Size only when the basis is wide versus your all-in hurdle — and when you can actually execute the cash basket (you probably cannot, at retail). Practical cousin: trade the basis as a view with futures calendars or a BeES-vs-future residual, knowing it is not a risk-free arb." },
      { t: "callout", kind: "india", title: "You are not a cash-and-carry desk", text: "True index arb needs the basket, borrow, and speed. Retail 'the future looks premium, I'll short it naked' is a directional view pretending to be arb. Write it as a view or skip." },
      { t: "example", title: "Hurdle", body: "Nifty cash 24,100, near future 24,148, 8 days to expiry. Richness 48 points. Theoretical fair maybe 24,118. Edge vs fair ~30 points × 65 = ₹1,950 per lot. All-in costs+impact budget ₹700. Maybe. If you cannot buy the basket, shorting the future alone is a 48-point short of India with a story. Different species." },
    ],
    takeaways: ["Basis is a number with costs.", "Fair value includes carry and dividends.", "Naked future ≠ arb."],
    quiz: { q: "Shorting a rich Nifty future without a cash/basket long is:", options: ["Classic cash-and-carry", "A directional short with a basis story attached", "Risk-free", "A REIT"], answer: 1, why: "Without the cash leg, beta remains." },
    sources: [NSE],
  },
  "relval-03": {
    lead: "Reverse cash-and-carry needs a short cash leg: sell expensive cash, buy cheap future. In India, shorting cash is constrained (SLB, intra-day, ban list). If you cannot locate borrow, the textbook trade does not exist. Write 'unavailable' rather than inventing a hero short.",
    covers: ["Borrow is a scarce resource.", "Ban list and ASM change the menu.", "A basis that looks 'too cheap' can stay cheap if nobody can short cash."],
    blocks: [
      { t: "p", text: "SLB (stock lending and borrowing) exists. It is not a Netflix button. Availability, fees, and recall risk are the trade. A 1% annualiseable cheapness in a name you cannot borrow is a museum piece, not a P&L." },
      { t: "ul", items: ["Check F&O ban, ASM, and whether SLB is live in that name before you write reverse-CAC.", "Recall risk: borrowed shares can be pulled. Your hedge can vanish.", "Corporate actions on the borrow are operational risk — see microstructure."] },
    ],
    takeaways: ["No borrow, no reverse-CAC.", "Cheap can stay cheap.", "SLB is an operation, not a click."],
    quiz: { q: "A stock future sitting cheap versus cash when the name cannot be borrowed usually means:", options: ["Guaranteed profit if you short cash anyway", "The reverse-CAC textbook trade is not available — cheapness can persist", "SEBI will close the gap by 3pm", "VIX is wrong"], answer: 1, why: "Constraints are the price." },
    sources: [NSE, SEBI],
  },
  "relval-04": {
    lead: "Nifty versus Bank Nifty is the most liquid India pair a retail desk will ever see. It is still a pair: you must name net beta, a band, and a kill. 'Banks look strong' is a sector view. The pair is the residual after you cancel India.",
    covers: ["Estimate BN beta versus Nifty (it is not 1.0).", "Ratio or point-spread — pick one ruler.", "RBI days are a different sample."],
    blocks: [
      { t: "p", text: "If Bank Nifty usually moves ~1.3× Nifty, a long 1 BN lot versus short 1 Nifty lot is still net long financials and a bit net long India. Compute lot-notional: BN notional / Nifty notional, then haircut by beta. The leftover is the trade." },
      { t: "example", title: "Ratio sketch", body: "Nifty 24,200 × 65 ≈ ₹15.7 lakh. Bank Nifty 52,000 × 15 (illustrative lot — check live) ≈ ₹7.8 lakh. Crude notional ratio is not the beta. If BN beta vs Nifty is 1.25 in your sample, you need enough Nifty shorts to cancel 1.25 × BN India-equivalent. Write the number. Then write the band: 'fade BN/Nifty z-score 2, kill if RBI day or if z-score 3 against me'." },
      { t: "callout", kind: "caution", title: "RBI, credit events, and results weeks", text: "Your quiet-day beta is not the policy-day beta. Either flatten the pair into RBI, or have a separate RBI card. Mixing samples is how a 'market-neutral' pair becomes a directional gut-punch." },
    ],
    takeaways: ["BN/Nifty is a residual.", "Beta ≠ notional ratio.", "Event days are another species."],
    quiz: { q: "Long 1 Bank Nifty lot, short 1 Nifty lot, without a beta calculation, is best called:", options: ["Perfectly market-neutral", "An unquantified mix of India-beta and banks", "Cash-and-carry", "A collar"], answer: 1, why: "Lots are not risk units across indices." },
  },
  "relval-05": {
    lead: "Two-stock pairs: same sector, similar beta, a residual that mean-reverts in your sample after costs. The kill is when the residual is not a residual anymore — a merger, a fraud, a delisting, a results gap that changes the businesses.",
    covers: ["Same-sector is not enough.", "Cointegration folklore is not a substitute for a kill.", "Size from residual vol, not from 'they're both banks'."],
    blocks: [
      { t: "steps", title: "Pair card", items: [
        "Why these two (business overlap, not just sector label).",
        "β from a quiet sample; re-estimate after results.",
        "Residual band in % or rupees. Entry, add (or no-add), kill.",
        "Corporate calendar: results, lock-ins, index events — flatten or skip.",
        "Days-to-exit on the thinner leg — that leg sizes the pair.",
        "Net index beta after the pair: name it, hedge it, or accept it.",
      ] },
      { t: "example", title: "The fraud kill", body: "Long A / short B, both NBFCs. Residual blows 8% because A discloses a forensic audit. This is not 'z-score 4, add'. The residual is now a credit event. Flatten. Pairs die when the model of the businesses dies." },
    ],
    takeaways: ["Business overlap, then beta.", "Fraud/results can retire a pair.", "Thin leg sizes the trade."],
    quiz: { q: "When one leg of a pair discloses a forensic audit, the professional default is:", options: ["Add because z-score is extreme", "Retire the pair — the residual thesis broke", "Convert to a straddle", "Ignore until expiry"], answer: 1, why: "The model of 'same business' broke." },
  },
  "relval-06": {
    lead: "Calendar spreads (near versus next future, or near versus next option expiry) trade the path of the basis / the term structure, not the headline bull story. If you 'just want gold', you want a funded outright. If you want the roll, write the roll.",
    covers: ["Net delta of a calendar is not zero forever.", "Expiry week of the near is the work.", "Option calendars are vega/theta term-structure trades — see vol track."],
    blocks: [
      { t: "p", text: "Long near crude / short next is a view that the near will richen versus the next (or that you will harvest a backwardation). A crude spike can still wreck you if the two legs' deltas get away. Treat calendars as positions with a residual delta cap." },
    ],
    takeaways: ["Calendars are term structure.", "Watch residual delta.", "Near expiry is the job."],
    quiz: { q: "Long near silver future, short next, is primarily:", options: ["A fully funded silver bull", "A roll / term-structure view with leftover silver beta", "A REIT", "India VIX"], answer: 1, why: "Net silver exposure is usually not zero." },
  },
  "relval-07": {
    lead: "Nifty BeES (or any index ETF) versus Nifty futures is a practical residual for people who cannot trade the basket. Premium/discount to iNAV, plus futures basis, plus fees, is the whole trade. If the ETF is 0.4% rich and the future is fair, selling the richness is a different job from shorting India.",
    covers: ["iNAV versus last price.", "Creation/redemption is the rubber band — when it works.", "Thin ETFs can stay rich."],
    blocks: [
      { t: "p", text: "On the ABC Funds desk you already have BeES tickets. Here is the advanced lens: BeES last versus iNAV versus futures fair value. Three numbers. A 0.6% ETF premium with a sleepy iNAV is a sale of the wrapper, not a sale of Nifty — if you can short the ETF or sell a future against a long you already wanted. If you cannot short the ETF, you wait or you skip. Do not invent a short Nifty as a 'proxy' unless you wanted that beta." },
      { t: "callout", kind: "india", title: "Tracking error is a cost", text: "Even well-behaved BeES has a small residual versus Nifty. Over a week it is noise. As a 2-hour scalp it can be your entire 'edge'." },
    ],
    takeaways: ["Three numbers: last, iNAV, futures.", "Wrapper ≠ index.", "Cannot short wrapper ⇒ cannot fade its premium."],
    quiz: { q: "Nifty BeES 0.5% rich to iNAV while futures are at fair value is primarily:", options: ["A reason to short India", "A wrapper-premium story — only a trade if you can express the wrapper", "Proof of insider trading", "A VIX buy"], answer: 1, why: "The index may be fair; the ETF print is not." },
  },
  "relval-08": {
    lead: "Commodity ratios (gold–silver, gold–crude, copper–gold) are pairs with macro stories attached. The story is allowed. The residual still needs a band, a hedge for leftover outright, and a skip around events (Fed, RBI, geopolitics) that shove both legs the same way.",
    covers: ["Ratio ≠ automatically mean-reverting.", "Leftover outright is the silent killer.", "MCX lots differ — equal lots is not equal risk."],
    blocks: [
      { t: "p", text: "Gold–silver ratio is a classic. It can trend for a year. Fading a 20-year extreme without a shock cell is how people meet a 21-year extreme. On MCX, GOLDMINI versus SILVERM have different rupee notionals and different jump personalities. Equal contracts is not a pair." },
      { t: "example", title: "Notional first", body: "GOLDMINI notional might be ~₹7 lakh; SILVERM something else entirely — check live. A 1:1 lot pair can be a 2:1 rupee bet. Compute rupee beta, then the residual. Then write the event skip: CPI week, Fed night, or a jewellery-demand festival is a different sample." },
    ],
    takeaways: ["Lots ≠ risk.", "Ratios can trend.", "Event skip on both-legs days."],
    quiz: { q: "Going long 1 GOLDMINI and short 1 SILVERM because 'the ratio is high' without notionals is:", options: ["Classic arb", "An unquantified mix of metals risk", "Risk-free", "A G-Sec"], answer: 1, why: "Contracts are not commensurate." },
    sources: [MCX],
  },
  "relval-09": {
    lead: "Classic index arbitrage — buy the basket, sell the future, capture a risk-free basis — is a professional, speed-and-capital sport. Retail cannot run it as a business. Knowing why you cannot is part of being advanced: you stop dressing direction as arb, and you stop paying someone who can.",
    covers: ["Need: basket execution, borrow, capital, latency, membership.", "What you can do: avoid being the slow leg; trade defined views of richness.", "Humility is a strategy."],
    blocks: [
      { t: "ul", items: ["Impact on 50 names at once is a desk with algos.", "Fees and STT on both legs can exceed a 8-point Nifty richness.", "By the time your click lands, the richness is often gone — you keep the beta."] },
      { t: "callout", kind: "idea", title: "Advanced does not mean 'do the institutional trade smaller'", text: "It means picking trades whose edge survives your latency and your costs. That set is smaller. That is the point." },
    ],
    takeaways: ["Index arb is not a retail product.", "Don't dress beta as arb.", "Pick edges that survive your click."],
    quiz: { q: "Seeing Nifty futures 20 points rich and shorting them on a phone app is:", options: ["Index arbitrage", "A directional short with an arb story", "Risk-free carry", "SLB"], answer: 1, why: "No cash basket, no arb." },
  },
  "relval-10": {
    lead: "Write a relative-value card the way ABC writes a Nifty structure card: two legs, residual, net beta, band, event skip, leftover plan. If it does not fit on one page, you do not understand it yet.",
    covers: ["One page.", "Net beta named in lots and rupees.", "Kill is a date or a residual, not a mood."],
    blocks: [
      { t: "card", title: "Relative-value fill sheet", fields: [
        ["Pair name", "e.g. BN vs Nifty / BeES vs future / GOLD vs SILVER"],
        ["Leg A (product, side, qty, limit)", ""],
        ["Leg B (product, side, qty, limit)", ""],
        ["Net beta / leftover outright", ""],
        ["Residual ruler (z, %, points)", ""],
        ["Entry / add / kill", ""],
        ["Event skip", "RBI / results / Fed night / …"],
        ["Days-to-exit (thinner leg)", ""],
        ["Max residual R", ""],
        ["Leftover plan if one leg bans/halts", ""],
      ] },
    ],
    takeaways: ["One page or skip.", "Leftover outright named.", "Event skip is a field."],
    quiz: { q: "A pair ticket with no leftover-outright field is:", options: ["Cleaner", "Incomplete — you may be holding a stealth directional", "Approved by SPAN", "A SIP"], answer: 1, why: "Unnamed leftover is unnamed risk." },
  },

  "rates-01": {
    lead: "RBI's policy corridor is the plumbing of rupee money: SDF (floor), repo (the headline), MSF (ceiling). Liquidity in the system can sit at the floor even when the repo is unchanged. Advanced India books read the corridor, not just the 25 bp theatre.",
    covers: ["Repo is the advertised rate; corridor is the room.", "SDF and MSF bound overnight money.", "A hold with a drain is a different trade from a hold with a flood."],
    blocks: [
      { t: "diagram", name: "rbi-corridor" },
      { t: "p", text: "If banks are parking surplus at the SDF, money is plentiful — short-end rates hug the floor. If they are borrowing at MSF, money is tight. Your duration book, your bank NIM story, and your USDINR hedge all care which wall the system is leaning on." },
      { t: "table", caption: "Corridor walls (conceptual)", headers: ["Tool", "Role", "What it tells a desk"], rows: [
        ["SDF", "Floor — park surplus", "Plenty of rupees"],
        ["Repo / LAF", "Headline policy + everyday liquidity", "The advertised weather"],
        ["MSF", "Ceiling — emergency borrowing", "Rupees are scarce"],
      ] },
      { t: "callout", kind: "india", title: "Read the minutes and the liquidity print, not just the GIF", text: "A 25 bp cut into a persistent MSF-using system can still leave financials confused. The integer is not the book." },
    ],
    takeaways: ["Corridor > integer.", "Floor vs ceiling is a regime.", "Liquidity ≠ repo."],
    quiz: { q: "Banks persistently using the MSF usually means:", options: ["Rupee liquidity is abundant", "Overnight money is scarce relative to need", "Nifty must rally", "VIX is 12"], answer: 1, why: "MSF is the ceiling — people only go there when they must." },
    sources: [RBI],
  },
  "rates-02": {
    lead: "LAF, VRR, OMOs, and FX swaps are how RBI actually puts rupees in or takes them out. The policy rate can sit still while these tools quietly reprice the belly of the curve. Duration traders who only watch the MPC GIF are late.",
    covers: ["OMO purchase ≈ duration bid from the authority.", "VRR and durable liquidity are not the same as a 25 bp cut.", "FX intervention can be a rupee-liquidity event too."],
    blocks: [
      { t: "p", text: "An OMO purchase is RBI buying G-secs — a bid for duration. An OMO sale is the opposite. A variable-rate repo can add (or drain) for a defined tenor. If you run a gilt fund or a long-duration sleeve, these are your weather reports. If you run Bank Nifty weeklies, they are a second camera on NIM and on 'why did bonds move when Nifty didn't'." },
      { t: "ul", items: ["Map: is today's bond move a policy-path story or a liquidity-operation story?", "Do not fade a 10-year spike the morning of a large OMO sale as if it were 'overextended RSI'.", "Write three tickets before MPC: hike / hold / cut — then a fourth: 'operation into a hold'."] },
    ],
    takeaways: ["Operations move curves.", "OMO is duration flow.", "Hold + drain ≠ hold + flood."],
    quiz: { q: "RBI announcing a large OMO sale, repo unchanged, usually pressures:", options: ["Nothing — integer was zero", "Bond prices (yields up) via duration supply", "India VIX to zero", "Gold BeES mechanically"], answer: 1, why: "Selling G-secs is a duration supply." },
    sources: [RBI],
  },
  "rates-03": {
    lead: "The G-sec curve has a level (rates up/down), a slope (short vs long), and a butterfly (belly vs wings). A bull steepener is not a bear flattener. Naming which of the three you own is how duration books stop pretending every bond move is 'RBI'.",
    covers: ["Level, slope, curvature.", "Which sector of the curve your fund actually owns.", "A 10-year print is not the whole curve."],
    blocks: [
      { t: "p", text: "If you own a 10-year and the 2-year rips higher on a hawkish hold, you can make or lose money depending on the slope move. That is not trivia. That is P&L attribution for a gilt sleeve — and a hint for bank NIMs (short-end) versus insurers (long-end)." },
      { t: "table", caption: "Name the move", headers: ["Nickname", "What happened", "Who feels it first"], rows: [
        ["Bull steepener", "Short-end yields down more", "Money-market, some banks"],
        ["Bear flattener", "Short-end yields up more", "Funding, NBFCs, floaters"],
        ["Parallel sell-off", "Level up everywhere", "Duration funds"],
        ["Belly cheapening", "7–10y underperform wings", "Active gilt pickers"],
      ] },
      { t: "formula", expr: "Approximate duration P&L ≈ −Modified duration × Δyield × market value", meaning: "A 7-duration fund on a +10 bp parallel is about −0.7% before convexity and carry. Know the duration you actually have." },
    ],
    takeaways: ["Three curve risks.", "Duration is a number.", "10y ≠ the curve."],
    quiz: { q: "A hawkish hold that lifts the 2-year much more than the 10-year is primarily a:", options: ["Parallel bull", "Bear flattener-ish short-end story", "Gold squeeze", "Max pain"], answer: 1, why: "Short-end repriced more — slope flattened from the front." },
    sources: [RBI, CCIL],
  },
  "rates-04": {
    lead: "Bank Nifty is a rates animal wearing an equity costume. NIM, treasury books, loan growth, and credit costs all sit downstream of the corridor and the curve. A 10-year print is allowed to shove BN even when Nifty IT is asleep.",
    covers: ["Asset-sensitive vs liability-sensitive banks.", "Treasury marks on a sell-off.", "NBFCs and the short end."],
    blocks: [
      { t: "p", text: "A private bank that reprices assets fast can like a gentle hike cycle. A book stuffed with duration in the treasury cannot. 'Banks' is not a monolith. Split: PSU vs private, wholesale-funded NBFC vs deposit-rich. Then look at the curve. Then write the BN ticket — or skip because the mix is too messy for a weekly option." },
      { t: "example", title: "Same hike, two books", body: "Repo +25 bp. Deposit-rich retail bank: NIM maybe up with a lag. Wholesale NBFC: funding cost up now, asset yield later. BN as an index is a blend. A BN weekly condor into the hike is a vol ticket, not a NIM view. If you have a NIM view, express it in names or in a defined directional with a shock cell — not in a 2-day pin." },
    ],
    takeaways: ["BN is rates-adjacent.", "Split the banks.", "Weeklies are vol, not NIM."],
    quiz: { q: "Expressing a 12-month NIM view in a 2-day Bank Nifty option credit is:", options: ["Precise", "A horizon mismatch — short-dated BN options are gamma, not NIM", "Required", "A cash-and-carry"], answer: 1, why: "Contain the view in the product. BN weeklies were pulled; the remaining short-dated BN is still not a 12-month view." },
  },
  "rates-05": {
    lead: "T-bills, SDLs, and corporates sit on top of G-secs with extra spread for tenor, credit, and liquidity. That extra is not free income. It is a named risk. A 50 bp 'pick-up' on a thin corporate bond is a liquidity-and-credit coupon, not a G-sec clone.",
    covers: ["Spread = credit + liquidity + structure.", "SDLs are states, not the Union.", "Corporate bonds can gap on a rating news with no bid."],
    blocks: [
      { t: "p", text: "In a risk-off week, G-secs can rally (flight) while corporate spreads blow. Your 'debt fund' can lose money while 'bonds are up' on television. That is why the Funds track told you to read the factsheet's duration and credit quality. Here is the desk version: know which spread you are selling." },
      { t: "callout", kind: "caution", title: "Illiquid credit is a lock-up wearing a NAV", text: "Open-end debt funds that own thin credits can gap the NAV when those credits finally reprice. That is not an opportunity to 'buy the dip' without reading holdings. It can be the start of a credit story." },
    ],
    takeaways: ["Spread is a risk.", "SDL ≠ G-sec.", "Thin credit can gap the NAV."],
    quiz: { q: "G-sec yields down 8 bp while a credit-heavy debt fund's NAV is down usually points to:", options: ["NAV fraud always", "Credit/liquidity spreads widening even as the risk-free rallied", "VIX", "A circuit on gilts"], answer: 1, why: "Spread is a separate P&L." },
    sources: [RBI],
  },
  "rates-06": {
    lead: "Interest-rate futures (where liquid) let you express duration without owning the cash gilt. Where they are not liquid, they are a quote. Advanced means checking open interest and the spread before you write a 'rates view' in futures clothing.",
    covers: ["Futures are a duration tool when the book is real.", "Basis to the cheapest-to-deliver (if that structure exists) is the professional residual.", "Thin IRF is not a clever Nifty hedge."],
    blocks: [
      { t: "p", text: "If the contract you wanted has a 4-tick spread and 200 open interest, you do not have a rates desk. You have a screenshot. Use a liquid gilt fund overlay, a defined bank/NBFC equity expression, or skip. Product availability is part of the view." },
    ],
    takeaways: ["Liquidity first.", "Thin IRF ≠ hedge.", "Duration needs a real book."],
    quiz: { q: "Hedging a gilt sleeve with an interest-rate future that has a wide spread and tiny OI is:", options: ["Institutional", "Usually a bad hedge — you may not get out", "Risk-free", "A VWAP reclaim"], answer: 1, why: "A hedge you cannot exit is a new risk." },
    sources: [NSE],
  },
  "rates-07": {
    lead: "Credit spreads blow in clusters: a name, a sector, then 'anything with a hyphen'. The advanced habit is to treat a sudden 40 bp widening in a quiet NBFC as information, not as a gift. First camera: is this idiosyncratic or a funding-market story?",
    covers: ["Idiosyncratic vs systemic widening.", "Commercial paper / CD prints as a camera.", "Equity of wholesale-funded names is a high-beta credit derivative in disguise."],
    blocks: [
      { t: "p", text: "When a wholesale NBFC's CP rate jumps, the equity is allowed to gap before the rating language changes. That is not 'the market is stupid'. That is credit migrating into the equity tape. Your forensic and sector tracks meet here." },
      { t: "steps", title: "Spread-blow protocol", items: [
        "Name: one issuer or many?",
        "Funding: CP/CD, bank lines, ALM mismatch?",
        "Equity: already told the story, or about to?",
        "Your book: any stealth credit (hybrid funds, 'safe' debt funds, promoter-pledge names)?",
        "Action: reduce, hedge with a defined put if liquid, or hold with a written thesis. 'It will bounce' is not a thesis.",
      ] },
    ],
    takeaways: ["Spreads cluster.", "CP is a camera.", "Equity can be credit."],
    quiz: { q: "A wholesale NBFC's CP rate jumping 80 bp while the rating is unchanged is best treated as:", options: ["Noise — wait for the rating", "A funding-market camera that can hit the equity first", "A buy signal", "India VIX"], answer: 1, why: "Funding stress often prints before the rating language." },
  },
  "rates-08": {
    lead: "Bank NIMs are a lagging, messy function of deposit mix, loan mix, and the corridor. They are not a 1:1 with the last repo change. Trading 'hike = banks up' as a slogan is how people buy PSU treasuries right into a mark-to-market hole.",
    covers: ["CASA vs bulk deposits.", "Floating vs fixed loan books.", "Treasury duration as a second P&L."],
    blocks: [
      { t: "p", text: "Split the P&L in your head: (1) core NIM, (2) credit costs, (3) treasury. A hike cycle can help (1) for an asset-sensitive book, hurt (3) immediately, and leave (2) for later. Your equity ticket has to say which of the three you are betting. If you cannot, buy an index or skip." },
    ],
    takeaways: ["NIM lags.", "Three bank P&Ls.", "Slogan ≠ ticket."],
    quiz: { q: "A bank with a large marked-to-market gilt book into a surprise hike will first feel pain in:", options: ["CASA", "Treasury / duration marks", "India VIX", "Its demat AMC"], answer: 1, why: "Duration marks now; NIM later." },
  },
  "rates-09": {
    lead: "Real rates are nominal minus expected inflation. Gold, duration, and the rupee all care. A high nominal repo with higher inflation is not 'tight' in the way a high real rate is. Advanced macro for an India book starts here, not with a US YouTuber's acronyms.",
    covers: ["Real rate ≈ policy − expected CPI.", "Gold likes falling real rates more than it likes 'crisis' slogans.", "RBI's inflation target is the North Star of the corridor."],
    blocks: [
      { t: "p", text: "If CPI is sticky on food (monsoon, vegetables) and RBI is on hold, real rates can be lower than the headline repo suggests. That mix can be rupee-negative, gold-friendly, and confusing for banks. Write the mix. Don't quote the integer." },
    ],
    takeaways: ["Real > nominal for gold and FX.", "Food CPI can hijack the path.", "Target is the constraint."],
    quiz: { q: "Repo 6.5% with expected CPI 6.2% versus repo 6.5% with expected CPI 3.5% are:", options: ["The same tightness", "Very different real-rate regimes", "Identical for gold", "Identical for USDINR"], answer: 1, why: "Real rate is the gap." },
    sources: [RBI],
  },
  "rates-10": {
    lead: "A one-page rates dashboard you can fill in four minutes: corridor position, 2y/10y, OMO/VRR calendar, CPI last, USDINR, Bank Nifty vs Nifty, your duration sleeve. If a cell is blank, you do not size a rates-adjacent ticket.",
    covers: ["Four minutes.", "Fill or skip.", "This page sits next to the index open card."],
    blocks: [
      { t: "card", title: "Rates dashboard", fields: [
        ["Repo / SDF / MSF (where is overnight?)", ""],
        ["2-year / 10-year / slope", ""],
        ["Last OMO / VRR / durable liquidity", ""],
        ["CPI last + food vs core one-liner", ""],
        ["USDINR 1-day / 1-week", ""],
        ["BN vs Nifty 1-week", ""],
        ["My duration sleeve (yes/no, how much)", ""],
        ["Allowed today", "hold / reduce / defined hedge / skip"],
      ] },
    ],
    takeaways: ["One page.", "Corridor + curve + CPI + FX.", "Blank cell = no size."],
    quiz: { q: "Sizing a Bank Nifty option into MPC with a blank rates dashboard is:", options: ["Discretion", "Flying without the weather sheet", "A cash-and-carry", "Required"], answer: 1, why: "BN is rates-adjacent — the sheet is the job." },
  },

  "fx-01": {
    lead: "USDINR is a managed, heavily watched pair. It is not AUDUSD. RBI, oil, FII, and the global dollar can all sit on the other side of your tick. Treating it as a random FX scalp is how people meet intervention.",
    covers: ["Policy pair, not a free float in the textbook sense.", "Levels can matter because a large actor cares.", "Your ticket is either hedge or spec — never both in one card."],
    blocks: [
      { t: "p", text: "A slow drift in USDINR with FII buying and quiet oil is one regime. A fast move with Brent at a shock and EM outflows is another. RBI can fade the second for longer than your stop-loss has capital. Fade-the-spike needs a clock and a 'if it doesn't reverse, flatten' — same as news spikes." },
      { t: "callout", kind: "india", title: "Intervention is a counterparty", text: "You will not get a push notification that says 'public sector bank in the window'. Spikes that reverse in two hours are often that weather. Your journal should tag 'possible intervention' as a hypothesis, not as a conspiracy." },
    ],
    takeaways: ["USDINR is managed weather.", "Hedge vs spec on the card.", "Intervention can outlast a stop."],
    quiz: { q: "Fading a USDINR spike with a tight stop as if it were EURUSD is:", options: ["Professional FX", "Importing a free-float habit onto a policy pair", "A DCF", "Required by FEMA"], answer: 1, why: "A large official actor can be in the window." },
    sources: [RBI, NSE],
  },
  "fx-02": {
    lead: "USDINR has Indian hours and a US overlap. The quiet middle can be a lie. Overnight NDF-ish weather shows up in the next open. If you hold a spec through the US session, you volunteered for a gap you may not have sized.",
    covers: ["Session personality.", "US hours can shove the next print.", "Overnight spec is a different product."],
    blocks: [
      { t: "p", text: "An importer who must buy dollars this week has a calendar. A spec who is 'just scalping' at 14:50 does not. Do not stand in front of the calendar flow unless that is the written job. And do not hold a 12-point scalp through a US CPI as if it were a delivery share." },
    ],
    takeaways: ["Hours matter.", "US overlap is a gap risk.", "Calendar flow ≠ scalp."],
    quiz: { q: "Holding a USDINR 8-point scalp through US CPI night converts it into:", options: ["The same scalp", "An overnight gap product you probably did not size", "A G-Sec", "A SIP"], answer: 1, why: "The product changed at the close." },
  },
  "fx-03": {
    lead: "Importer hedge: you will need dollars; you buy USDINR futures/options to cap the rupee cost. Exporter hedge: you will receive dollars; you sell. Speculators sit in the same contracts. The difference is the named underlying cashflow. If you have none, you are spec — size like it.",
    covers: ["Hedge ratio from the invoice, not from the chart.", "Tenor matches the cashflow date.", "Overhedging is a spec."],
    blocks: [
      { t: "example", title: "Importer card", body: "Invoice $2,00,000 due in 6 weeks. Buy USDINR futures notionally matching ~₹1.7 cr (at 85). That is a hedge. Buying 3× because 'it looks like a breakout' is 2× spec. Split the tickets. The hedge has a kill when the invoice is paid. The spec has a 1R." },
      { t: "steps", title: "Hedge versus spec", items: [
        "Write the cashflow: amount, currency, date, certainty (firm vs maybe).",
        "Hedge ratio: 80–100% of firm, less of maybe.",
        "Instrument: future for simplicity, option if you must keep upside.",
        "Spec leftover: separate card, 1R, daily cap.",
        "Unwound when the invoice dies — not when the chart is 'interesting'.",
      ] },
    ],
    takeaways: ["Invoice first.", "Overhedge = spec.", "Kill with the cashflow."],
    quiz: { q: "An importer who buys 3× the invoice notionally in USDINR futures has:", options: ["A perfect hedge", "One invoice-hedge and a leftover spec", "No FX risk", "A collar by default"], answer: 1, why: "The extra 2× is a directional bet." },
  },
  "fx-04": {
    lead: "Three bosses shove the rupee: the dollar (DXY/US yields), oil (current account), and FII (equity and debt flows). A move with all three aligned is a trend until one of them flips. A move with them fighting is a range. Your USDINR card should name which boss you think is in charge today.",
    covers: ["Name the boss.", "Oil is a tax on the rupee when it spikes.", "FII is a flow, not an oracle."],
    blocks: [
      { t: "table", caption: "Boss map", headers: ["Boss", "Rupee-negative when", "Often shows up with"], rows: [
        ["US dollar / yields", "US real rates up, DXY bid", "EM FX weak, FII risk-off"],
        ["Oil", "Brent spike", "OMCs, CAD worry, inflation"],
        ["FII", "Persistent equity/debt outflow", "Nifty weak, basis cheap"],
      ] },
      { t: "p", text: "If oil is quiet, FII is buying, and DXY is bid, you have a fight. Do not size a USDINR trend. If all three are rupee-negative, your importer should not 'wait for a dip' without a written limit. That is the whole advanced skill: naming the mix." },
    ],
    takeaways: ["Three bosses.", "Aligned = trend-friendly.", "Fighting = range or skip."],
    quiz: { q: "Brent quiet, FII buying, DXY ripping is usually:", options: ["A clean USDINR trend day", "A mixed-boss day — fade slogans, smaller size", "A mandatory hike", "Max pain"], answer: 1, why: "The bosses disagree." },
    sources: [RBI],
  },
  "fx-05": {
    lead: "Intervention is when official flow leans against the move. You will rarely see it labelled. You will see: a spike that dies, a round number that holds too well, or a day where the tape feels 'supplied'. Advanced speculators size as if a larger actor can appear. Hedgers do not need to guess — they need the invoice covered.",
    covers: ["Assume a larger actor can show up.", "Don't fade a level into a data shock as a personality.", "Hedgers care about the invoice, not the level folklore."],
    blocks: [
      { t: "p", text: "A 40-paise spike that gives back 30 paise in 90 minutes with oil unchanged is allowed to be official supply. It is also allowed to be positioning. You do not need the truth to have a rule: 'spike fades get a 4-hour clock; if the move re-extends, flatten; do not add'." },
    ],
    takeaways: ["Assume a large actor.", "Clock on spike fades.", "Hedgers: invoice, not folklore."],
    quiz: { q: "A USDINR spike that fully reverses with no oil/FII news is:", options: ["Proof you can always fade", "A possible intervention/positioning fade — still needs a clock", "A G-Sec", "Illegal"], answer: 1, why: "Hypothesis, not a law — clock it." },
  },
  "fx-06": {
    lead: "EURINR and JPYINR are mostly USDINR plus the EURUSD or USDJPY residual. If you do not have a view on the cross, you probably wanted USDINR. Trading EURINR because 'it looks cleaner' is how people accidentally own Europe.",
    covers: ["Cross = dollar-rupee + dollar-cross.", "Name which leg you meant.", "Liquidity is usually worse than USDINR."],
    blocks: [
      { t: "p", text: "Long EURINR ≈ long EURUSD + long USDINR (signs depending on quote). If your thesis is 'rupee weak', USDINR is the clean ticket. If your thesis is 'Europe vs India', write that — and accept the extra spread." },
    ],
    takeaways: ["Crosses are residuals.", "USDINR is the default rupee ticket.", "Worse liquidity."],
    quiz: { q: "A 'rupee weak' view is usually cleanest in:", options: ["JPYINR because the candles are pretty", "USDINR, unless you also have a yen or euro view", "Silver M", "Nifty BeES"], answer: 1, why: "Don't smuggle a dollar-cross." },
  },
  "fx-07": {
    lead: "USDINR options are event-vol and skew instruments. RBI days, US CPI, and oil shocks reprice them. Selling USDINR vol because 'the pair is range-bound' without a shock cell is how people meet a 80-paise gap.",
    covers: ["Defined only unless you are a genuine corporate overlay.", "Event vol crush after the print is a thing — see vol track.", "Delta on an FX option is still a USDINR position."],
    blocks: [
      { t: "p", text: "A defined USDINR put spread for an importer who wants a floor is a hedge with a TER. A naked short strangle because last month was quiet is a jump-sale. Same underlying. Opposite species. ABC's rule: name the invoice or name the 1R." },
    ],
    takeaways: ["FX options are jumps.", "Defined for specs.", "Delta is a position."],
    quiz: { q: "Naked short USDINR strangle into US CPI because 'it is range-bound' is:", options: ["Carry harvesting", "Selling a jump without a shock cell", "A hedge", "FEMA-required"], answer: 1, why: "Quiet history is not a cap on tonight's print." },
  },
  "fx-08": {
    lead: "Offshore USDINR (NDF-ish weather) can lead or diverge from onshore. You may not have a clean NDF screen. You still need to know it exists: overnight rupee stories often start there and show up in the NSE/MCX open. Do not be shocked by a 9:15 that 'nobody saw'.",
    covers: ["Offshore can price when you are asleep.", "Onshore can be supplied by official flow the offshore book does not have.", "Divergence is information, not an automatic arb for you."],
    blocks: [
      { t: "p", text: "If US hours priced a weaker rupee and onshore opens only half-way, possible stories: intervention inventory, a holiday, or a lag. You do not automatically fade or chase. You write: 'offshore led, onshore lag — I need a boss (oil/FII/DXY) to pick a side, or I skip the first hour'." },
    ],
    takeaways: ["Offshore exists.", "Divergence ≠ your arb.", "First hour: pick a boss or skip."],
    quiz: { q: "Onshore USDINR opening much calmer than overnight offshore weakness most honestly means:", options: ["Offshore was fake", "Different books and possibly official onshore supply — not an automatic fade", "You must buy USDINR", "VIX is wrong"], answer: 1, why: "Two venues, two inventories." },
  },
  "fx-09": {
    lead: "INR is not a high-carry textbook long like some EM peers: convertibility is managed, real rates and oil can flip the coupon, and you cannot treat it as an unfunded 'carry trade' from a retail F&O account. If someone sold you 'INR carry', ask who holds the other risks.",
    covers: ["Carry needs funding, convertibility, and a jump budget.", "Retail USDINR specs are not carry desks.", "Real rate + oil + FII dominate slogans."],
    blocks: [
      { t: "p", text: "A genuine carry trade is long the high-yielder, short the low-yielder, funded, with a jump-risk budget. A naked long rupee (short USDINR) because 'India yields more than the US' ignores that the US yield rose, oil spiked, or FII sold. The coupon you thought you owned is a mix of those bosses." },
    ],
    takeaways: ["INR is not textbook carry.", "Bosses > slogans.", "Retail spec ≠ carry desk."],
    quiz: { q: "Short USDINR because 'India has higher rates' without oil/FII/US-yield checks is:", options: ["Classic carry", "A slogan missing the bosses", "FEMA-required", "A BeES"], answer: 1, why: "The coupon is not the whole risk." },
  },
  "fx-10": {
    lead: "An FX hedge register is a table: invoice, amount, tenor, instrument, ratio, leftover spec, kill date. Corporates that skip this discover they were speculating. Speculators that skip this discover they were accidentally hedging a business they do not have.",
    covers: ["One row per cashflow.", "Hedge and spec never share a row.", "Review when the invoice changes, not when the candle is pretty."],
    blocks: [
      { t: "card", title: "FX hedge register row", fields: [
        ["Counterparty / invoice id", ""],
        ["Amount & currency", ""],
        ["Due date / certainty", "firm / likely / maybe"],
        ["Hedge instrument (future/option/none)", ""],
        ["Hedge % ", ""],
        ["Leftover spec (separate ticket id)", "none / id"],
        ["Kill / roll date", ""],
        ["Who is allowed to lift it", ""],
      ] },
      { t: "p", text: "This is unglamorous. It is also how you stop lifting a winning hedge because USDINR 'looks overextended' the week before the invoice hits. The register is the boss of the chart." },
    ],
    takeaways: ["One row per invoice.", "Don't lift hedges as charts.", "Spec gets its own id."],
    quiz: { q: "Closing an importer's USDINR hedge because the pair 'looks overbought' a week before the invoice is:", options: ["Alpha", "Converting a hedge into an unhedged invoice plus a view", "Required", "A VWAP"], answer: 1, why: "You lifted the insurance on a remaining cashflow." },
  },
});

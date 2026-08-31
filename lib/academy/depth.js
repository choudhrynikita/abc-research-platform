/**
 * Worked Indian-desk examples + advanced notes merged onto core lessons.
 */
function extra(id) {
  return DEPTH[id] || [];
}

const DEPTH = {
  "foundations-06": [
    { t: "example", title: "Worked spread", body: "Nifty option quoted 62.50 / 64.00. A market buy pays 64. A limit at 62.80 may miss. If you 'must' own it, the extra ₹1.50 × lot 65 = ₹97.50 is your impatience tax on one lot — before STT." },
  ],
  "india-03": [
    { t: "example", title: "T+1 on a holiday week", body: "You buy delivery on Thursday. Friday is a clearing holiday. Settlement is the next working day, not 'calendar tomorrow'. Funds you expected Friday morning may still be in the pipeline." },
  ],
  "equity-02": [
    { t: "example", title: "Read one quote", body: "LTP 1,412.40, bid 1,412.20×240, ask 1,412.60×180, VWAP 1,408.10, volume 2.4× 20-day average. The tape is offered a tick above last, the session's average rupee is below last (buyers paid up), and participation is unusual — none of that is a buy signal by itself. It is the dashboard." },
  ],
  "fundamentals-05": [
    { t: "depth", title: "Reverse DCF in one pass", text: "Price ₹2,400, next-year FCF ₹80/share, you want 12% and a 3% terminal. If the market is paying 30× that FCF, it is implying growth that must be earned for a long time. Write the implied growth before you write 'it looks cheap vs peers'." },
  ],
  "technicals-05": [
    { t: "example", title: "VWAP day", body: "Nifty opens 24,080, dumps to 23,940, reclaims session VWAP 24,020 at 11:10 on rising volume. A long that only exists above VWAP with a stop back under it is a participation rule — not a religion. If VWAP is still falling, you are early." },
  ],
  "futures-02": [
    { t: "example", title: "Nifty lot maths", body: "Assume lot 65. One lot at 24,100 is notional 65 × 24,100 = ₹15,66,500. A 40-point move is 65 × 40 = ₹2,600. If SPAN+exposure is ~₹1.5 lakh, that 40 points is ~1.7% of margin — and a much larger slice of a small account." },
  ],
  "futures-03": [
    { t: "example", title: "MTM cash", body: "Long 2 lots, settlement 24,100 yesterday, 24,040 today. P&L = (24,040 − 24,100) × 65 × 2 = −₹7,800, debited. The idea can still be 'right' next week. The cash left today." },
    { t: "lab", name: "sizer" },
  ],
  "futures-06": [
    { t: "example", title: "Hedge ratio sketch", body: "Cash book ₹80 lakh, beta ~1.1 versus Nifty, spot 24,100, lot 65. Lots ≈ (80,00,000 × 1.1) / (24,100 × 65) ≈ 5.6 → 6 lots short if you want a full overlay. 1 lot is a gesture, not a hedge." },
  ],
  "options-01": [
    { t: "lab", name: "payoff" },
    { t: "example", title: "Long 24,100 CE", body: "Spot 24,100, buy 24,100 CE at ₹62.5, lot 65. Debit = 62.5 × 65 = ₹4,062.5 per lot. Break-even at expiry = 24,162.5. At 24,300 the call is worth 200; profit (200 − 62.5) × 65 = ₹8,937.5 before costs. At 24,000 the call is 0; you lose the debit." },
  ],
  "options-02": [
    { t: "lab", name: "payoff" },
    { t: "example", title: "Bull call 24100 / 24300", body: "Buy 24,100 CE 62.5, sell 24,300 CE 18.0. Net debit 44.5. Max loss = 44.5 × 65 = ₹2,892.5. Max gain = (200 − 44.5) × 65 = ₹10,107.5. BE = 24,144.5. You bought a defined story — not a lottery, not unlimited." },
  ],
  "options-05": [
    { t: "example", title: "Delta as shares", body: "Short 2 Nifty 24,100 CE, delta 0.42 each. Share-equivalent ≈ 2 × 65 × 0.42 = 54.6 Nifty units short. If Nifty rips 80 points and gamma lifts delta to 0.55, you are suddenly ~71 units short. That is why short gamma is a job, not a coupon." },
    { t: "depth", title: "Desk depth", text: "Add vega: two short ATM weeklies with vega 8 each → 16 vega. IV +2 points ≈ +₹16 × 65 × 2 lots? No — vega is usually quoted per option point of IV on the premium. Confirm your vendor's unit before you size a vol bet. Never mix '₹ vega' and 'points vega' on the same card." },
  ],
  "options-06": [
    { t: "lab", name: "payoff" },
    { t: "example", title: "Iron condor sketch", body: "Spot 24,100. Sell 23,800 PE, buy 23,600 PE, sell 24,400 CE, buy 24,600 CE. Credit ₹42. Width 200. Max loss ≈ (200 − 42) = 158 points × 65 ≈ ₹10,270 per set, plus costs. If you only stared at the ₹42 credit, you sized the trade 4× too large." },
  ],
  "options-08": [
    { t: "lab", name: "sizer" },
    { t: "example", title: "1R on a debit spread", body: "Account ₹6,00,000. 1R = 0.4% = ₹2,400. Bull call max loss ₹2,892 per lot — that structure is already >1R. You either skip, use a narrower width, or admit this idea is 1.2R and take nothing else today." },
  ],
  "psychology-05": [
    { t: "example", title: "The ten-minute rule", body: "Stop hits 11:42. You want the 11:44 reversal. Stand up, water, set a timer. If at 11:54 the setup is still valid on the checklist without the word 'recover', you may look. If the only sentence is 'I need it back', you are done until tomorrow." },
  ],
  "risk-02": [
    { t: "lab", name: "sizer" },
    { t: "example", title: "Cash long", body: "Equity ₹5,00,000. 1R = 0.5% = ₹2,500. Buy at 1,410, invalidation 1,370. Risk ₹40/share. Size = 2,500 / 40 = 62 shares, not 'as many as MTF allows'." },
  ],
  "risk-06": [
    { t: "example", title: "Expectancy with costs", body: "40% wins at +1.8R, 60% losses at −1.1R (stops slip). Expectancy = 0.4×1.8 − 0.6×1.1 = 0.06R. After costs 0.15R per trade, expectancy is negative. The 'edge' was a spreadsheet before the contract note." },
  ],
  "desk-07": [
    { t: "example", title: "Nifty future break-even", body: "Round-trip fees+STT+spread ≈ ₹40–70 per lot depending on broker and aggression. A 1-point scalping dream (₹65) is already inside costs. Your average winner must clear the all-in hurdle or you are volunteering." },
  ],
};

module.exports = { extra };

"use client";

function Frame({ title, children }) {
  return (
    <figure className="academy-diagram">
      <svg viewBox="0 0 360 160" role="img" aria-label={title}>
        <rect width="360" height="160" rx="12" className="ad-bg" />
        {children}
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

export default function AcademyDiagram({ name }) {
  if (name === "order-book") {
    return (
      <Frame title="A simplified order book — bids left, asks right">
        <text x="28" y="28" className="ad-label">Bids</text>
        <text x="250" y="28" className="ad-label">Asks</text>
        <rect x="24" y="40" width="120" height="18" className="ad-bid" />
        <rect x="24" y="64" width="88" height="18" className="ad-bid" />
        <rect x="24" y="88" width="64" height="18" className="ad-bid" />
        <rect x="216" y="40" width="64" height="18" className="ad-ask" />
        <rect x="216" y="64" width="96" height="18" className="ad-ask" />
        <rect x="216" y="88" width="120" height="18" className="ad-ask" />
        <text x="148" y="136" className="ad-note">Spread is the gap at the inside</text>
      </Frame>
    );
  }
  if (name === "risk-triangle") {
    return (
      <Frame title="Volatility is a leg — not the whole triangle">
        <polygon points="180,28 64,132 296,132" className="ad-stroke" />
        <text x="148" y="70" className="ad-label">Volatility</text>
        <text x="70" y="148" className="ad-label">Ruin</text>
        <text x="232" y="148" className="ad-label">Liquidity</text>
      </Frame>
    );
  }
  if (name === "candle") {
    return (
      <Frame title="One candle is only OHLC">
        <line x1="110" y1="28" x2="110" y2="132" className="ad-wick" />
        <rect x="96" y="52" width="28" height="56" className="ad-bid" />
        <text x="140" y="44" className="ad-note">High</text>
        <text x="140" y="80" className="ad-note">Body (O→C)</text>
        <text x="140" y="128" className="ad-note">Low</text>
        <text x="230" y="80" className="ad-label">Wicks = rejected</text>
      </Frame>
    );
  }
  if (name === "structure") {
    return (
      <Frame title="Trend is a sequence of swings">
        <polyline points="28,120 80,88 120,104 180,52 220,70 300,32" className="ad-line" />
        <text x="28" y="148" className="ad-note">Higher lows · higher highs until a break of structure</text>
      </Frame>
    );
  }
  if (name === "payoff-long-call") {
    return (
      <Frame title="Long call at expiry — loss capped at premium">
        <line x1="24" y1="80" x2="336" y2="80" className="ad-axis" />
        <polyline points="40,100 160,100 320,28" className="ad-line" />
        <text x="48" y="92" className="ad-note">−premium</text>
        <text x="250" y="44" className="ad-note">unlimited-looking upside</text>
      </Frame>
    );
  }
  if (name === "payoff-long-put") {
    return (
      <Frame title="Long put at expiry — loss capped at premium">
        <line x1="24" y1="80" x2="336" y2="80" className="ad-axis" />
        <polyline points="40,28 180,100 320,100" className="ad-line" />
        <text x="240" y="92" className="ad-note">−premium</text>
        <text x="48" y="44" className="ad-note">pays if spot falls</text>
      </Frame>
    );
  }
  if (name === "greeks") {
    return (
      <Frame title="Greeks are slopes of the pricing function">
        <text x="32" y="48" className="ad-label">Δ delta — exposure</text>
        <text x="32" y="72" className="ad-label">Γ gamma — how delta mutates</text>
        <text x="32" y="96" className="ad-label">Θ theta — carry if nothing moves</text>
        <text x="32" y="120" className="ad-label">ν vega — sensitivity to IV</text>
      </Frame>
    );
  }
  if (name === "statements") {
    return (
      <Frame title="Three statements, one economic body">
        <rect x="20" y="36" width="100" height="88" className="ad-card" />
        <rect x="130" y="36" width="100" height="88" className="ad-card" />
        <rect x="240" y="36" width="100" height="88" className="ad-card" />
        <text x="38" y="84" className="ad-label">P&L</text>
        <text x="142" y="84" className="ad-label">Cash flow</text>
        <text x="254" y="84" className="ad-label">Balance</text>
      </Frame>
    );
  }
  if (name === "sizing") {
    return (
      <Frame title="Size from 1R, not from the dream">
        <text x="28" y="56" className="ad-label">1R rupees ÷ risk per unit = size</text>
        <text x="28" y="88" className="ad-note">Options: 1R = max loss of the defined structure</text>
        <text x="28" y="116" className="ad-note">If 1R is boring, the size is probably right</text>
      </Frame>
    );
  }
  if (name === "oi-quadrants") {
    return (
      <Frame title="Price vs change in OI — four hypotheses">
        <rect x="24" y="28" width="150" height="54" className="ad-bid" />
        <rect x="186" y="28" width="150" height="54" className="ad-ask" />
        <rect x="24" y="90" width="150" height="54" className="ad-ask" />
        <rect x="186" y="90" width="150" height="54" className="ad-bid" />
        <text x="40" y="52" className="ad-label">Price ↑ OI ↑</text>
        <text x="40" y="68" className="ad-note">Long build-up</text>
        <text x="202" y="52" className="ad-label">Price ↑ OI ↓</text>
        <text x="202" y="68" className="ad-note">Short covering</text>
        <text x="40" y="114" className="ad-label">Price ↓ OI ↑</text>
        <text x="40" y="130" className="ad-note">Short build-up</text>
        <text x="202" y="114" className="ad-label">Price ↓ OI ↓</text>
        <text x="202" y="130" className="ad-note">Long unwinding</text>
      </Frame>
    );
  }
  if (name === "oi-walls") {
    return (
      <Frame title="Strike-wise OI — walls around ATM">
        <rect x="40" y="88" width="28" height="40" className="ad-bid" />
        <rect x="78" y="64" width="28" height="64" className="ad-bid" />
        <rect x="116" y="40" width="28" height="88" className="ad-bid" />
        <rect x="168" y="36" width="28" height="92" className="ad-ask" />
        <rect x="206" y="56" width="28" height="72" className="ad-ask" />
        <rect x="244" y="80" width="28" height="48" className="ad-ask" />
        <line x1="156" y1="28" x2="156" y2="132" className="ad-wick" />
        <text x="148" y="24" className="ad-note">ATM</text>
        <text x="36" y="148" className="ad-note">Puts below</text>
        <text x="220" y="148" className="ad-note">Calls above</text>
      </Frame>
    );
  }
  if (name === "gamma-profile") {
    return (
      <Frame title="Long gamma cushions; short gamma chases">
        <polyline points="28,110 80,96 140,40 180,40 240,96 320,110" className="ad-line" />
        <line x1="24" y1="118" x2="336" y2="118" className="ad-axis" />
        <text x="118" y="34" className="ad-note">long Γ (U-shape P/L)</text>
        <text x="200" y="148" className="ad-note">short Γ is that curve flipped</text>
      </Frame>
    );
  }
  if (name === "gex-flip") {
    return (
      <Frame title="Dealer gamma flip — amplify vs pin">
        <rect x="24" y="40" width="140" height="80" className="ad-ask" />
        <rect x="196" y="40" width="140" height="80" className="ad-bid" />
        <text x="40" y="76" className="ad-label">Spot below flip</text>
        <text x="48" y="96" className="ad-note">short Γ · amplify</text>
        <text x="214" y="76" className="ad-label">Spot above flip</text>
        <text x="222" y="96" className="ad-note">long Γ · can pin</text>
        <text x="148" y="148" className="ad-note">zero-gamma / flip</text>
      </Frame>
    );
  }
  if (name === "theta-decay") {
    return (
      <Frame title="Theta is slow, then it is not">
        <polyline points="28,40 80,44 140,52 200,70 250,96 320,140" className="ad-line" />
        <text x="36" y="34" className="ad-note">premium</text>
        <text x="250" y="148" className="ad-note">expiry →</text>
        <text x="150" y="88" className="ad-label">decay accelerates</text>
      </Frame>
    );
  }
  return null;
}

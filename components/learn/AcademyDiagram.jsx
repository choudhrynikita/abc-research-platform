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
  if (name === "atr-stop") {
    return (
      <Frame title="ATR is a ruler — trail the stop by a multiple">
        <polyline points="28,110 70,90 110,96 150,60 200,70 250,44 320,52" className="ad-line" />
        <polyline points="28,128 70,118 110,122 150,98 200,104 250,88 320,92" className="ad-axis" />
        <text x="200" y="148" className="ad-note">price above · stop = high − k·ATR</text>
      </Frame>
    );
  }
  if (name === "bollinger") {
    return (
      <Frame title="Bollinger — a mean inside a volatility envelope">
        <polyline points="28,48 90,40 150,52 210,36 280,50 330,44" className="ad-axis" />
        <polyline points="28,80 90,76 150,82 210,74 280,84 330,78" className="ad-line" />
        <polyline points="28,112 90,118 150,110 210,122 280,114 330,118" className="ad-axis" />
        <text x="36" y="40" className="ad-note">+2σ</text>
        <text x="36" y="76" className="ad-label">SMA</text>
        <text x="36" y="128" className="ad-note">−2σ</text>
      </Frame>
    );
  }
  if (name === "supertrend") {
    return (
      <Frame title="Supertrend — an ATR trail that flips">
        <polyline points="28,100 80,70 130,78 180,48 230,56 300,36" className="ad-line" />
        <polyline points="28,118 80,102 130,108 180,90" className="ad-line" />
        <polyline points="180,90 230,70 300,58" className="ad-axis" />
        <text x="40" y="148" className="ad-note">long trail</text>
        <text x="210" y="148" className="ad-note">flip → short trail</text>
      </Frame>
    );
  }
  if (name === "ichimoku") {
    return (
      <Frame title="Ichimoku cloud is displaced equilibrium">
        <polygon points="80,50 160,40 250,70 250,110 160,100 80,90" className="ad-card" />
        <polyline points="28,96 90,80 150,70 220,58 320,48" className="ad-line" />
        <text x="120" y="80" className="ad-label">Kumo</text>
        <text x="220" y="40" className="ad-note">price above cloud</text>
      </Frame>
    );
  }
  if (name === "ai-loop") {
    return (
      <Frame title="AI as copilot — you still own the gate">
        <rect x="20" y="48" width="70" height="44" className="ad-card" />
        <rect x="108" y="48" width="70" height="44" className="ad-card" />
        <rect x="196" y="48" width="70" height="44" className="ad-card" />
        <rect x="284" y="48" width="56" height="44" className="ad-card" />
        <text x="32" y="74" className="ad-label">Data</text>
        <text x="118" y="74" className="ad-label">Model</text>
        <text x="204" y="74" className="ad-label">You</text>
        <text x="292" y="74" className="ad-label">Gate</text>
        <text x="70" y="128" className="ad-note">No fence, no live order</text>
      </Frame>
    );
  }
  return null;
}

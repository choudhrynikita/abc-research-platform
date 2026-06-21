function computeConfidence({ fields = [], alignment = 0, modelAgreement = null, backtestQuality = null }) {
  const available = fields.filter((f) => f.available).length;
  const total = fields.length || 1;
  const completeness = (available / total) * 100;

  let score = completeness * 0.5;
  score += Math.min(Math.max(alignment, 0), 100) * 0.25;

  if (modelAgreement != null) {
    score += Math.min(Math.max(modelAgreement, 0), 100) * 0.15;
  } else {
    score += completeness * 0.075;
  }

  if (backtestQuality != null && backtestQuality.samples >= 20) {
    score += Math.min(backtestQuality.hitRate ?? 50, 100) * 0.1;
  }

  return Math.round(Math.max(0, Math.min(score, 100)));
}

function field(name, value, source) {
  const available = value != null && value !== "" && !Number.isNaN(value);
  return { name, value, available, source };
}

module.exports = { computeConfidence, field };
const calculateROI = ({
  history = [],
  systemCost = 250,
  costPerLiter = 0.08,
  litersPerReading = 2,
}) => {
  const readings = Array.isArray(history) ? history : [];
  const baselineWater = readings.length * litersPerReading;

  const optimizedWater = readings.reduce((sum, reading) => {
    const active = Boolean(reading.irrigationNeed || String(reading.pumpStatus).toUpperCase() === "ON");
    return sum + (active ? litersPerReading : 0);
  }, 0);

  const waterSaved = Math.max(0, baselineWater - optimizedWater);
  const costSaving = waterSaved * costPerLiter;
  const roi = systemCost > 0 ? (costSaving - systemCost) / systemCost : 0;

  return {
    baselineWater,
    optimizedWater,
    waterSaved,
    costSaving,
    systemCost,
    roi,
    efficiencyGain: baselineWater > 0 ? waterSaved / baselineWater : 0,
  };
};

module.exports = {
  calculateROI,
};

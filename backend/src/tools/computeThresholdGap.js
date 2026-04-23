const computeThresholdGap = async ({ data, zone }) => {
  const soilMoisture = Number(data?.soilMoisture ?? 0);
  const threshold = Number(zone?.moistureThreshold ?? 40);

  return {
    soilMoisture,
    threshold,
    thresholdGap: soilMoisture - threshold,
  };
};

module.exports = computeThresholdGap;

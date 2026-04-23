const Zone = require("../models/Zone");

const resolveZone = async (zoneInput) => {
  try {
    if (!zoneInput) {
      const fallback = await Zone.findOne().sort({ zoneId: 1 });
      return fallback;
    }

    const normalized = String(zoneInput).trim();
    return await Zone.findOne({
      $or: [
        { zoneId: normalized },
        { name: normalized },
        { zoneId: normalized.toUpperCase() },
        { name: `Zone ${normalized.toUpperCase()}` },
      ],
    });
  } catch (error) {
    return null;
  }
};

const getZoneIdentifier = (zone) => {
  if (!zone) return null;
  return zone.zoneId || zone.name || null;
};

module.exports = {
  getZoneIdentifier,
  resolveZone,
};

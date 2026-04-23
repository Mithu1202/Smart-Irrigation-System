const { resolveZone } = require("./zoneLookup");

const getZoneConfig = async (zoneInput) => {
  try {
    const zone = await resolveZone(zoneInput);
    return zone ? zone.toObject() : null;
  } catch (error) {
    return null;
  }
};

module.exports = getZoneConfig;

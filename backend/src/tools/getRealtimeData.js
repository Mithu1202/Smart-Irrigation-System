const Data = require("../models/Data");
const { resolveZone } = require("./zoneLookup");

const getRealtimeData = async (zoneInput) => {
  try {
    const zone = await resolveZone(zoneInput);
    if (!zone) {
      return {
        zone: null,
        latest: null,
        history: [],
      };
    }

    const history = await Data.find({ zone: zone.name })
      .sort({ timestamp: -1 })
      .limit(48);

    return {
      zone,
      latest: history[0] || null,
      history,
    };
  } catch (error) {
    return {
      zone: null,
      latest: null,
      history: [],
      error: error.message,
    };
  }
};

module.exports = getRealtimeData;

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";

interface PredictionForm {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  soilPh: number;
  cropType: string;
  season: string;
  soilType: string;
  irrigationType: string;
  region: string;
  windSpeed: number;
  sunlightHours: number;
}

import api from "../../lib/api";

export default function PredictPage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PredictionForm>({
    defaultValues: {
      soilMoisture: 35,
      temperature: 28,
      humidity: 60,
      rainfall: 0,
      soilPh: 6.5,
      cropType: "Paddy",
      season: "Maha",
      soilType: "Red Yellow Latosol",
      irrigationType: "Drip",
      region: "Northern",
      windSpeed: 10,
      sunlightHours: 7,
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setWeatherLoading(true);
    
    try {
      // Fetch zones to get coordinates of "Zone 1" or the first available zone
      const zonesRes = await api.get("/zones");
      const zones = zonesRes.data;
      
      let lat = 6.9271; // default fallback
      let lon = 79.8612; // default fallback
      
      if (zones && zones.length > 0) {
        const targetZone = zones.find((z: any) => z.name === "Zone 1" || z.zoneId === "zone-1") || zones[0];
        if (targetZone.coordinates?.lat && targetZone.coordinates?.lng) {
          lat = targetZone.coordinates.lat;
          lon = targetZone.coordinates.lng;
        }
      }

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=rain_sum,sunshine_duration&timezone=auto`);
      const data = await res.json();
      
      if (data.current_weather) {
        setValue("temperature", data.current_weather.temperature);
        setValue("windSpeed", data.current_weather.windspeed);
      }
      
      const hourlyRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=relative_humidity_2m,soil_temperature_6cm,soil_moisture_3_to_9cm&current_weather=true`);
      const hourlyData = await hourlyRes.json();
      
      if (hourlyData.hourly) {
        if (hourlyData.hourly.relative_humidity_2m && hourlyData.hourly.relative_humidity_2m.length > 0) {
          setValue("humidity", hourlyData.hourly.relative_humidity_2m[0]);
        }
        
        // Use weather API for soil temperature as fallback
        if (hourlyData.hourly.soil_temperature_6cm && hourlyData.hourly.soil_temperature_6cm.length > 0) {
          const soilTemp = hourlyData.hourly.soil_temperature_6cm[0];
          // We will use the soil temperature instead of air temperature if it's available, 
          // to give a more accurate representation of the soil condition.
          if (soilTemp > 0) {
             setValue("temperature", soilTemp);
          }
        }

        // Use weather API for soil moisture as fallback when IoT fails
        if (hourlyData.hourly.soil_moisture_3_to_9cm && hourlyData.hourly.soil_moisture_3_to_9cm.length > 0) {
          const rawSm = hourlyData.hourly.soil_moisture_3_to_9cm[0];
          // Open-Meteo sometimes returns 0.000 or extremely low values (< 0.1) for urban/unmapped grid cells. 
          // If it's less than 15% (0.15), do NOT overwrite the form's soil moisture, otherwise 
          // the ML model's 'low_moisture_flag' will trigger and it will always predict 'High'.
          if (rawSm >= 0.15) {
            const smPercentage = rawSm * 100;
            setValue("soilMoisture", parseFloat(smPercentage.toFixed(1)));
          } else {
             console.warn(`Open-Meteo returned extremely low soil moisture (${rawSm}). Keeping default to avoid false High prediction.`);
          }
        }
      }

      if (data.daily && data.daily.rain_sum) {
        setValue("rainfall", data.daily.rain_sum[0]);
      }
      
    } catch (err) {
      console.error("Failed to fetch weather", err);
      alert("Failed to fetch real-time weather data from zone coordinates.");
    } finally {
      setWeatherLoading(false);
    }
  };

  const onSubmit = async (data: PredictionForm) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const res = await api.post("/ml/predict", data);
      const result = res.data;
      
      if (!result.success) {
        throw new Error(result.error || "Prediction failed");
      }
      
      setPrediction(result.prediction);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ML Irrigation Predictor</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Test the Machine Learning model by entering custom parameters or syncing real-time weather data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Parameters</h2>
                <button 
                  onClick={fetchWeather}
                  disabled={weatherLoading}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {weatherLoading ? (
                    <span>Syncing...</span>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                      Sync Live Weather
                    </>
                  )}
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Climate Data */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temperature (°C)</label>
                    <input type="number" step="0.1" {...register("temperature", { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Humidity (%)</label>
                    <input type="number" step="0.1" {...register("humidity", { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rainfall (mm)</label>
                    <input type="number" step="0.1" {...register("rainfall", { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wind Speed (km/h)</label>
                    <input type="number" step="0.1" {...register("windSpeed", { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border" />
                  </div>

                  {/* Soil Data */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soil Moisture (%)</label>
                    <input type="number" step="0.1" {...register("soilMoisture", { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soil pH</label>
                    <input type="number" step="0.1" {...register("soilPh", { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soil Type</label>
                    <select {...register("soilType")} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border">
                      <option value="Red Yellow Latosol">Red Yellow Latosol</option>
                      <option value="Calcic Red-Yellow Latosol">Calcic Red-Yellow Latosol</option>
                      <option value="Regosol">Regosol</option>
                      <option value="Grumusol">Grumusol</option>
                      <option value="Alluvial">Alluvial</option>
                    </select>
                  </div>

                  {/* Crop & Setting */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Crop Type</label>
                    <input type="text" {...register("cropType")} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Season</label>
                    <select {...register("season")} className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 border">
                      <option value="Maha">Maha (Sept - March)</option>
                      <option value="Yala">Yala (May - August)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-[#3CC15A] hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Running Inference..." : "Predict Irrigation Need"}
                  </button>
                </div>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Prediction Result</h2>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  {error}
                </div>
              )}

              {!prediction && !error && (
                <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12 text-center h-48">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="mb-4"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  <p>Awaiting parameters.</p>
                  <p className="text-sm mt-1">Run inference to view results.</p>
                </div>
              )}

              {prediction && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-bold">Predicted Need</div>
                    <div className={`text-4xl font-extrabold ${
                      prediction.irrigationNeed === "High" ? "text-red-500" :
                      prediction.irrigationNeed === "Medium" ? "text-yellow-500" :
                      "text-green-500"
                    }`}>
                      {prediction.irrigationNeed}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Confidence: {(prediction.confidence * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-700 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-slate-600">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Probabilities</h3>
                    <div className="space-y-3">
                      {["Low", "Medium", "High"].map((level) => (
                        <div key={level}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">{level}</span>
                            <span className="font-bold">
                              {((prediction.probabilities?.[level] || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-slate-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                level === "High" ? "bg-red-500" :
                                level === "Medium" ? "bg-yellow-500" :
                                "bg-green-500"
                              }`}
                              style={{ width: `${(prediction.probabilities?.[level] || 0) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

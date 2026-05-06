import axios from "axios";
import https from "node:https";

const v4Agent = new https.Agent({ family: 4, keepAlive: true });

async function getJsonWithRetry(url, params) {
  try {
    const { data } = await axios.get(url, { params, timeout: 12000 });
    return data;
  } catch (err) {
    const code = err?.code;
    const causeCode = err?.cause?.code;
    const isTimeoutish =
      code === "ECONNABORTED" ||
      code === "ETIMEDOUT" ||
      causeCode === "ETIMEDOUT" ||
      causeCode === "ENETUNREACH";
    if (!isTimeoutish) throw err;

    const { data } = await axios.get(url, {
      params,
      timeout: 15000,
      family: 4,
      httpsAgent: v4Agent,
    });
    return data;
  }
}

const WEATHER_KEYWORDS = [
  "weather",
  "temperature",
  "forecast",
  "rain",
  "raining",
  "snow",
  "snowing",
  "sunny",
  "cloudy",
  "humidity",
  "wind",
  "hot",
  "cold",
  "warm",
  "chilly",
];

const WEATHER_CODE_MAP = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "depositing rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  56: "light freezing drizzle",
  57: "dense freezing drizzle",
  61: "light rain",
  63: "moderate rain",
  65: "heavy rain",
  66: "light freezing rain",
  67: "heavy freezing rain",
  71: "light snow",
  73: "moderate snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  85: "light snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with light hail",
  99: "thunderstorm with heavy hail",
};

/**
 * Lightweight intent detector. Returns "weather" if the message looks
 * like it's asking about the weather, otherwise "general".
 */
export function detectIntent(message) {
  if (!message || typeof message !== "string") return "general";
  const lower = message.toLowerCase();
  return WEATHER_KEYWORDS.some((kw) => lower.includes(kw))
    ? "weather"
    : "general";
}

/**
 * Best-effort city extractor. Tries a few common phrasings before
 * falling back to a stripped form of the message.
 */
export function extractCity(message) {
  if (!message || typeof message !== "string") return null;

  const cleaned = message.trim().replace(/[?!.]+$/g, "");

  const patterns = [
    /weather\s+(?:in|at|for|of)\s+([A-Za-z][A-Za-z\s.'-]{1,60})/i,
    /forecast\s+(?:in|at|for|of)\s+([A-Za-z][A-Za-z\s.'-]{1,60})/i,
    /temperature\s+(?:in|at|for|of)\s+([A-Za-z][A-Za-z\s.'-]{1,60})/i,
    /(?:in|at|for)\s+([A-Za-z][A-Za-z\s.'-]{1,60})\s*(?:weather|forecast|temperature)/i,
    /([A-Za-z][A-Za-z\s.'-]{1,60})\s+weather/i,
  ];

  for (const re of patterns) {
    const match = cleaned.match(re);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  return null;
}

async function geocodeCity(city) {
  const url = "https://geocoding-api.open-meteo.com/v1/search";
  const data = await getJsonWithRetry(url, {
    name: city,
    count: 1,
    language: "en",
    format: "json",
  });

  if (!data || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }

  const r = data.results[0];
  return {
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

async function fetchCurrentWeather(latitude, longitude) {
  const url = "https://api.open-meteo.com/v1/forecast";
  const data = await getJsonWithRetry(url, {
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
    timezone: "auto",
  });

  return data?.current ?? null;
}

/**
 * Fetches the current weather for a city via Open-Meteo and returns
 * a human-readable sentence.
 */
export async function getWeather(city) {
  if (!city) {
    return "Which city's weather would you like?";
  }

  try {
    const place = await geocodeCity(city);
    if (!place) {
      return `Sorry, I couldn't find a place called "${city}".`;
    }

    const current = await fetchCurrentWeather(place.latitude, place.longitude);
    if (!current) {
      return `Sorry, I couldn't fetch the current weather for ${place.name}.`;
    }

    const description =
      WEATHER_CODE_MAP[current.weather_code] ?? "current conditions unknown";
    const locationLabel = [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", ");

    return (
      `Currently in ${locationLabel}: ${Math.round(current.temperature_2m)} °C, ` +
      `${description}, humidity ${current.relative_humidity_2m}%, ` +
      `wind ${Math.round(current.wind_speed_10m)} km/h.`
    );
  } catch (err) {
    console.error("[tools] weather error:", err?.code || err?.message || err);
    return "Sorry, I had trouble fetching the weather right now.";
  }
}

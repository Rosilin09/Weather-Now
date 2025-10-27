import React, { useState, useEffect } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [unit, setUnit] = useState("celsius");

  // Fetch city suggestions
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoadingSuggestions(true);
      fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=5&language=en&format=json`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((data) => setSuggestions(data.results || []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoadingSuggestions(false));
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Fetch weather from coordinates
  const fetchWeather = async ({
    latitude,
    longitude,
    name,
    country,
    timezone,
  }) => {
    setWeather(null);
    setLoadingWeather(true);
    setWeatherError(null);
    setPlace({ name, country, latitude, longitude, timezone });
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=${unit}&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.current_weather) throw new Error("No weather data found");
      setWeather({
        ...data.current_weather,
        timezone: data.timezone || timezone || "UTC",
      });
    } catch {
      setWeatherError("Could not load weather data. Try again.");
    } finally {
      setLoadingWeather(false);
    }
  };

  // When selecting city suggestion
  const handleSelectSuggestion = (s) => {
    setQuery(`${s.name}, ${s.country}`);
    setSuggestions([]);
    fetchWeather(s);
  };

  // Refetch when unit toggles
  useEffect(() => {
    if (place) fetchWeather(place);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  // Use geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setWeatherError("Geolocation not supported.");
      return;
    }
    setLoadingWeather(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1`
          );
          const data = await res.json();
          const best = data.results?.[0];
          if (best) {
            fetchWeather(best);
            setQuery(`${best.name}, ${best.country}`);
          } else {
            fetchWeather({
              latitude,
              longitude,
              name: "Your Location",
              country: "",
              timezone: "auto",
            });
          }
        } catch {
          fetchWeather({
            latitude,
            longitude,
            name: "Your Location",
            country: "",
            timezone: "auto",
          });
        }
      },
      () => setWeatherError("Location access denied or unavailable.")
    );
  };

  // Weather condition lookup
  const weatherCodeToText = (code) => {
    const map = {
      0: ["Clear sky", "☀️"],
      1: ["Mainly clear", "🌤️"],
      2: ["Partly cloudy", "⛅"],
      3: ["Overcast", "☁️"],
      61: ["Light rain", "🌧️"],
      63: ["Rain", "🌧️"],
      65: ["Heavy rain", "🌧️"],
      71: ["Snow", "❄️"],
      95: ["Thunderstorm", "⛈️"],
    };
    return map[code] || ["Unknown", "🌈"];
  };

  const formatTemp = (temp, unit) =>
    temp === null || temp === undefined ? "—" : `${Math.round(temp)}°${unit}`;

  // Suggestions dropdown
  const renderSuggestions = () =>
    suggestions.length > 0 && (
      <ul className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
        {suggestions.map((s) => (
          <li
            key={`${s.id}-${s.name}`}
            onClick={() => handleSelectSuggestion(s)}
            className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700"
          >
            {s.name}, {s.country}
          </li>
        ))}
      </ul>
    );

  // Weather display card
  const renderWeatherCard = () => {
    if (loadingWeather)
      return (
        <div className="text-gray-500 text-center py-8">Loading weather...</div>
      );
    if (weatherError)
      return (
        <div className="text-red-500 text-center py-8">{weatherError}</div>
      );
    if (!weather)
      return (
        <div className="text-gray-400 text-center py-8">
          Search for a city or use your location.
        </div>
      );
    const [desc, emoji] = weatherCodeToText(weather.weathercode);
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="text-2xl font-semibold text-gray-800">
          {place.name}, {place.country}
        </div>
        <div className="text-6xl font-bold text-blue-600">
          {formatTemp(weather.temperature, unit === "celsius" ? "C" : "F")}
        </div>
        <div className="text-lg text-gray-600 flex items-center gap-1">
          {emoji} {desc}
        </div>
        <div className="text-sm text-gray-400">
          {weather.timezone} • {weather.time}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 px-4 py-10">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-6 md:p-8 relative">
        {/* Header */}
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-2">
          Weather Now
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Check current weather anywhere 🌍
        </p>

        {/* Search Section */}
        <div className="relative mb-5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-300 outline-none text-gray-700"
          />
          {loadingSuggestions && (
            <div className="absolute top-full left-0 text-sm text-gray-400 mt-1 px-2">
              Loading...
            </div>
          )}
          {renderSuggestions()}
        </div>

        {/* Buttons */}
        <div className="flex justify-between mb-6">
          <button
            onClick={handleUseMyLocation}
            className="flex-1 mr-2 bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition-all shadow-md"
          >
            📍 Use My Location
          </button>
          <button
            onClick={() =>
              setUnit((prev) => (prev === "celsius" ? "fahrenheit" : "celsius"))
            }
            className="w-20 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200 transition-all shadow-sm font-medium"
          >
            °{unit === "celsius" ? "C" : "F"}
          </button>
        </div>

        {/* Weather Display */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-inner">
          {renderWeatherCard()}
        </div>
      </div>
    </div>
  );
}

export default App;

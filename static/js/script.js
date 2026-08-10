(() => {
  'use strict';

  const form = document.getElementById('weather-form');
  const cityInput = document.getElementById('city');
  const searchBtn = document.getElementById('search-btn');
  const searchIcon = searchBtn.querySelector('.search__icon');
  const statusRegion = document.getElementById('status-region');
  const resultEl = document.getElementById('result');
  const emptyStateEl = document.getElementById('empty-state');

  const placeName = document.getElementById('place-name');
  const placeTime = document.getElementById('place-time');
  const conditionIcon = document.getElementById('condition-icon');
  const temperatureEl = document.getElementById('temperature');
  const descriptionEl = document.getElementById('description');
  const feelsLikeEl = document.getElementById('feels-like');
  const humidityEl = document.getElementById('humidity');
  const windEl = document.getElementById('wind');
  const pressureEl = document.getElementById('pressure');

  // Maps OpenWeatherMap's condition group id to a theme key used by the CSS.
  function conditionKeyFromId(id) {
    if (id >= 200 && id < 300) return 'thunderstorm';
    if (id >= 300 && id < 400) return 'drizzle';
    if (id >= 500 && id < 600) return 'rain';
    if (id >= 600 && id < 700) return 'snow';
    if (id >= 700 && id < 800) return 'mist';
    if (id === 800) return 'clear';
    if (id > 800) return 'clouds';
    return 'clear';
  }

  function setStatus(message, kind) {
    statusRegion.textContent = message || '';
    statusRegion.className = message ? `status status--${kind}` : 'status';
  }

  function setLoading(isLoading) {
    searchBtn.disabled = isLoading;
    searchIcon.classList.toggle('is-spinning', isLoading);
    searchIcon.textContent = isLoading ? '\u27F3' : '\u2192';
  }

  function showResult(data) {
    const daytime = (data.icon || '').endsWith('n') ? 'night' : 'day';
    document.body.dataset.condition = conditionKeyFromId(data.condition_id);
    document.body.dataset.daytime = daytime;

    placeName.textContent = data.country ? `${data.city}, ${data.country}` : data.city;
    placeTime.textContent = formatLocalTime(data.observed_at, data.timezone_offset);

    if (data.icon) {
      conditionIcon.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
      conditionIcon.alt = data.description || '';
    }

    temperatureEl.textContent = `${data.temperature}\u00B0`;
    descriptionEl.textContent = data.description || '';
    feelsLikeEl.textContent = `${data.feels_like}\u00B0`;
    humidityEl.textContent = `${data.humidity}%`;
    windEl.textContent = `${data.wind_speed} m/s`;
    pressureEl.textContent = `${data.pressure} hPa`;

    emptyStateEl.hidden = true;
    resultEl.hidden = false;
  }

  function formatLocalTime(unixSeconds, tzOffsetSeconds) {
    if (!unixSeconds && unixSeconds !== 0) return '';
    const localMillis = (unixSeconds + (tzOffsetSeconds || 0)) * 1000;
    const date = new Date(localMillis);
    return date.toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  async function fetchWeather(city) {
    const url = `/api/weather?city=${encodeURIComponent(city)}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('The server sent an unexpected response.');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }

    return data;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const city = cityInput.value.trim();
    if (!city) {
      setStatus('Please enter a city name.', 'error');
      cityInput.focus();
      return;
    }

    setStatus('Fetching weather\u2026', 'loading');
    setLoading(true);

    try {
      const data = await fetchWeather(city);
      setStatus('', null);
      showResult(data);
    } catch (err) {
      resultEl.hidden = true;
      emptyStateEl.hidden = false;
      setStatus(err.message, 'error');
    } finally {
      setLoading(false);
    }
  });
})();
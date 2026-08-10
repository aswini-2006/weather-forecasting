"""
Weather Forecast App
---------------------
A small Flask service that proxies OpenWeatherMap and serves a
single-page weather lookup UI.
"""
import logging
import os

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

API_KEY = os.environ.get("WEATHER_API_KEY", "").strip()
WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather"
REQUEST_TIMEOUT_SECONDS = 6

if not API_KEY:
    logger.warning(
        "WEATHER_API_KEY is not set. Copy .env.example to .env and add your "
        "OpenWeatherMap API key before making requests."
    )


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False
    register_routes(app)
    return app


def register_routes(app: Flask) -> None:
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.get("/api/weather")
    def get_weather():
        city = (request.args.get("city") or "").strip()

        if not city:
            return jsonify(error="Please enter a city name."), 400

        if len(city) > 100:
            return jsonify(error="City name is too long."), 400

        if not API_KEY:
            logger.error("Weather request made without a configured API key.")
            return jsonify(
                error="Server is missing a weather API key. Set WEATHER_API_KEY in .env."
            ), 500

        try:
            response = requests.get(
                WEATHER_API_URL,
                params={"q": city, "appid": API_KEY, "units": "metric"},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except requests.exceptions.Timeout:
            logger.warning("Weather API timed out for city=%s", city)
            return jsonify(error="The weather service timed out. Please try again."), 504
        except requests.exceptions.RequestException:
            logger.exception("Weather API request failed for city=%s", city)
            return jsonify(error="Could not reach the weather service."), 502

        if response.status_code == 404:
            return jsonify(error=f'No results found for "{city}".'), 404

        if response.status_code == 401:
            logger.error("Weather API rejected the configured API key.")
            return jsonify(error="Weather service authentication failed."), 500

        if not response.ok:
            logger.error(
                "Weather API returned unexpected status %s for city=%s",
                response.status_code,
                city,
            )
            return jsonify(error="Unexpected error from the weather service."), 502

        payload = response.json()
        return jsonify(shape_weather_payload(payload))

    @app.get("/api/health")
    def health():
        return jsonify(status="ok", api_key_configured=bool(API_KEY))

    @app.errorhandler(404)
    def not_found(_err):
        return jsonify(error="Not found."), 404

    @app.errorhandler(500)
    def server_error(_err):
        return jsonify(error="Something went wrong on our end."), 500


def shape_weather_payload(payload: dict) -> dict:
    """Trim the upstream OpenWeatherMap response to what the UI needs."""
    weather = (payload.get("weather") or [{}])[0]
    main = payload.get("main") or {}
    wind = payload.get("wind") or {}
    sys = payload.get("sys") or {}

    return {
        "city": payload.get("name"),
        "country": sys.get("country"),
        "temperature": round(main.get("temp", 0)),
        "feels_like": round(main.get("feels_like", 0)),
        "humidity": main.get("humidity"),
        "pressure": main.get("pressure"),
        "wind_speed": wind.get("speed"),
        "description": (weather.get("description") or "").capitalize(),
        "icon": weather.get("icon"),
        "condition_id": weather.get("id"),
        "condition_main": weather.get("main"),
        "sunrise": sys.get("sunrise"),
        "sunset": sys.get("sunset"),
        "timezone_offset": payload.get("timezone"),
        "observed_at": payload.get("dt"),
    }


app = create_app()

if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode)
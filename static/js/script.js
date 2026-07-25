document.getElementById('weather-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const city = document.getElementById('city').value;

    fetch('/get_weather', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `city=${city}`,
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                document.getElementById('weather-result').innerHTML = `<p>${data.error}</p>`;
            } else {
                const weatherHtml = `
                    <h2>Weather in ${data.city}</h2>
                    <p>Temperature: ${data.temperature}°C</p>
                    <p>Description: ${data.description}</p>
                    <img src="http://openweathermap.org/img/w/${data.icon}.png" alt="Weather icon">
                `;
                document.getElementById('weather-result').innerHTML = weatherHtml;
            }
        });
});

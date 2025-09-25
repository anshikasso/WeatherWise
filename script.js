// OpenWeather integration 
const OPENWEATHER_API_KEY = '32fdb12a91de899c73cff5136aad9ce7';
//Indian Standard Time
const IST_OFFSET_SEC = 5.5 * 3600; 

// Units state: 'metric' (C), 'imperial' (F), 'standard' (K)
let units = 'metric';
try {
	if (typeof localStorage !== 'undefined') {
		units = localStorage.getItem('ww_units') || 'metric';
	}
} catch(e) {
	units = 'metric';
}

const els = {
	cityInput: document.getElementById('city-input'),
	dateText: document.getElementById('date-text'),
	timeText: document.getElementById('time-text'),
	temp: document.getElementById('temperature'),
	location: document.getElementById('location'),
	condition: document.getElementById('condition-text'),
	humidity: document.getElementById('humidity-text'),
	description: document.getElementById('description-text'),
	icon: document.getElementById('weather-icon'),
	forecastGrid: document.getElementById('forecast-grid'),
	forecastBtn: document.getElementById('forecast-btn'),
	unitSelect: document.getElementById('unit-select'),
	container: document.body, // Changed to target body element directly
};

function formatDateTimeIST(tsMs) {
	const d = new Date(tsMs + IST_OFFSET_SEC * 1000);
	const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
	const dayName = days[d.getUTCDay()];
	const dateNum = d.getUTCDate();
	let hours = d.getUTCHours();
	const minutes = d.getUTCMinutes().toString().padStart(2,'0');
	const pm = (hours >= 12);
	hours = hours % 12 || 12;
	return {
		dateText: `${dateNum}, ${dayName}`,
		timeText: `${hours}:${minutes}${pm ? 'PM' : 'AM'}`,
	};
}

function unitSymbol(u) {
	if (u === 'imperial') return 'F';
	if (u === 'standard') return 'K';
	return 'C';
}

//Background images based on weather condition
const conditionMap = {
	Clear: { icon: 'images/sunny.png', bg: 'images/backgrounds/sunny.jpg' },
	Clouds: { icon: 'images/clouds.png', bg: 'images/backgrounds/cloudy.jpg' },
	Rain: { icon: 'images/raining.png', bg: 'images/backgrounds/rain.jpg' },
	Drizzle: { icon: 'images/drizzle.png', bg: 'images/backgrounds/rain.jpg' },
	Thunderstorm: { icon: 'images/drizzle.png', bg: 'images/backgrounds/thunder.jpg' },
	Snow: { icon: 'images/snow.png', bg: 'images/backgrounds/snow.jpg' },
	Haze: { icon: 'images/haze.png', bg: 'images/backgrounds/haze.jpg' },
	Mist: { icon: 'images/mist.png', bg: 'images/backgrounds/haze.jpg' },
	Fog: { icon: 'images/fog.png', bg: 'images/backgrounds/haze.jpg' },
	Smoke: { icon: 'images/smoke.png', bg: 'images/backgrounds/haze.jpg' },
};

//Tips based on Weather Condition
const advisoryMap = {
	Clear: "It's a bright and sunny day with clear skies all around. Perfect weather to head outdoors—whether it's going for a walk, enjoying a picnic, playing sports, or just soaking up the sunshine. Don't forget your sunglasses and sunscreen to protect yourself, and carry a water bottle to stay hydrated.",
	
	Clouds: "Cloudy skies will cover much of the day, keeping temperatures mild and comfortable. It's a good time for casual walks, running errands, or simply enjoying a cozy atmosphere. You may want to keep a light jacket handy in case the breeze turns cooler in the evening.",
	
	Rain: "Rain is expected, so carrying an umbrella or raincoat is a must if you're heading outside. Roads and walkways may become slippery, so tread carefully and drive at safe speeds. It's a great day to enjoy a warm drink indoors and catch up on some relaxation.",
	
	Drizzle: "A light drizzle is falling, giving the day a calm and refreshing feel. A hooded jacket or small umbrella should be enough to keep you dry. Roads may be a little damp, so take extra care while walking or driving.",
	
	Thunderstorm: "Thunderstorms are likely, with chances of heavy rain, thunder, and lightning. It's safest to remain indoors until conditions improve and to avoid using electrical appliances during lightning strikes. Outdoor plans are best postponed for later, so you can stay dry and safe.",
	
	Snow: "Snowy conditions are expected, creating a chilly but beautiful atmosphere. Dress warmly in layers, wear gloves and a hat, and choose boots with good grip to avoid slipping on icy surfaces. Travel with caution, and allow extra time if driving through snowy roads.",
	
	Haze: "The air appears hazy today, reducing visibility and possibly affecting air quality. If you are sensitive to dust or pollution, consider wearing a mask and limiting strenuous outdoor activity. Staying indoors with good ventilation may be the best option for comfort and health.",
	
	Mist: "A thin mist covers the area, softening the atmosphere but reducing visibility. Driving requires extra caution—keep headlights or fog lights on and maintain safe distances. Outdoors may feel damp, so dress accordingly if you plan to step out.",
	
	Fog: "Thick fog is expected, bringing very low visibility and damp, chilly conditions. If driving, reduce your speed, use fog lights or low beams, and keep plenty of distance between vehicles. It's a great time for warm drinks indoors until the fog clears up.",
	
	Smoke: "Smoky air is lingering, which may affect breathing and visibility outdoors. Try to avoid strenuous outdoor activities and keep windows closed to reduce smoke indoors. Using an air purifier or mask can help if you are sensitive to poor air quality.",
};

function getLocalIcon(condition, fallbackIcon) {
	const map = conditionMap[condition];
	if (map && map.icon) return map.icon;
	return `https://openweathermap.org/img/wn/${fallbackIcon}@2x.png`;
}

function preloadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

function applyBackground(condition) {
	if (!els.container) {
		console.log('Container not found');
		return;
	}
	
	const isDashboard = document.body.classList.contains('dashboard-page');
	if (!isDashboard) {
		console.log('Not on dashboard page');
		return;
	}
	
	const map = conditionMap[condition];
	const url = map && map.bg ? map.bg : 'images/background.jpg';
	
	console.log('Changing background for condition:', condition, 'to URL:', url);
	
	// Apply background
	els.container.style.setProperty('background-image', `url('${url}')`, 'important');
	els.container.style.setProperty('background-size', 'cover', 'important');
	els.container.style.setProperty('background-position', 'center', 'important');
	els.container.style.setProperty('background-repeat', 'no-repeat', 'important');
	els.container.style.setProperty('background-attachment', 'fixed', 'important');
	els.container.style.setProperty('transition', 'background-image 0.5s ease-in-out', 'important');
	
	els.container.offsetHeight;
	
	console.log('Background applied. Current style:', els.container.style.backgroundImage);
}

async function fetchJson(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

async function loadWeatherByCity(city) {
	if (!OPENWEATHER_API_KEY) {
		setStatus(`Add your OpenWeather API key in script.js to fetch data.`);
		return;
	}
	try {
		setStatus('Loading...');
		const q = encodeURIComponent(city);
		const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
		const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${OPENWEATHER_API_KEY}&units=${units}`;

		const [current, forecast] = await Promise.all([
			fetchJson(currentUrl),
			fetchJson(forecastUrl),
		]);

		renderCurrent(current);
		renderForecast(forecast);
		els.cityInput && (els.cityInput.value = `${current.name}${current.sys && current.sys.country ? ', ' + current.sys.country : ''}`);
		
	} catch (err) {
		console.error('Weather loading error:', err);
		if (err.message.includes('404')) {
			setStatus(`City not found. Please check the spelling and try again.`);
		} else {
			setStatus(`Unable to load weather data. Please try again later.`);
		}
	}
}

function setStatus(text) {
	if (els.description) els.description.textContent = text;
}

function renderCurrent(data) {
	// data from weather
	const name = data.name;
	const country = data.sys && data.sys.country ? data.sys.country : '';
	const temp = Math.round(data.main.temp);
	const humidity = Math.round(data.main.humidity);
	const condition = data.weather && data.weather[0] ? data.weather[0].main : '';
	const description = data.weather && data.weather[0] ? data.weather[0].description : '';
	const icon = data.weather && data.weather[0] ? data.weather[0].icon : '01d';
	
	console.log('Weather data received:', { name, condition, temp, humidity });

	const now = Date.now();
	const { dateText, timeText } = formatDateTimeIST(now);

	if (els.dateText) els.dateText.textContent = dateText;
	if (els.timeText) els.timeText.textContent = timeText;
	if (els.temp) els.temp.innerHTML = `${temp}&deg; ${unitSymbol(units)}`;
	if (els.location) els.location.innerHTML = `<strong>${name || ''}</strong>${country ? ', ' + country : ''}`;
	if (els.condition) els.condition.textContent = condition || '';
	if (els.humidity) els.humidity.textContent = `${humidity}%`;
	if (els.description) {
		const c = condition || '';
		els.description.textContent = advisoryMap[c] || (description ? description.charAt(0).toUpperCase() + description.slice(1) : '');
	}
	if (els.icon) {
		const iconSrc = getLocalIcon(condition, icon);
		els.icon.src = iconSrc;
		els.icon.alt = condition;
		els.icon.classList.add('loaded');
	}
	
	// Apply background
	console.log('About to apply background for condition:', condition);
	applyBackground(condition);
}

function groupForecastDailyIST(list) {
	const byDay = new Map();
	for (const item of list) {
		const istMs = (item.dt * 1000) + IST_OFFSET_SEC * 1000;
		const d = new Date(istMs);
		const key = `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
		if (!byDay.has(key)) byDay.set(key, []);
		byDay.get(key).push(item);
	}
	const daily = [];
	for (const [, items] of byDay) {
		let best = items[0];
		let bestDiff = Infinity;
		for (const it of items) {
			const h = new Date((it.dt * 1000) + IST_OFFSET_SEC * 1000).getUTCHours();
			const diff = Math.abs(12 - h);
			if (diff < bestDiff) {
				bestDiff = diff;
				best = it;
			}
		}
		daily.push(best);
	}
	daily.sort((a,b) => a.dt - b.dt);
	return daily;
}

function renderForecast(data) {
	if (!els.forecastGrid) return;
	els.forecastGrid.innerHTML = '';
	const dailyAll = groupForecastDailyIST(data.list || []);
	const nowIst = new Date(Date.now() + IST_OFFSET_SEC * 1000);
	const todayKey = `${nowIst.getUTCFullYear()}-${nowIst.getUTCMonth()+1}-${nowIst.getUTCDate()}`;
	const upcoming = dailyAll.filter(item => {
		const d = new Date(item.dt * 1000 + IST_OFFSET_SEC * 1000);
		const key = `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
		return key !== todayKey;
	}).slice(0,5);
	const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	
	for (const item of upcoming) {
		const temp = Math.round(item.main.temp);
		const cond = item.weather && item.weather[0] ? item.weather[0].main : '';
		const icon = item.weather && item.weather[0] ? item.weather[0].icon : '01d';
		const d = new Date(item.dt * 1000 + IST_OFFSET_SEC * 1000);
		const dateNum = d.getUTCDate();
		const dayName = days[d.getUTCDay()];

		const card = document.createElement('div');
		card.className = 'col-6 col-sm-4 col-md-3 col-lg-2 col-xl';
		
		const iconSrc = getLocalIcon(cond, icon);
		
		card.innerHTML = `
			<div class="forecast-card">
				<span>${dateNum}, ${dayName}</span><br>
				<img src="${iconSrc}" class="forecast-icon" alt="${cond}"><br>
				${temp}&deg; ${unitSymbol(units)}<br>
				${cond}
			</div>
		`;
		els.forecastGrid.appendChild(card);
	}
}

function readCityFromQuery() {
	const params = new URLSearchParams(location.search);
	const c = params.get('city');
	return c ? c.trim() : '';
}

function initEvents() {
	if (els.cityInput) {
		els.cityInput.addEventListener('keydown', function(e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				const value = this.value.trim();
				if (value) loadWeatherByCity(value);
			}
		});
	}
	if (els.forecastBtn && typeof $ !== 'undefined') {
		els.forecastBtn.onclick = function() {
			$('html, body').animate({
				scrollTop: $(els.forecastGrid).offset().top - 100
			}, 800);
		};
	}
	if (els.unitSelect) {
		els.unitSelect.value = units;
		els.unitSelect.addEventListener('change', function() {
			units = this.value;
			try { 
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem('ww_units', units); 
				}
			} catch(e) {
				console.log('LocalStorage not available');
			}
			const currentCity = els.cityInput && els.cityInput.value.trim();
			if (currentCity) {
				const cityName = currentCity.split(',')[0].trim();
				loadWeatherByCity(cityName);
			}
		});
	}
}

//Bootstrap
(function bootstrap() {
	console.log('Initializing WeatherWise...');
	console.log('Container element:', els.container);
	console.log('Is dashboard page:', document.body.classList.contains('dashboard-page'));
	
	initEvents();
	const onDashboard = !!document.getElementById('forecast-grid');
	if (!onDashboard) return;

	const city = readCityFromQuery();
	if (city) {
		loadWeatherByCity(city);
	} else if (els.cityInput && els.cityInput.value.trim()) {
		loadWeatherByCity(els.cityInput.value.trim());
	} else {
		setStatus('Search a city to see weather.');
	}
})();
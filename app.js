let userLat, userLon, userHeading;
let signLat, signLon;
let useDirection = false;

function acceptDisclaimer() {
  document.getElementById('disclaimer').style.display = 'none';
  document.getElementById('main').style.display = 'block';
  initLocation();
  animateCompass();
}

function initLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      updatePosition,
      showError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    window.addEventListener("deviceorientationabsolute", handleOrientation, true);

    // Wiederholte Abfrage alle 5 Sekunden
    setInterval(() => {
      if (userLat && userLon) {
        if (useDirection && userHeading !== undefined) {
          fetchSign(userLat, userLon, userHeading);
        } else {
          fetchNearestSign(userLat, userLon);
        }
      }
    }, 5000);
  } else {
    alert("Geolocation nicht unterstützt.");
  }
}

function updatePosition(position) {
  userLat = position.coords.latitude;
  userLon = position.coords.longitude;
  const speedKmH = position.coords.speed ? position.coords.speed * 3.6 : 0;
  document.getElementById('speed').innerHTML = `${speedKmH.toFixed(0)} km/h`;

  if (speedKmH > 3) {
    useDirection = true;
  }
}

function handleOrientation(event) {
  userHeading = event.alpha;

  if(userLat && signLat) {
    const bearing = calcBearing(userLat, userLon, signLat, signLon);
    const rotation = bearing - userHeading;
    rotateNeedle(rotation);
  }
}

function fetchNearestSign(lat, lon) {
  const query = `
    [out:json][timeout:25];
    way["highway"="motorway"]["maxspeed"="none"](around:50000,${lat},${lon});
    out center;
  `;

  fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  })
  .then(res => res.json())
  .then(data => {
    if (data.elements.length > 0) {
      const nearest = data.elements.reduce((a, b) => {
        const da = calcDistance(lat, lon, a.center.lat, a.center.lon);
        const db = calcDistance(lat, lon, b.center.lat, b.center.lon);
        return da < db ? a : b;
      });
      signLat = nearest.center.lat;
      signLon = nearest.center.lon;
      const dist = calcDistance(lat, lon, signLat, signLon);
      document.getElementById('distance').innerHTML = `${dist.toFixed(1)} km`;
      console.log("Start: Nächstgelegenes Schild gesetzt");
    }
  });
}

function fetchSign(lat, lon, heading) {
  const radius = 50000;
  const query = `
    [out:json][timeout:25];
    way["highway"="motorway"]["maxspeed"="none"](around:${radius},${lat},${lon});
    out center;
  `;

  fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  })
  .then(res => res.json())
  .then(data => {
    if(data.elements.length > 0){
      const nextSign = findNextSignInDirection(data.elements, lat, lon, heading);
      if (nextSign) {
        signLat = nextSign.center.lat;
        signLon = nextSign.center.lon;
        const dist = calcDistance(lat, lon, signLat, signLon);
        document.getElementById('distance').innerHTML = `${dist.toFixed(1)} km`;
        console.log("Fahrtrichtung: Schild aktualisiert");
      }
    }
  })
  .catch(err => console.error(err));
}

function findNextSignInDirection(signs, userLat, userLon, heading) {
  let nearestSign = null;
  let smallestAngleDiff = 360;

  signs.forEach(sign => {
    const signBearing = calcBearing(userLat, userLon, sign.center.lat, sign.center.lon);
    const angleDiff = Math.abs(heading - signBearing);
    if (angleDiff < smallestAngleDiff && angleDiff < 90) {
      smallestAngleDiff = angleDiff;
      nearestSign = sign;
    }
  });

  return nearestSign;
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calcBearing(lat1, lon1, lat2, lon2) {
  lat1 *= Math.PI / 180; lat2 *= Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1)*sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

function rotateNeedle(angle) {
  const needleContainer = document.getElementById('needleContainer');
  needleContainer.style.transform = `rotate(${angle}deg)`;
}

function showError(error) {
  console.warn('ERROR(' + error.code + '): ' + error.message);
}

function animateCompass() {
  const needle = document.getElementById('needleContainer');
  needle.animate([
    { transform: 'rotate(-180deg)' },
    { transform: 'rotate(180deg)' },
    { transform: 'rotate(0deg)' }
  ], {
    duration: 2000,
    easing: 'ease-in-out'
  });
}
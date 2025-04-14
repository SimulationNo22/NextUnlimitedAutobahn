function handleOrientation(event) {
  if (typeof event.alpha === 'number') {
    userHeading = event.alpha;

    if (userLat && signLat) {
      const bearing = calcBearing(userLat, userLon, signLat, signLon);
      let targetRotation = normalizeAngle(bearing - userHeading);

      let diff = ((targetRotation - currentNeedleRotation + 540) % 360) - 180;
      diff = Math.max(Math.min(diff, 6), -6);
      currentNeedleRotation = normalizeAngle(currentNeedleRotation + diff * 0.3);

      rotateNeedle(currentNeedleRotation);
    }
  }
}
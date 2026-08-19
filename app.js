document.addEventListener("DOMContentLoaded", () => {
	const target = document.getElementById("markerTarget");
	const fireEntity = document.getElementById("fireEntity");
	const startButton = document.getElementById("startFireButton");

	if (!target || !fireEntity || !startButton) {
		return;
	}

	const resetFireState = () => {
		fireEntity.setAttribute("visible", false);
		startButton.hidden = true;
	};

	target.addEventListener("targetFound", () => {
		fireEntity.setAttribute("visible", false);
		startButton.hidden = false;
	});

	target.addEventListener("targetLost", resetFireState);

	startButton.addEventListener("click", () => {
		fireEntity.setAttribute("visible", true);
		startButton.hidden = true;
	});

	resetFireState();
});

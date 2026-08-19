document.addEventListener("DOMContentLoaded", () => {
	const target = document.getElementById("markerTarget");
	const fireEntity = document.getElementById("fireEntity");
	const startButton = document.getElementById("startFireButton");
	const fireModels = ["#co2Fire", "#dryPowderFire", "#foamFire", "#waterFire"];
	const fireScales = {
		"#co2Fire": "2.2 2.2 2.2",
		"#dryPowderFire": "2.4 2.4 2.4",
		"#foamFire": "2.3 2.3 2.3",
		"#waterFire": "2.25 2.25 2.25"
	};

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
		const randomModel = fireModels[Math.floor(Math.random() * fireModels.length)];
		fireEntity.setAttribute("gltf-model", randomModel);
		fireEntity.setAttribute("scale", fireScales[randomModel]);
		fireEntity.setAttribute("visible", true);
		startButton.hidden = true;
	});

	resetFireState();
});

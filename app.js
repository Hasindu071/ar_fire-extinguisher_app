AFRAME.registerComponent("drag-extinguisher", {
	schema: {
		target: { type: "selector" }
	},

	init() {
		this.isDragging = false;
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.dragPlane = new THREE.Plane();
		this.worldPoint = new THREE.Vector3();
		this.targetPoint = new THREE.Vector3();
		this.target = this.data.target;
		this.canvas = this.el.sceneEl.canvas;
		this.originalModel = this.el.getAttribute("gltf-model");
		this.originalScale = this.el.getAttribute("scale");
		this.isTransformed = false;

		if (!this.target || !this.canvas) {
			return;
		}

		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.canvas.addEventListener("pointerdown", this.onPointerDown);
		this.canvas.addEventListener("pointermove", this.onPointerMove);
		this.canvas.addEventListener("pointerup", this.onPointerUp);
		this.canvas.addEventListener("pointercancel", this.onPointerUp);
	},

	tick() {
		// Check proximity on every frame
		const fireEntity = document.getElementById("fireEntity");
		
		if (!fireEntity || !fireEntity.getAttribute("visible")) {
			if (this.isTransformed) {
				this.el.setAttribute("gltf-model", this.originalModel);
				this.el.setAttribute("scale", this.originalScale);
				this.isTransformed = false;
			}
			return;
		}

		// Get local positions (both on the marker target plane)
		const cylinderLocalPos = this.el.getAttribute("position");
		const fireLocalPos = fireEntity.getAttribute("position");

		// Calculate 2D distance on the marker plane
		const dx = cylinderLocalPos.x - fireLocalPos.x;
		const dy = cylinderLocalPos.y - fireLocalPos.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		const proximityThreshold = 1.2;

		if (distance < proximityThreshold && !this.isTransformed) {
			this.el.setAttribute("gltf-model", "#sprayForm");
			this.el.setAttribute("scale", "0.2 0.2 0.2"); // Smaller scale for spray_form
			this.isTransformed = true;
			console.log("✓ TRANSFORMED TO SPRAY FORM! Distance:", distance.toFixed(2));
		} else if (distance >= proximityThreshold && this.isTransformed) {
			this.el.setAttribute("gltf-model", this.originalModel);
			this.el.setAttribute("scale", this.originalScale);
			this.isTransformed = false;
			console.log("✓ REVERTED TO ORIGINAL! Distance:", distance.toFixed(2));
		}
	},

	setPointerPosition(event) {
		const bounds = this.canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
		this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
	},

	getTargetPoint(event) {
		this.setPointerPosition(event);
		this.raycaster.setFromCamera(this.pointer, this.el.sceneEl.camera);

		const normal = new THREE.Vector3(0, 0, 1)
			.applyQuaternion(this.target.object3D.getWorldQuaternion(new THREE.Quaternion()));
		this.dragPlane.setFromNormalAndCoplanarPoint(
			normal,
			this.target.object3D.getWorldPosition(new THREE.Vector3())
		);

		return this.raycaster.ray.intersectPlane(this.dragPlane, this.worldPoint);
	},

	onPointerDown(event) {
		this.setPointerPosition(event);
		this.raycaster.setFromCamera(this.pointer, this.el.sceneEl.camera);
		const intersections = this.raycaster.intersectObject(this.el.object3D, true);

		if (!intersections.length || !this.getTargetPoint(event)) {
			return;
		}

		this.isDragging = true;
		this.canvas.setPointerCapture(event.pointerId);
		event.preventDefault();
	},

	onPointerMove(event) {
		if (!this.isDragging || !this.getTargetPoint(event)) {
			return;
		}

		this.targetPoint.copy(this.target.object3D.worldToLocal(this.worldPoint.clone()));
		const position = this.el.object3D.position;
		position.x = this.targetPoint.x;
		position.y = this.targetPoint.y;
		this.el.setAttribute("position", position);
		event.preventDefault();
	},

	onPointerUp(event) {
		if (!this.isDragging) {
			return;
		}

		this.isDragging = false;
		if (this.canvas.hasPointerCapture(event.pointerId)) {
			this.canvas.releasePointerCapture(event.pointerId);
		}
	},

	remove() {
		if (!this.canvas) {
			return;
		}

		this.canvas.removeEventListener("pointerdown", this.onPointerDown);
		this.canvas.removeEventListener("pointermove", this.onPointerMove);
		this.canvas.removeEventListener("pointerup", this.onPointerUp);
		this.canvas.removeEventListener("pointercancel", this.onPointerUp);
	}
});

document.addEventListener("DOMContentLoaded", () => {
	const target = document.getElementById("markerTarget");
	const fireEntity = document.getElementById("fireEntity");
	const fireTypeLabel = document.getElementById("fireTypeLabel");
	const startButton = document.getElementById("startFireButton");
	const refreshButton = document.getElementById("refreshFireButton");
	const fireModels = ["#co2Fire", "#dryPowderFire", "#foamFire", "#waterFire"];
	const fireScales = {
		"#co2Fire": "2.2 2.2 2.2",
		"#dryPowderFire": "0.2 0.2 0.2",
		"#foamFire": "0.8 0.8 0.8",
		"#waterFire": "0.2 0.2 0.2"
	};
	const fireTypes = {
		"#co2Fire": "Electrical Box fire",
		"#dryPowderFire": "chemical reaction Fire",
		"#foamFire": "petrol Fire",
		"#waterFire": "Wood Fire"
	};

	if (!target || !fireEntity || !startButton || !refreshButton) {
		return;
	}

	const resetFireState = () => {
		fireEntity.setAttribute("visible", false);
		fireTypeLabel.setAttribute("hidden", "");
		startButton.hidden = true;
		refreshButton.hidden = true;
	};

	const displayRandomFire = () => {
		const randomModel = fireModels[Math.floor(Math.random() * fireModels.length)];
		fireEntity.setAttribute("gltf-model", randomModel);
		fireEntity.setAttribute("scale", fireScales[randomModel]);
		fireEntity.setAttribute("visible", true);
		
		// Update the fire type label at top
		fireTypeLabel.textContent = fireTypes[randomModel];
		fireTypeLabel.removeAttribute("hidden");
		
		startButton.hidden = true;
		refreshButton.hidden = false;
	};

	target.addEventListener("targetFound", () => {
		fireEntity.setAttribute("visible", false);
		startButton.hidden = false;
		refreshButton.hidden = true;
	});

	target.addEventListener("targetLost", resetFireState);

	startButton.addEventListener("click", displayRandomFire);

	refreshButton.addEventListener("click", displayRandomFire);

	resetFireState();
});

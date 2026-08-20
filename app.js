AFRAME.registerComponent("drag-extinguisher", {
	schema: {
		target: { type: "selector" },
		extinguisherType: { type: "string", default: "co2" }
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
		
		// Store original values
		this.originalModel = this.el.getAttribute("gltf-model");
		const scaleAttr = this.el.getAttribute("scale");
		// Parse scale properly
		if (typeof scaleAttr === 'string') {
			const parts = scaleAttr.split(' ');
			this.originalScale = { x: parseFloat(parts[0]), y: parseFloat(parts[1]), z: parseFloat(parts[2]) };
		} else {
			this.originalScale = { x: scaleAttr.x, y: scaleAttr.y, z: scaleAttr.z };
		}
		console.log("Original scale stored:", this.originalScale);
		
		this.isTransformed = false;
		this.extinguisherType = this.data.extinguisherType;
		this.hasCheckedFire = false; // Flag to prevent multiple checks

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
				this.el.setAttribute("scale", `${this.originalScale.x} ${this.originalScale.y} ${this.originalScale.z}`);
				this.isTransformed = false;
				this.hasCheckedFire = false; // Reset flag when fire disappears
				console.log("Fire disappeared - reverted to original scale:", this.originalScale);
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

		if (distance < proximityThreshold) {
			// Extinguisher is close to fire
			if (!this.isTransformed) {
				// Store which cylinder was brought near (before transformation)
				window.currentBroughtCylinderType = this.extinguisherType;
				console.log("========================================");
				console.log("Cylinder brought near fire!");
				console.log("This component extinguisherType:", this.extinguisherType);
				console.log("Storing type:", window.currentBroughtCylinderType);
				console.log("========================================");
				
				this.el.setAttribute("gltf-model", "#sprayForm");
				this.el.setAttribute("scale", "0.2 0.2 0.2"); // Smaller scale for spray_form
				this.el.setAttribute("rotation", "0 270 0")
				this.isTransformed = true;
				console.log("✓ TRANSFORMED TO SPRAY FORM! Distance:", distance.toFixed(2));
			}
			
			// Check if correct extinguisher is used on fire (only once)
			if (!this.hasCheckedFire) {
				console.log("About to check fire...");
				this.hasCheckedFire = true;
				this.checkFireExtinguished();
			}
		} else if (distance >= proximityThreshold && this.isTransformed) {
			// Extinguisher moved away from fire
			window.currentBroughtCylinderType = null; // Clear the stored type
			this.el.setAttribute("gltf-model", this.originalModel);
			this.el.setAttribute("scale", `${this.originalScale.x} ${this.originalScale.y} ${this.originalScale.z}`);
			this.isTransformed = false;
			this.hasCheckedFire = false; // Reset flag when moving away
			console.log("✓ REVERTED TO ORIGINAL! Distance:", distance.toFixed(2), "Scale:", this.originalScale);
		}
	},

	checkFireExtinguished() {
		const fireEntity = document.getElementById("fireEntity");
		const currentFireModel = fireEntity.getAttribute("gltf-model");
		
		// Use the cylinder type that was brought near (stored BEFORE transformation)
		const broughtCylinderType = window.currentBroughtCylinderType;
		
		console.log("=== DETAILED FIRE CHECK ===");
		console.log("1. Current fire model on fireEntity:", currentFireModel);
		console.log("2. Window.currentBroughtCylinderType:", broughtCylinderType);
		console.log("3. This component extinguisherType:", this.extinguisherType);
		
		// Map fire model file paths to extinguisher types
		const fireToExtinguisher = {
			"assets/models/co2_fire.glb": "co2",
			"assets/models/dry_powder_fire.glb": "powder",
			"assets/models/foam_fire.glb": "foam",
			"assets/models/water_fire.glb": "water",
			// Also keep ID mappings as backup
			"#co2Fire": "co2",
			"#dryPowderFire": "powder",
			"#foamFire": "foam",
			"#waterFire": "water"
		};

		const requiredExtinguisher = fireToExtinguisher[currentFireModel];
		
		console.log("4. Required extinguisher for this fire:", requiredExtinguisher);
		console.log("5. Does brought cylinder match required?", broughtCylinderType === requiredExtinguisher);
		console.log("===========================");
		
		if (broughtCylinderType === requiredExtinguisher) {
			console.log("✓ CORRECT EXTINGUISHER! SUCCESS!");
			this.showDoneMessage();
		} else {
			console.log("✗ WRONG EXTINGUISHER! MISMATCH!");
			this.showWrongMessage();
		}
	},

	showDoneMessage() {
		const statusLabel = document.getElementById("statusLabel");
		console.log("Showing done message");
		if (statusLabel) {
			statusLabel.textContent = "✓ Done! Correct extinguisher used!";
			statusLabel.classList.add("success");
			statusLabel.classList.remove("error");
			statusLabel.removeAttribute("hidden");
			
			// Get which extinguisher was used
			const usedExtinguisherType = window.currentBroughtCylinderType;
			
			// Map extinguisher type to correct model entity
			const correctModelMap = {
				"co2": "correctFireBoxEntity",
				"powder": "correctChemicalEntity",
				"foam": "correctPetrolTankEntity",
				"water": "correctFirecampEntity"
			};
			
			const correctModelId = correctModelMap[usedExtinguisherType];
			console.log("Showing correct model:", correctModelId, "for extinguisher type:", usedExtinguisherType);
			
			// Hide fire after 2 seconds
			setTimeout(() => {
				const fireEntity = document.getElementById("fireEntity");
				const ashEntity = document.getElementById("ashEntity");
				const fireTypeLabel = document.getElementById("fireTypeLabel");
				const startFireButton = document.getElementById("startFireButton");
				const refreshFireButton = document.getElementById("refreshFireButton");
				const correctModelEntity = document.getElementById(correctModelId);
				
				if (fireEntity) fireEntity.setAttribute("visible", false);
				if (ashEntity) ashEntity.setAttribute("visible", false);
				if (correctModelEntity) correctModelEntity.setAttribute("visible", true);
				if (fireTypeLabel) fireTypeLabel.setAttribute("hidden", "");
				if (statusLabel) statusLabel.setAttribute("hidden", "");
				statusLabel.classList.remove("success");
				if (startFireButton) startFireButton.hidden = false;
				if (refreshFireButton) refreshFireButton.hidden = true;
				
				// Reset all extinguishers' check flag
				document.querySelectorAll('[drag-extinguisher]').forEach(el => {
					if (el.components['drag-extinguisher']) {
						el.components['drag-extinguisher'].hasCheckedFire = false;
					}
				});
				
				// Hide correct model after 3 more seconds
				setTimeout(() => {
					if (correctModelEntity) correctModelEntity.setAttribute("visible", false);
				}, 3000);
			}, 2000);
		}
	},

	showWrongMessage() {
		const statusLabel = document.getElementById("statusLabel");
		const ashEntity = document.getElementById("ashEntity");
		const fireEntity = document.getElementById("fireEntity");
		
		console.log("Showing wrong message - displaying ash model");
		if (statusLabel) {
			statusLabel.textContent = "✗ Wrong extinguisher! Try again.";
			statusLabel.classList.add("error");
			statusLabel.classList.remove("success");
			statusLabel.removeAttribute("hidden");
			
			// Show ash model instead of fire
			if (fireEntity) fireEntity.setAttribute("visible", false);
			if (ashEntity) ashEntity.setAttribute("visible", true);
			
			// Hide message and ash after 3 seconds
			setTimeout(() => {
				statusLabel.setAttribute("hidden", "");
				statusLabel.classList.remove("error");
				if (ashEntity) ashEntity.setAttribute("visible", false);
			}, 3000);
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
		
		// Track which extinguisher cylinder is being dragged (by original model)
		window.currentDraggedModel = this.originalModel;
		window.currentDraggedExtinguisher = this.extinguisherType;
		console.log("Started dragging cylinder. Original model:", this.originalModel);
		console.log("Extinguisher type:", this.extinguisherType);
		
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
		
		// Clear tracked extinguisher
		window.currentDraggedExtinguisher = null;
		console.log("Stopped dragging extinguisher");
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

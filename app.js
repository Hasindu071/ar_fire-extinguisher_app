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
		
		// Store original position
		const posAttr = this.el.getAttribute("position");
		if (typeof posAttr === 'string') {
			const parts = posAttr.split(' ');
			this.originalPosition = { x: parseFloat(parts[0]), y: parseFloat(parts[1]), z: parseFloat(parts[2]) };
		} else {
			this.originalPosition = { x: posAttr.x, y: posAttr.y, z: posAttr.z };
		}
		
		console.log("Original scale stored:", this.originalScale);
		console.log("Original position stored:", this.originalPosition);
		
		this.isTransformed = false;
		this.extinguisherType = this.data.extinguisherType;
		this.hasCheckedFire = false; // Flag to prevent multiple checks
		this.hasBeenUsed = false; // Track if cylinder was used on fire

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
				this.el.setAttribute("position", `${this.originalPosition.x} ${this.originalPosition.y} ${this.originalPosition.z}`);
				this.isTransformed = false;
				this.hasCheckedFire = false; // Reset flag when fire disappears
				this.hasBeenUsed = false; // Reset used flag
				console.log("Fire disappeared - reverted to original state");
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
				this.hasBeenUsed = true; // Mark as used
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
			this.el.setAttribute("position", `${this.originalPosition.x} ${this.originalPosition.y} ${this.originalPosition.z}`);
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
			
			// Play extinguisher spray sound - loop it while spraying
			const extinguisherSound = document.getElementById("extinguisherSound");
			const fireSound = document.getElementById("fireSound");
			if (fireSound) fireSound.pause();
			if (extinguisherSound) {
				extinguisherSound.currentTime = 0;
				extinguisherSound.loop = true; // Loop the spray sound during demonstration
				extinguisherSound.volume = 0.7;
				extinguisherSound.play().catch(err => console.log("Extinguisher sound play error:", err));
			}
			
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
			
			// Hide fire after 5 seconds (was 2 seconds) - gives time to see spraying in action
			setTimeout(() => {
				const fireEntity = document.getElementById("fireEntity");
				const ashEntity = document.getElementById("ashEntity");
				const fireTypeLabel = document.getElementById("fireTypeLabel");
				const startFireButton = document.getElementById("startFireButton");
				const refreshFireButton = document.getElementById("refreshFireButton");
				const correctModelEntity = document.getElementById(correctModelId);
				
				// Stop spray sound before showing correct model
				if (extinguisherSound) {
					extinguisherSound.pause();
				}
				
				if (fireEntity) fireEntity.setAttribute("visible", false);
				if (ashEntity) ashEntity.setAttribute("visible", false);
				if (correctModelEntity) correctModelEntity.setAttribute("visible", true);
				if (fireTypeLabel) fireTypeLabel.setAttribute("hidden", "");
				if (statusLabel) statusLabel.setAttribute("hidden", "");
				statusLabel.classList.remove("success");
				
				// Reset all extinguishers' check flag and position
				document.querySelectorAll('[drag-extinguisher]').forEach(el => {
					if (el.components['drag-extinguisher']) {
						const comp = el.components['drag-extinguisher'];
						comp.hasCheckedFire = false;
						// Reset position to original if cylinder was used
						if (comp.hasBeenUsed) {
							el.setAttribute("position", `${comp.originalPosition.x} ${comp.originalPosition.y} ${comp.originalPosition.z}`);
							comp.hasBeenUsed = false;
							console.log("Reset cylinder position to:", comp.originalPosition);
						}
					}
				});
				
				// Hide correct model after 3 more seconds
				setTimeout(() => {
					if (correctModelEntity) correctModelEntity.setAttribute("visible", false);
					
					// Show the "New Fire" button instead of "Start" button
					if (refreshFireButton) {
						refreshFireButton.hidden = false;
						console.log("Showing New Fire button");
					}
					if (startFireButton) {
						startFireButton.hidden = true;
						console.log("Hiding Start button");
					}
				}, 3000);
			}, 5000); // Extended from 2000ms to 5000ms (5 seconds)
		}
	},

	showWrongMessage() {
		const statusLabel = document.getElementById("statusLabel");
		const ashEntity = document.getElementById("ashEntity");
		const fireEntity = document.getElementById("fireEntity");
		
		// Stop fire sound
		const fireSound = document.getElementById("fireSound");
		if (fireSound) fireSound.pause();
		
		// Play blaster sound
		const blasterSound = document.getElementById("blasterSound");
		if (blasterSound) {
			blasterSound.currentTime = 0;
			blasterSound.volume = 0.8;
			blasterSound.play().catch(err => console.log("Blaster sound play error:", err));
		}
		
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
				// Restart fire sound if fire is still visible
				if (fireEntity.getAttribute("visible")) {
					if (fireSound) {
						fireSound.currentTime = 0;
						fireSound.play().catch(err => console.log("Fire sound play error:", err));
					}
				}
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
		
		// Reset position to original when released (unless being used on fire)
		const fireEntity = document.getElementById("fireEntity");
		if (!fireEntity || !fireEntity.getAttribute("visible")) {
			// Fire not active, always reset
			this.el.setAttribute("position", `${this.originalPosition.x} ${this.originalPosition.y} ${this.originalPosition.z}`);
			console.log("Cylinder released - reset to original position:", this.originalPosition);
		} else {
			// Fire is active, check distance
			const cylinderLocalPos = this.el.getAttribute("position");
			const fireLocalPos = fireEntity.getAttribute("position");
			const dx = cylinderLocalPos.x - fireLocalPos.x;
			const dy = cylinderLocalPos.y - fireLocalPos.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			
			// If not close to fire, reset position
			if (distance >= 1.2) {
				this.el.setAttribute("position", `${this.originalPosition.x} ${this.originalPosition.y} ${this.originalPosition.z}`);
				console.log("Cylinder released away from fire - reset to original position:", this.originalPosition);
			} else {
				console.log("Cylinder released near fire - keeping current position");
			}
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

// =====================
// MODE SELECTION (Marker Based vs Markerless WebXR)
// =====================
document.addEventListener("DOMContentLoaded", () => {
	const modeSelectScreen = document.getElementById("modeSelectScreen");
	const markerModeButton = document.getElementById("markerModeButton");
	const markerlessModeButton = document.getElementById("markerlessModeButton");
	const markerScene = document.getElementById("markerScene");
	const markerBackButton = document.getElementById("markerBackButton");
	const webxrScene = document.getElementById("webxrScene");
	const webxrBackButton = document.getElementById("webxrBackButton");

	if (!modeSelectScreen || !markerModeButton || !markerlessModeButton || !markerScene || !webxrScene) {
		console.error("Missing required elements for mode selection");
		return;
	}

	// User picked the marker-based experience (the existing app)
	markerModeButton.addEventListener("click", () => {
		modeSelectScreen.setAttribute("hidden", "");
		webxrScene.setAttribute("hidden", "");
		markerScene.removeAttribute("hidden");
		markerBackButton.removeAttribute("hidden");
		console.log("Marker Based AR selected");
	});

	// User picked the markerless (WebXR) experience
	markerlessModeButton.addEventListener("click", () => {
		modeSelectScreen.setAttribute("hidden", "");
		markerScene.setAttribute("hidden", "");
		webxrScene.removeAttribute("hidden");
		console.log("Markerless AR (WebXR) selected");

		// Kick off the WebXR compatibility check + scene setup (defined in index.html)
		if (typeof window.startWebXRExperience === "function") {
			window.startWebXRExperience();
		} else {
			console.error("WebXR experience script did not load correctly");
		}
	});

	// Return to the mode selection screen from the marker-based experience
	if (markerBackButton) {
		markerBackButton.addEventListener("click", () => {
			markerScene.setAttribute("hidden", "");
			markerBackButton.setAttribute("hidden", "");
			modeSelectScreen.removeAttribute("hidden");
			
			// Reset marker-based AR state
			const fireEntity = document.getElementById("fireEntity");
			const ashEntity = document.getElementById("ashEntity");
			const fireTypeLabel = document.getElementById("fireTypeLabel");
			const statusLabel = document.getElementById("statusLabel");
			const startButton = document.getElementById("startFireButton");
			const fireSound = document.getElementById("fireSound");
			const extinguisherSound = document.getElementById("extinguisherSound");
			
			if (fireEntity) fireEntity.setAttribute("visible", false);
			if (ashEntity) ashEntity.setAttribute("visible", false);
			if (fireTypeLabel) fireTypeLabel.setAttribute("hidden", "");
			if (statusLabel) statusLabel.setAttribute("hidden", "");
			if (startButton) startButton.hidden = true;
			if (fireSound) fireSound.pause();
			if (extinguisherSound) extinguisherSound.pause();
			
			// Reset all extinguishers
			document.querySelectorAll('[drag-extinguisher]').forEach(el => {
				if (el.components['drag-extinguisher']) {
					const comp = el.components['drag-extinguisher'];
					comp.hasCheckedFire = false;
					comp.isTransformed = false;
					el.setAttribute("gltf-model", comp.originalModel);
					el.setAttribute("scale", `${comp.originalScale.x} ${comp.originalScale.y} ${comp.originalScale.z}`);
					el.setAttribute("position", `${comp.originalPosition.x} ${comp.originalPosition.y} ${comp.originalPosition.z}`);
				}
			});
			
			console.log("Returned to mode selection from Marker Based AR");
		});
	}

	// Return to the mode selection screen from the markerless experience
	if (webxrBackButton) {
		webxrBackButton.addEventListener("click", () => {
			webxrScene.setAttribute("hidden", "");
			modeSelectScreen.removeAttribute("hidden");
			console.log("Returned to mode selection from Markerless AR");
		});
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
		console.error("Missing required elements for marker tracking");
		return;
	}

	const resetFireState = () => {
		fireEntity.setAttribute("visible", false);
		fireTypeLabel.setAttribute("hidden", "");
		startButton.hidden = true;
		refreshButton.hidden = true;
		
		// Stop fire sound
		const fireSound = document.getElementById("fireSound");
		if (fireSound) fireSound.pause();
	};

	const displayRandomFire = () => {
		const randomModel = fireModels[Math.floor(Math.random() * fireModels.length)];
		fireEntity.setAttribute("gltf-model", randomModel);
		fireEntity.setAttribute("scale", fireScales[randomModel]);
		fireEntity.setAttribute("visible", true);
		
		// Play fire sound
		const fireSound = document.getElementById("fireSound");
		if (fireSound) {
			fireSound.currentTime = 0;
			fireSound.loop = true;
			fireSound.volume = 0.5;
			fireSound.play().catch(err => console.log("Fire sound play error:", err));
		}
		
		// Update the fire type label at top
		fireTypeLabel.textContent = fireTypes[randomModel];
		fireTypeLabel.removeAttribute("hidden");
		
		startButton.hidden = true;
		refreshButton.hidden = false;
	};

	target.addEventListener("targetFound", () => {
		console.log("✓✓✓ TARGET FOUND EVENT FIRED ✓✓✓");
		fireEntity.setAttribute("visible", false);
		startButton.hidden = false;
		refreshButton.hidden = true;
		console.log("Target found - start button shown");
	});

	target.addEventListener("targetLost", () => {
		console.log("✗✗✗ TARGET LOST EVENT FIRED ✗✗✗");
		resetFireState();
	});

	// Also log when these listeners are added
	console.log("Target element found:", target !== null);

	startButton.addEventListener("click", displayRandomFire);

	refreshButton.addEventListener("click", displayRandomFire);

	resetFireState();
	console.log("Marker tracking initialized");
});

// =====================
// MARKERLESS AR SECTION (using AR.js - ARLite)
// =====================

document.addEventListener("DOMContentLoaded", () => {
	const backToMarkerButton = document.getElementById("backToMarkerButton");
	const markerScene = document.getElementById("markerScene");
	const markerlessScene = document.getElementById("markerlessScene");
	const modeIndicator = document.getElementById("modeIndicator");
	const arLoadingScreen = document.getElementById("arLoadingScreen");
	const placementInstruction = document.getElementById("placementInstruction");
	const overlay = document.getElementById("overlay");
	const cylinderContainer = document.getElementById("cylinderContainer");

	let placedCylinders = [];

	// Cylinder configurations for markerless AR
	const cylinderConfigs = [
		{
			id: "co2MarkerlessExt",
			model: "#co2ExtinguisherMarkerless",
			type: "co2",
			color: 0x1976d2
		},
		{
			id: "foamMarkerlessExt",
			model: "#foamExtinguisherMarkerless",
			type: "foam",
			color: 0xffc107
		},
		{
			id: "powderMarkerlessExt",
			model: "#powderExtinguisherMarkerless",
			type: "powder",
			color: 0xff9800
		},
		{
			id: "waterMarkerlessExt",
			model: "#waterExtinguisherMarkerless",
			type: "water",
			color: 0x00bcd4
		}
	];

	// Set up click handler for cylinder placement
	function setupClickPlacement() {
		console.log("Setting up placement...");
		
		// Wait for the scene to be ready
		setTimeout(() => {
			const scene = markerlessScene.components.scene;
			console.log("Scene:", scene);
			console.log("MarkerlessScene element:", markerlessScene);
			
			// Try to attach click listener directly to the scene element
			markerlessScene.addEventListener("click", (e) => {
				console.log("Scene clicked, placedCylinders:", placedCylinders.length);
				if (placedCylinders.length < 4) {
					placeCylinder();
				}
			});

			// Also support touch for mobile - attach to document for better coverage
			document.addEventListener("touchstart", (e) => {
				console.log("Touch detected, placedCylinders:", placedCylinders.length);
				if (placedCylinders.length < 4 && e.touches.length === 1) {
					placeCylinder();
				}
			}, false);
			
			console.log("Placement setup complete");
		}, 500);
	}

	// Place a cylinder in the scene
	function placeCylinder() {
		if (placedCylinders.length >= 4) return;

		const config = cylinderConfigs[placedCylinders.length];
		console.log("Placing cylinder:", config.id, "Model:", config.model);
		
		const entity = document.createElement("a-entity");
		
		// Create cylinder at positions in front of camera
		const positions = [
			{ x: -0.6, y: 0.2, z: -2 },
			{ x: 0.6, y: 0.2, z: -2 },
			{ x: -0.6, y: 0.2, z: -3 },
			{ x: 0.6, y: 0.2, z: -3 }
		];

		const pos = positions[placedCylinders.length];

		entity.id = config.id;
		entity.setAttribute("gltf-model", config.model);
		entity.setAttribute("position", `${pos.x} ${pos.y} ${pos.z}`);
		entity.setAttribute("rotation", "0 0 0");
		entity.setAttribute("scale", "1.5 1.5 1.5");
		entity.setAttribute("class", "cylinder-model");

		// Add falling animation
		const startY = pos.y + 1;
		entity.setAttribute("position", `${pos.x} ${startY} ${pos.z}`);

		entity.addEventListener("loaded", () => {
			console.log("Model loaded:", config.id);
			// Animate falling
			let currentY = startY;
			const fallInterval = setInterval(() => {
				currentY -= 0.1;
				if (currentY <= pos.y) {
					currentY = pos.y;
					clearInterval(fallInterval);
				}
				entity.setAttribute("position", `${pos.x} ${currentY} ${pos.z}`);
			}, 30);
		});

		cylinderContainer.appendChild(entity);
		console.log("Entity appended to container");
		placedCylinders.push(config);

		// Update instruction
		const remaining = 4 - placedCylinders.length;
		if (remaining > 0) {
			placementInstruction.textContent = `Placed ${placedCylinders.length}/4 ✓ - Tap to place ${remaining} more`;
		} else {
			placementInstruction.textContent = "✓ All 4 fire extinguishers placed! 🎉";
			setTimeout(() => {
				placementInstruction.textContent = "You can move your camera around to view them";
			}, 2000);
		}

		console.log(`Placed cylinder ${placedCylinders.length}/${4}: ${config.type}`);
	}

	// Back to marker-based AR
	backToMarkerButton.addEventListener("click", () => {
		console.log("Returning to marker AR...");

		// Clean up markerless scene
		placedCylinders = [];
		cylinderContainer.innerHTML = "";

		// Switch back to marker scene
		markerlessScene.setAttribute("hidden", "");
		markerScene.removeAttribute("hidden");
		overlay.style.display = "none";
		modeIndicator.setAttribute("hidden", "");

		console.log("Switched back to marker-based AR");
	});

	console.log("AR.js (ARLite) Markerless AR Ready");
});
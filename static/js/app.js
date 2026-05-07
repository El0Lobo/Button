
    // =========================
    // 1) Core DOM + State
    // =========================
    const maxCols = 5;
    const maxRows = 6;
    const totalButtons = maxCols * maxRows;
    const a4canvas = document.getElementById("a4canvas");
    const canvasWrapper = document.getElementById("canvasWrapper");
    const canvasScale = document.getElementById("canvasScale");
    const countDisplay = document.getElementById("count");
    const imageGallery = document.getElementById("imageGallery");
    const standardGallery = document.getElementById("standardGallery");
    const canvasZoomSlider = document.getElementById("canvasZoomSlider");
    const canvasZoomValue = document.getElementById("canvasZoomValue");


    countDisplay.innerText = `Max Buttons per Page: ${totalButtons}`;

    let selectedSlots = new Set();
    let imageMap = new Map();
    let uploadedImages = [];
    let currentCanvasZoom = 1;
    let colorPickMode = false;
    let colorPickTargetId = "buttonBgColorPickerRight";
    const colorPickerMap = new Map();
    const colorPickCanvas = document.createElement("canvas");
    const colorPickCtx = colorPickCanvas.getContext("2d", { willReadFrequently: true });
    let colorPickSnapshot = null;
    let colorPickSnapshotScale = 1;
    let colorPickSnapshotPromise = null;
    let colorPickPreviewEl = null;
    let previewRaf = null;

    // =========================
    // 2) Build Canvas Grid
    // =========================
    for (let i = 0; i < totalButtons; i++) {
      const slot = document.createElement("div");
      slot.classList.add("button-slot");
      slot.dataset.index = i;

      slot.innerHTML = `
        <input type="checkbox"
               class="checkbox"
               onclick="event.stopPropagation(); toggleSlot(this.parentElement, this.checked);" />
        <div class="overlay-cutbox"></div>
        <div class="button-content"></div>
        <div class="overlay-inner"></div>
        <div class="overlay-middle"></div>
        <div class="overlay-outer"></div>
        <div class="overlay-cutline-default"></div>
        <div class="overlay-cutline-custom"></div>
      `;

      // Clicking the slot (outside the checkbox) will toggle the checkbox & selection
      slot.addEventListener("click", () => {
        const checkbox = slot.querySelector(".checkbox");
        checkbox.checked = !checkbox.checked;
        toggleSlot(slot, checkbox.checked);
      });

      a4canvas.appendChild(slot);
    }

    const standardImageFiles = [
      "lgbtq+.png",
      "palestine.png",
      "equali-tea.png",
      "fight the rich.png",
      "gayer.png",
      "genozid.png",
      "kein sex mit nazis.png",
      "smoky.png",
      "bantifa.png",
      "adhs-antifa.png",
      "good-night-white-pride.png",
      "no-nazis.png",
      "palestine-2.png",
      "daria.png",
      "Pigeon.png",
      "oracles.png",
      "police.png",
      "racism illness.png",
      "racist.png",
      "starren.png",
      "june.png",
      "cat.png",
      "good-night-cat.png",
      "A.png",
      "Lizzy.png",
      "patriarchy.png",
      "Flinta.png",
      "innen.png",
      "eat the rich.png",
      "eat the rich2.png"
    ];

    function createGalleryItem({ imgSrc, onClick, removable, onRemove }) {
      const galleryItem = document.createElement("div");
      galleryItem.classList.add("gallery-item");

      const galleryImg = document.createElement("img");
      galleryImg.src = imgSrc;
      galleryImg.style.cursor = "pointer";
      galleryImg.addEventListener("click", (event) => {
        if (handleColorPickFromImage(event, galleryImg)) return;
        if (onClick) onClick();
      });

      galleryItem.appendChild(galleryImg);

      if (removable) {
        const deleteBtn = document.createElement("span");
        deleteBtn.innerHTML = "❌";
        deleteBtn.title = "Remove image";
        deleteBtn.className = "gallery-delete";
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onRemove) onRemove();
          galleryItem.remove();
        });
        galleryItem.appendChild(deleteBtn);
      }

      return galleryItem;
    }

    function preloadStandardImages() {
      if (!standardGallery) return;
      standardImageFiles.forEach((filename) => {
        const imgSrc = `standards/${filename}`;
        const item = createGalleryItem({
          imgSrc,
          onClick: () => applyImageToSelected(imgSrc),
          removable: false
        });
        standardGallery.appendChild(item);
      });
    }

    const extraCutlineToggle = document.getElementById("extraCutlineToggle");
    const customCutlineToggle = document.getElementById("customCutlineToggle");
    const customCutlineDiameter = document.getElementById("customCutlineDiameter");
    const hideDefaultRingsToggle = document.getElementById("hideDefaultRingsToggle");
    const inkSaverToggle = document.getElementById("inkSaverToggle");
    const defaultCutlineDiameterMm = 28;

    function getActiveCutlineDiameterMm() {
      const customEnabled = customCutlineToggle && customCutlineToggle.checked;
      const diameterValue = parseFloat(customCutlineDiameter ? customCutlineDiameter.value : "");
      if (customEnabled && Number.isFinite(diameterValue) && diameterValue > 0) {
        return diameterValue;
      }
      return defaultCutlineDiameterMm;
    }

    function getActiveFillDiameterMm() {
      const inkSaver = inkSaverToggle && inkSaverToggle.checked;
      return inkSaver ? defaultCutlineDiameterMm : getActiveCutlineDiameterMm();
    }

    function getActiveMaskDiameterMm() {
      const inkSaver = inkSaverToggle && inkSaverToggle.checked;
      return inkSaver ? defaultCutlineDiameterMm : getActiveCutlineDiameterMm();
    }

    function getActiveCutboxDiameterMm() {
      return getActiveCutlineDiameterMm();
    }

    function updateBackgroundFillSizes() {
      const diameter = getActiveFillDiameterMm();
      document.querySelectorAll(".button-slot .button-bg-color").forEach((bg) => {
        bg.style.width = `${diameter}mm`;
        bg.style.height = `${diameter}mm`;
        bg.style.left = "50%";
        bg.style.top = "50%";
        bg.style.right = "auto";
        bg.style.bottom = "auto";
        bg.style.transform = "translate(-50%, -50%)";
      });
    }

    function updateButtonContentSizes() {
      const diameter = getActiveMaskDiameterMm();
      document.querySelectorAll(".button-slot .button-content").forEach((content) => {
        content.style.inset = "auto";
        content.style.width = `${diameter}mm`;
        content.style.height = `${diameter}mm`;
        content.style.left = "50%";
        content.style.top = "50%";
        content.style.right = "auto";
        content.style.bottom = "auto";
        content.style.transform = "translate(-50%, -50%)";
      });
    }

    function updateImageBaseScales() {
      document.querySelectorAll(".button-content img.button-image").forEach((img) => {
        setImageBaseScale(img);
      });
    }

    function updateCutboxSizes() {
      const diameter = getActiveCutboxDiameterMm();
      document.querySelectorAll(".overlay-cutbox").forEach((box) => {
        box.style.width = `${diameter}mm`;
        box.style.height = `${diameter}mm`;
        box.style.left = "50%";
        box.style.top = "50%";
        box.style.right = "auto";
        box.style.bottom = "auto";
        box.style.transform = "translate(-50%, -50%)";
      });
    }

    function updateCutlineOverlay() {
      const customEnabled = customCutlineToggle && customCutlineToggle.checked;
      const showDefault = extraCutlineToggle && extraCutlineToggle.checked;
      const hideDefault = hideDefaultRingsToggle && hideDefaultRingsToggle.checked;
      const diameter = getActiveCutlineDiameterMm();

      if (extraCutlineToggle) {
        extraCutlineToggle.disabled = !!customEnabled;
      }

      document.querySelectorAll(".overlay-cutline-default").forEach((el) => {
        el.style.display = showDefault && !(customEnabled && hideDefault) ? "block" : "none";
      });

      document.querySelectorAll(".overlay-cutline-custom").forEach((el) => {
        el.style.display = customEnabled ? "block" : "none";
        el.style.width = `${diameter}mm`;
        el.style.height = `${diameter}mm`;
      });
      document.querySelectorAll(".overlay-outer").forEach((el) => {
        el.style.display = customEnabled && hideDefault ? "none" : "";
      });
      updateButtonContentSizes();
      updateBackgroundFillSizes();
      updateCutboxSizes();
    }

    if (extraCutlineToggle) {
      extraCutlineToggle.addEventListener("change", updateCutlineOverlay);
    }
    if (customCutlineToggle) {
      customCutlineToggle.addEventListener("change", updateCutlineOverlay);
    }
    if (customCutlineDiameter) {
      customCutlineDiameter.addEventListener("input", updateCutlineOverlay);
    }
    if (hideDefaultRingsToggle) {
      hideDefaultRingsToggle.addEventListener("change", updateCutlineOverlay);
    }
    if (inkSaverToggle) {
      inkSaverToggle.addEventListener("change", updateCutlineOverlay);
    }
    updateCutlineOverlay();

    const gridlinesToggle = document.getElementById("gridlinesToggle");
    const cutboxToggle = document.getElementById("cutboxToggle");

    let pageGridlinesEl = null;
    function ensurePageGridlines() {
      if (pageGridlinesEl) return pageGridlinesEl;
      pageGridlinesEl = document.createElement("div");
      pageGridlinesEl.id = "page-gridlines";
      a4canvas.prepend(pageGridlinesEl);
      return pageGridlinesEl;
    }

    function getSlotCenters() {
      const centers = [];
      document.querySelectorAll(".button-slot").forEach((slot) => {
        if (!slot.offsetWidth || !slot.offsetHeight) return;
        centers.push({
          x: slot.offsetLeft + slot.offsetWidth / 2,
          y: slot.offsetTop + slot.offsetHeight / 2
        });
      });
      return centers;
    }

    function uniqueSorted(values) {
      const sorted = values.slice().sort((a, b) => a - b);
      const result = [];
      const tolerance = 0.8;
      sorted.forEach((value) => {
        if (!result.length || Math.abs(result[result.length - 1] - value) > tolerance) {
          result.push(value);
        }
      });
      return result;
    }

    function updateGridlines() {
      const show = gridlinesToggle && gridlinesToggle.checked;
      const gridEl = ensurePageGridlines();
      gridEl.style.display = show ? "block" : "none";
      if (!show) return;

      gridEl.innerHTML = "";
      const centers = getSlotCenters();
      const xs = uniqueSorted(centers.map((c) => c.x));
      const ys = uniqueSorted(centers.map((c) => c.y));

      xs.forEach((x) => {
        const line = document.createElement("div");
        line.className = "gridline vertical";
        line.style.left = `${x}px`;
        gridEl.appendChild(line);
      });
      ys.forEach((y) => {
        const line = document.createElement("div");
        line.className = "gridline horizontal";
        line.style.top = `${y}px`;
        gridEl.appendChild(line);
      });
    }

    function updateCutboxes() {
      const show = cutboxToggle && cutboxToggle.checked;
      document.querySelectorAll(".overlay-cutbox").forEach((el) => {
        el.style.display = show ? "block" : "none";
      });
    }

    if (gridlinesToggle) {
      gridlinesToggle.addEventListener("change", updateGridlines);
    }
    if (cutboxToggle) {
      cutboxToggle.addEventListener("change", updateCutboxes);
    }
    updateGridlines();
    updateCutboxes();

    function applyBackgroundColor(pickerId) {
      const leftPicker = document.getElementById("buttonBgColorPicker");
      const rightPicker = document.getElementById("buttonBgColorPickerRight");
      let sourcePicker = pickerId ? document.getElementById(pickerId) : null;
      if (!sourcePicker) {
        sourcePicker = rightPicker || leftPicker;
      }
      const color = sourcePicker ? sourcePicker.value : "#ffffff";

      if (leftPicker && leftPicker !== sourcePicker) {
        leftPicker.value = color;
      }
      if (rightPicker && rightPicker !== sourcePicker) {
        rightPicker.value = color;
      }

      selectedSlots.forEach((slot) => {
        const content = slot.querySelector(".button-content");
        // Remove old background layer if it exists
        const oldBg = slot.querySelector(".button-bg-color");
        if (oldBg) oldBg.remove();

        // Create a new background circle layer
        const bg = document.createElement("div");
        bg.className = "button-bg-color";
        const diameter = getActiveFillDiameterMm();
        bg.style.top = "50%";
        bg.style.left = "50%";
        bg.style.width = `${diameter}mm`;
        bg.style.height = `${diameter}mm`;
        bg.style.transform = "translate(-50%, -50%)";
        bg.style.backgroundColor = color;

        // Insert behind the image/content so it can extend beyond the mask
        slot.insertBefore(bg, content);
      });
    }

    function clamp01(value) {
      return Math.min(1, Math.max(0, value));
    }

    function hsvToRgb(h, s, v) {
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;
      let r = 0;
      let g = 0;
      let b = 0;

      if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
      } else if (h < 120) {
        r = x;
        g = c;
        b = 0;
      } else if (h < 180) {
        r = 0;
        g = c;
        b = x;
      } else if (h < 240) {
        r = 0;
        g = x;
        b = c;
      } else if (h < 300) {
        r = x;
        g = 0;
        b = c;
      } else {
        r = c;
        g = 0;
        b = x;
      }

      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
      };
    }

    function rgbToHsv(r, g, b) {
      const rn = r / 255;
      const gn = g / 255;
      const bn = b / 255;
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const delta = max - min;
      let h = 0;

      if (delta !== 0) {
        if (max === rn) {
          h = 60 * (((gn - bn) / delta) % 6);
        } else if (max === gn) {
          h = 60 * ((bn - rn) / delta + 2);
        } else {
          h = 60 * ((rn - gn) / delta + 4);
        }
      }

      if (h < 0) h += 360;

      const s = max === 0 ? 0 : delta / max;
      const v = max;
      return { h, s, v };
    }

    function rgbToHex(r, g, b) {
      return (
        "#" +
        [r, g, b]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("")
      ).toUpperCase();
    }

    function hexToRgb(hex) {
      const match = hex.match(/^#([0-9a-fA-F]{6})$/);
      if (!match) return null;
      const intVal = parseInt(match[1], 16);
      return {
        r: (intVal >> 16) & 255,
        g: (intVal >> 8) & 255,
        b: intVal & 255,
      };
    }

    function normalizeHexInput(value) {
      if (!value) return null;
      let hex = value.trim();
      if (!hex) return null;
      if (!hex.startsWith("#")) {
        hex = `#${hex}`;
      }
      if (hex.length === 4) {
        hex =
          "#" +
          hex[1] +
          hex[1] +
          hex[2] +
          hex[2] +
          hex[3] +
          hex[3];
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
      return hex.toUpperCase();
    }

    function setColorPickMode(isActive, targetId) {
      colorPickMode = isActive;
      if (targetId) {
        colorPickTargetId = targetId;
      }
      document.body.classList.toggle("color-pick-active", colorPickMode);
      document.querySelectorAll(".color-picker__pick").forEach((button) => {
        button.textContent = colorPickMode ? "Click anywhere to pick" : "Pick from page";
      });
      if (colorPickMode) {
        ensureColorPickPreview();
        colorPickPreviewEl.style.display = "inline-flex";
        captureColorPickSnapshot();
      } else if (colorPickPreviewEl) {
        colorPickPreviewEl.style.display = "none";
      }
    }

    function setCustomPickerHex(targetId, hex) {
      const container = document.querySelector(
        `.color-picker[data-target="${targetId}"]`
      );
      if (container && typeof container.__setHex === "function") {
        container.__setHex(hex);
        return;
      }
      const input = document.getElementById(targetId);
      if (input) {
        input.value = hex.toLowerCase();
      }
    }

    function sampleHexFromImage(imgEl, clientX, clientY) {
      if (!imgEl || !imgEl.complete || !colorPickCtx) return null;
      const rect = imgEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const relX = (clientX - rect.left) / rect.width;
      const relY = (clientY - rect.top) / rect.height;
      if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;

      const sx = Math.min(
        imgEl.naturalWidth - 1,
        Math.max(0, Math.round(relX * imgEl.naturalWidth))
      );
      const sy = Math.min(
        imgEl.naturalHeight - 1,
        Math.max(0, Math.round(relY * imgEl.naturalHeight))
      );

      colorPickCanvas.width = imgEl.naturalWidth;
      colorPickCanvas.height = imgEl.naturalHeight;
      colorPickCtx.clearRect(0, 0, colorPickCanvas.width, colorPickCanvas.height);
      colorPickCtx.drawImage(imgEl, 0, 0);
      const pixel = colorPickCtx.getImageData(sx, sy, 1, 1).data;
      return rgbToHex(pixel[0], pixel[1], pixel[2]);
    }

    function handleColorPickFromImage(event, imgEl) {
      if (!colorPickMode) return false;
      event.preventDefault();
      event.stopPropagation();
      const hex = sampleHexFromImage(imgEl, event.clientX, event.clientY);
      if (hex) {
        setCustomPickerHex(colorPickTargetId, hex);
      }
      setColorPickMode(false);
      return true;
    }

    function handleColorPickFromPage(event) {
      if (!colorPickMode) return;
      if (event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      const clickX = event.clientX;
      const clickY = event.clientY;
      const hex = sampleHexFromSnapshot(clickX, clickY);
      if (hex) {
        setCustomPickerHex(colorPickTargetId, hex);
        setColorPickMode(false);
        return;
      }

      if (typeof html2canvas !== "function") {
        setColorPickMode(false);
        return;
      }

      html2canvas(document.body, {
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
      })
        .then((canvas) => {
          const scaleX = canvas.width / window.innerWidth;
          const scaleY = canvas.height / window.innerHeight;
          const sx = Math.min(
            canvas.width - 1,
            Math.max(0, Math.round(clickX * scaleX))
          );
          const sy = Math.min(
            canvas.height - 1,
            Math.max(0, Math.round(clickY * scaleY))
          );
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setColorPickMode(false);
            return;
          }
          const pixel = ctx.getImageData(sx, sy, 1, 1).data;
          const picked = rgbToHex(pixel[0], pixel[1], pixel[2]);
          setCustomPickerHex(colorPickTargetId, picked);
          setColorPickMode(false);
        })
        .catch(() => {
          setColorPickMode(false);
        });
    }

    function ensureColorPickPreview() {
      if (colorPickPreviewEl) return;
      colorPickPreviewEl = document.createElement("div");
      colorPickPreviewEl.id = "colorPickPreview";
      colorPickPreviewEl.innerHTML =
        '<span class="preview-swatch"></span><span class="preview-hex">#FFFFFF</span>';
      document.body.appendChild(colorPickPreviewEl);
    }

    function updateColorPickPreview(event) {
      if (!colorPickMode || !colorPickPreviewEl) return;
      if (previewRaf) cancelAnimationFrame(previewRaf);
      previewRaf = requestAnimationFrame(() => {
        const hex = sampleHexFromSnapshot(event.clientX, event.clientY);
        if (!hex) return;
        const swatch = colorPickPreviewEl.querySelector(".preview-swatch");
        const label = colorPickPreviewEl.querySelector(".preview-hex");
        if (swatch) swatch.style.background = hex;
        if (label) label.textContent = hex;
        const offset = 14;
        colorPickPreviewEl.style.left = `${event.clientX + offset}px`;
        colorPickPreviewEl.style.top = `${event.clientY + offset}px`;
      });
    }

    function captureColorPickSnapshot() {
      if (typeof html2canvas !== "function") return Promise.resolve(null);
      if (colorPickSnapshotPromise) return colorPickSnapshotPromise;

      colorPickSnapshotPromise = html2canvas(document.body, {
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
      })
        .then((canvas) => {
          colorPickSnapshot = canvas;
          colorPickSnapshotScale = canvas.width / window.innerWidth;
          colorPickSnapshotPromise = null;
          return canvas;
        })
        .catch(() => {
          colorPickSnapshotPromise = null;
          return null;
        });

      return colorPickSnapshotPromise;
    }

    function sampleHexFromSnapshot(clientX, clientY) {
      if (!colorPickSnapshot) return null;
      const sx = Math.min(
        colorPickSnapshot.width - 1,
        Math.max(0, Math.round(clientX * colorPickSnapshotScale))
      );
      const sy = Math.min(
        colorPickSnapshot.height - 1,
        Math.max(0, Math.round(clientY * colorPickSnapshotScale))
      );
      const ctx = colorPickSnapshot.getContext("2d");
      if (!ctx) return null;
      const pixel = ctx.getImageData(sx, sy, 1, 1).data;
      return rgbToHex(pixel[0], pixel[1], pixel[2]);
    }

    function initCustomColorPicker(container) {
      const targetId = container.dataset.target;
      const hiddenInput = targetId
        ? document.getElementById(targetId)
        : container.querySelector('input[type="hidden"]');
      const sv = container.querySelector(".color-picker__sv");
      const svCursor = container.querySelector(".color-picker__sv-cursor");
      const hue = container.querySelector(".color-picker__hue");
      const hexInput = container.querySelector(".color-picker__hex");
      const swatch = container.querySelector(".color-picker__swatch");
      const pickButton = container.querySelector(".color-picker__pick");

      if (!hiddenInput || !sv || !svCursor || !hue || !hexInput) return;

      let hsv = { h: 0, s: 0, v: 1 };
      let dragging = false;

      function syncUI() {
        sv.style.setProperty("--hue", hsv.h.toString());
        svCursor.style.left = `${hsv.s * 100}%`;
        svCursor.style.top = `${(1 - hsv.v) * 100}%`;
        hue.value = Math.round(hsv.h).toString();
        const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        hiddenInput.value = hex.toLowerCase();
        hexInput.value = hex;
        if (swatch) {
          swatch.style.background = hex;
        }
      }

      function setHsv(next) {
        hsv = {
          h: ((next.h % 360) + 360) % 360,
          s: clamp01(next.s),
          v: clamp01(next.v),
        };
        syncUI();
      }

      function setFromHex(value) {
        const normalized = normalizeHexInput(value);
        if (!normalized) return;
        const rgb = hexToRgb(normalized);
        if (!rgb) return;
        const next = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHsv(next);
      }

      function updateFromPointer(event) {
        const rect = sv.getBoundingClientRect();
        const x = clamp01((event.clientX - rect.left) / rect.width);
        const y = clamp01((event.clientY - rect.top) / rect.height);
        setHsv({ h: hsv.h, s: x, v: 1 - y });
      }

      sv.addEventListener("pointerdown", (event) => {
        dragging = true;
        sv.setPointerCapture(event.pointerId);
        updateFromPointer(event);
      });

      sv.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        updateFromPointer(event);
      });

      sv.addEventListener("pointerup", () => {
        dragging = false;
      });

      sv.addEventListener("pointercancel", () => {
        dragging = false;
      });

      hue.addEventListener("input", () => {
        const nextHue = parseFloat(hue.value);
        setHsv({ h: Number.isFinite(nextHue) ? nextHue : 0, s: hsv.s, v: hsv.v });
      });

      hexInput.addEventListener("input", () => {
        const normalized = normalizeHexInput(hexInput.value);
        if (!normalized) return;
        setFromHex(normalized);
      });

      hexInput.addEventListener("change", () => {
        const normalized = normalizeHexInput(hexInput.value);
        if (!normalized) {
          syncUI();
          return;
        }
        setFromHex(normalized);
      });

      if (pickButton) {
        pickButton.addEventListener("click", () => {
          setColorPickMode(!colorPickMode, targetId || colorPickTargetId);
        });
      }

      container.__setHex = (value) => {
        setFromHex(value);
      };
      colorPickerMap.set(container, { setFromHex });

      setFromHex(hiddenInput.value || hexInput.value || "#ffffff");
    }

    document.querySelectorAll(".color-picker").forEach((picker) => {
      initCustomColorPicker(picker);
    });
    document.addEventListener("click", handleColorPickFromPage, true);
    document.addEventListener("mousemove", updateColorPickPreview, true);

    const helpToggle = document.getElementById("helpToggle");
    const helpModal = document.getElementById("helpModal");
    function openHelpModal() {
      if (!helpModal) return;
      helpModal.classList.add("is-open");
      helpModal.setAttribute("aria-hidden", "false");
    }
    function closeHelpModal() {
      if (!helpModal) return;
      helpModal.classList.remove("is-open");
      helpModal.setAttribute("aria-hidden", "true");
    }
    if (helpToggle && helpModal) {
      helpToggle.addEventListener("click", openHelpModal);
      helpModal.querySelectorAll("[data-help-close]").forEach((el) => {
        el.addEventListener("click", closeHelpModal);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeHelpModal();
      });
    }

    let snapshotRefreshTimer = null;
    function scheduleSnapshotRefresh() {
      if (!colorPickMode) return;
      if (snapshotRefreshTimer) clearTimeout(snapshotRefreshTimer);
      snapshotRefreshTimer = setTimeout(() => {
        colorPickSnapshot = null;
        captureColorPickSnapshot();
      }, 120);
    }

    window.addEventListener("scroll", scheduleSnapshotRefresh, true);
    window.addEventListener("resize", scheduleSnapshotRefresh, true);

    function selectAll() {
      document.querySelectorAll(".button-slot").forEach((slot) => {
        const checkbox = slot.querySelector(".checkbox");
        checkbox.checked = true;
        slot.classList.add("selected");
        selectedSlots.add(slot);
      });
      countDisplay.innerText = `Selected Buttons: ${selectedSlots.size}`;
    }

    function deselectAll() {
      document.querySelectorAll(".button-slot").forEach((slot) => {
        const checkbox = slot.querySelector(".checkbox");
        checkbox.checked = false;
        slot.classList.remove("selected");
        selectedSlots.delete(slot);
      });
      countDisplay.innerText = `Selected Buttons: ${selectedSlots.size}`;
    }

    function resetselectione() {
      // Remove images only from currently selected slots
      selectedSlots.forEach((slot) => {
        slot.querySelector(".button-content")
          .querySelectorAll("img.button-image")
          .forEach((img) => img.remove());
        imageMap.delete(slot);
        const bg = slot.querySelector(".button-bg-color");
        if (bg) bg.remove();
      });
    }

    function resetAll() {
      // Clear everything: unselect and remove all images
      document.querySelectorAll(".button-slot").forEach((slot) => {
        const checkbox = slot.querySelector(".checkbox");
        checkbox.checked = false;
        slot.classList.remove("selected");
        slot.querySelector(".button-content")
          .querySelectorAll("img.button-image")
          .forEach((img) => img.remove());
        selectedSlots.delete(slot);
        imageMap.delete(slot);
        const bg = slot.querySelector(".button-bg-color");
        if (bg) bg.remove();
      });
      countDisplay.innerText = `Selected Buttons: ${selectedSlots.size}`;
    }

    function toggleSlot(slot, checked) {
      if (checked) {
        slot.classList.add("selected");
        selectedSlots.add(slot);
      } else {
        slot.classList.remove("selected");
        selectedSlots.delete(slot);
      }
      countDisplay.innerText = `Selected Buttons: ${selectedSlots.size}`;
    }

    // 2) When an image is chosen, only apply it to slots that are already selected
    document.getElementById("imageLoader").addEventListener("change", function (e) {
      const files = e.target.files;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = function (event) {
          const imgSrc = event.target.result;
          uploadedImages.push(imgSrc);

          // Add thumbnail to sidebar
          // Add thumbnail with delete button to sidebar
          const galleryItem = createGalleryItem({
            imgSrc,
            onClick: () => applyImageToSelected(imgSrc),
            removable: true,
            onRemove: () => {
              uploadedImages = uploadedImages.filter(src => src !== imgSrc);
            }
          });

          imageGallery.appendChild(galleryItem);


          // Immediately apply to whichever slots are currently selected
          applyImageToSelected(imgSrc);
        };
        reader.readAsDataURL(file);
      });
    });

    function applyImageTransform(img) {
      if (!img) return;
      const scale = parseFloat(img.dataset.scale || "1");
      const baseScale = parseFloat(img.dataset.baseScale || "1");
      const offsetX = parseFloat(img.dataset.offsetX || "0");
      const offsetY = parseFloat(img.dataset.offsetY || "0");
      img.style.left = `calc(50% + ${offsetX}px)`;
      img.style.top = `calc(50% + ${offsetY}px)`;
      img.style.transform = `translate(-50%, -50%) scale(${scale * baseScale})`;
    }

    function setImageBaseScale(img) {
      if (!img) return;
      const computeScale = () => {
        const slot = img.closest(".button-slot");
        const content = img.closest(".button-content");
        if (!slot) return;
        const slotSize = slot.clientWidth || 0;
        const contentSize = content ? content.clientWidth || 0 : 0;
        const targetSize = contentSize || slotSize;
        if (!img.naturalWidth || !img.naturalHeight || !targetSize) return;
        const widthScale = targetSize / img.naturalWidth;
        const heightScale = targetSize / img.naturalHeight;
        const fitScale = Math.max(widthScale, heightScale);
        img.dataset.baseScale = fitScale;
        applyImageTransform(img);
      };

      img.addEventListener("load", computeScale, { once: true });
      if (img.complete && img.naturalWidth) {
        computeScale();
      }
    }

    function applyImageToSelected(imgSrc) {
      // Only loop through currently-selected slots
      selectedSlots.forEach((slot) => {
        // Remove any old <img> inside this slot
        const content = slot.querySelector(".button-content");
        content
          .querySelectorAll("img.button-image")
          .forEach((oldImg) => oldImg.remove());
        const img = document.createElement("img");
        img.src = imgSrc;
        img.classList.add("button-image");
        const currentScale = parseFloat(imageScaleSlider.value) || 1;
        const currentOffsetX = parseFloat(document.getElementById("offsetX").value) || 0;
        const currentOffsetY = parseFloat(document.getElementById("offsetY").value) || 0;
        img.dataset.scale = currentScale;
        img.dataset.offsetX = currentOffsetX;
        img.dataset.offsetY = currentOffsetY;
        img.dataset.baseScale = "1";
        img.dataset.slotIndex = slot.dataset.index || "";
        applyImageTransform(img);
        content.appendChild(img);
        setImageBaseScale(img);
        imageMap.set(slot, { x: 0, y: 0, src: imgSrc });
      });
    }

    function updateOffsets() {
      const x = parseFloat(document.getElementById("offsetX").value) || 0;
      const y = parseFloat(document.getElementById("offsetY").value) || 0;
      selectedSlots.forEach((slot) => {
        const img = slot.querySelector(".button-content img.button-image");
        if (img) {
          img.dataset.offsetX = x;
          img.dataset.offsetY = y;
          applyImageTransform(img);
        }
      });
    }

    document.getElementById("offsetX").addEventListener("input", updateOffsets);
    document.getElementById("offsetY").addEventListener("input", updateOffsets);

    // Canvas zoom control (preview only)
    let userSetCanvasZoom = false;
    let zoomRaf = null;
    let pendingZoom = null;
    let baseCanvasWidth = 0;
    let baseCanvasHeight = 0;
    const desktopDefaultCanvasZoom = 1.2;
    const minCanvasZoom = 0.25;
    const maxCanvasZoom = 1.5;
    const mobileCanvasBreakpoint = 900;
    function measureBaseCanvas() {
      baseCanvasWidth = a4canvas.offsetWidth || 0;
      baseCanvasHeight = a4canvas.offsetHeight || 0;
    }
    const canUseCssZoom = typeof CSS !== "undefined" && CSS.supports("zoom", "1");
    function shouldAutoFitCanvasZoom() {
      return window.innerWidth <= mobileCanvasBreakpoint;
    }
    function setCanvasZoom(value) {
      pendingZoom = value;
      if (zoomRaf) cancelAnimationFrame(zoomRaf);
      zoomRaf = requestAnimationFrame(() => {
        const next = Math.max(minCanvasZoom, Math.min(maxCanvasZoom, pendingZoom));
        currentCanvasZoom = next;
        if (canvasZoomValue) {
          canvasZoomValue.innerText = next.toFixed(2) + "×";
        }
        if (canUseCssZoom) {
          a4canvas.style.zoom = String(next);
          a4canvas.style.transform = "none";
          if (canvasScale) {
            canvasScale.style.width = "";
            canvasScale.style.height = "";
          }
        } else {
          a4canvas.style.zoom = "";
          a4canvas.style.transform = `scale(${next})`;
          a4canvas.style.transformOrigin = "top left";
          if (canvasScale) {
            if (!baseCanvasWidth || !baseCanvasHeight) {
              measureBaseCanvas();
            }
            if (baseCanvasWidth && baseCanvasHeight) {
              canvasScale.style.width = `${baseCanvasWidth * next}px`;
              canvasScale.style.height = `${baseCanvasHeight * next}px`;
            }
          }
        }
        updateGridlines();
        centerCanvasInWrapper();
      });
    }

    function autoFitCanvasZoom() {
      if (!canvasWrapper) return;
      if (!baseCanvasWidth || !baseCanvasHeight) {
        measureBaseCanvas();
      }
      const baseWidth = baseCanvasWidth || 0;
      const baseHeight = baseCanvasHeight || 0;
      if (!baseWidth || !baseHeight) return;
      const availableWidth = canvasWrapper.clientWidth || baseWidth;
      const wrapperRect = canvasWrapper.getBoundingClientRect();
      const availableHeight = Math.max(200, window.innerHeight - wrapperRect.top - 20);
      const canUseLargeZoom =
        availableWidth >= baseWidth * 1.2 &&
        availableHeight >= baseHeight * 1.2;
      const fitZoom = Math.min(
        1,
        availableWidth / baseWidth,
        availableHeight / baseHeight
      );
      const targetZoom = canUseLargeZoom ? desktopDefaultCanvasZoom : fitZoom;
      const clamped = Math.max(minCanvasZoom, Math.min(maxCanvasZoom, targetZoom));
      if (canvasZoomSlider) {
        canvasZoomSlider.value = clamped.toFixed(2);
      }
      setCanvasZoom(clamped);
    }

    if (canvasZoomSlider) {
      const initialZoom = parseFloat(canvasZoomSlider.value) || 1;
      measureBaseCanvas();
      setCanvasZoom(initialZoom);
      canvasZoomSlider.addEventListener("input", (e) => {
        const zoom = parseFloat(e.target.value) || 1;
        userSetCanvasZoom = true;
        setCanvasZoom(zoom);
      });
    }

    function centerCanvasInWrapper() {
      if (!canvasWrapper || !canvasScale) return;
      const apply = () => {
        const targetLeft = Math.max(0, (canvasScale.scrollWidth - canvasWrapper.clientWidth) / 2);
        canvasWrapper.scrollLeft = targetLeft;
        canvasWrapper.scrollTop = 0;
      };
      requestAnimationFrame(apply);
    }

    // ================
    // SCALE SLIDER LOGIC
    // ================
    const scaleSlider = document.getElementById("scaleSlider");
    const scaleValueLabel = document.getElementById("scaleValue");

    scaleSlider.addEventListener("input", function (e) {
      const scale = parseFloat(e.target.value);
      scaleValueLabel.innerText = scale.toFixed(2) + "×";
      appliedCanvasScale = scale;
      document.querySelectorAll(".button-slot").forEach((slot) => {
        slot.dataset.slotScale = scale;
        slot.style.transform = `scale(${scale})`;
      });
      updateGridlines();
    });

    function resetButtonScale() {
      const defaultScale = 1;
      scaleSlider.value = defaultScale.toString();
      scaleValueLabel.innerText = "1.00×";
      appliedCanvasScale = defaultScale;
      document.querySelectorAll(".button-slot").forEach((slot) => {
        slot.dataset.slotScale = defaultScale;
        slot.style.transform = "scale(1)";
      });
      updateGridlines();
    }

    // =========================
    // 3) Export Log UI (on-page)
    // =========================
    let appliedCanvasScale = 1;
    const exportLogState = {
      open: false,
      text: ""
    };

    function ensureExportLogUI() {
      if (document.getElementById("exportLogPanel")) return;

      const panel = document.createElement("div");
      panel.id = "exportLogPanel";
      panel.innerHTML = `
        <div class="export-log__header">
          <strong>Export Log</strong>
          <button type="button" id="exportLogCopy">Copy</button>
          <button type="button" id="exportLogClose">Close</button>
        </div>
        <textarea id="exportLogText" readonly></textarea>
      `;
      document.body.appendChild(panel);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.id = "exportLogToggle";
      toggle.textContent = "Export Log";
      toggle.className = "small-reset";
      const controls = document.getElementById("controls");
      if (controls) {
        controls.appendChild(toggle);
      } else {
        document.body.appendChild(toggle);
      }

      const textArea = panel.querySelector("#exportLogText");
      const copyBtn = panel.querySelector("#exportLogCopy");
      const closeBtn = panel.querySelector("#exportLogClose");

      const sync = () => {
        panel.classList.toggle("open", exportLogState.open);
        if (textArea) {
          textArea.value = exportLogState.text || "";
        }
      };

      toggle.addEventListener("click", () => {
        exportLogState.open = !exportLogState.open;
        sync();
      });
      closeBtn.addEventListener("click", () => {
        exportLogState.open = false;
        sync();
      });
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(exportLogState.text || "");
        } catch (err) {
          // ignore clipboard errors
        }
      });

      sync();
    }

    function formatRect(rect) {
      if (!rect) return "null";
      return `x:${rect.x.toFixed(2)} y:${rect.y.toFixed(2)} w:${rect.width.toFixed(2)} h:${rect.height.toFixed(2)}`;
    }

    function getSlotWithImage(scope) {
      const slots = scope.querySelectorAll(".button-slot");
      for (const slot of slots) {
        const img = slot.querySelector(".button-content img.button-image");
        if (img) return slot;
      }
      return slots[0] || null;
    }

    function getExportMetrics(scope) {
      const canvasEl = scope && scope.nodeType === 1
        ? scope
        : scope && scope.querySelector
          ? scope.querySelector("#a4canvas")
          : null;
      if (!canvasEl) return null;
      const slot = getSlotWithImage(canvasEl);
      const content = slot ? slot.querySelector(".button-content") : null;
      const img = slot ? slot.querySelector(".button-content img.button-image") : null;
      const cutline = slot
        ? slot.querySelector(".overlay-cutline-custom[style*=\"display: block\"], .overlay-cutline-default[style*=\"display: block\"]")
        : canvasEl.querySelector(
        ".overlay-cutline-custom[style*=\"display: block\"], .overlay-cutline-default[style*=\"display: block\"]"
      );
      const bg = slot ? slot.querySelector(".button-bg-color") : null;
      const cutbox = slot ? slot.querySelector(".overlay-cutbox") : null;
      const outer = slot ? slot.querySelector(".overlay-outer") : null;
      const canvasStyle = canvasEl ? getComputedStyle(canvasEl) : null;
      return {
        canvasRect: canvasEl.getBoundingClientRect(),
        canvasScaleRect: canvasScale ? canvasScale.getBoundingClientRect() : null,
        canvasSize: {
          clientWidth: canvasEl.clientWidth,
          clientHeight: canvasEl.clientHeight,
          scrollWidth: canvasEl.scrollWidth,
          scrollHeight: canvasEl.scrollHeight
        },
        canvasStyle: canvasStyle
          ? {
              transform: canvasStyle.transform,
              transformOrigin: canvasStyle.transformOrigin,
              padding: canvasStyle.padding,
              gap: canvasStyle.gap
            }
          : null,
        wrapperRect: canvasWrapper ? canvasWrapper.getBoundingClientRect() : null,
        wrapperScroll: canvasWrapper
          ? { left: canvasWrapper.scrollLeft, top: canvasWrapper.scrollTop }
          : null,
        slotRect: slot ? slot.getBoundingClientRect() : null,
        contentRect: content ? content.getBoundingClientRect() : null,
        imgRect: img ? img.getBoundingClientRect() : null,
        cutlineRect: cutline ? cutline.getBoundingClientRect() : null,
        bgRect: bg ? bg.getBoundingClientRect() : null,
        cutboxRect: cutbox ? cutbox.getBoundingClientRect() : null,
        outerRect: outer ? outer.getBoundingClientRect() : null
      };
    }

    function setExportLog(lines) {
      exportLogState.text = lines.join("\n");
      exportLogState.open = true;
      const textArea = document.getElementById("exportLogText");
      const panel = document.getElementById("exportLogPanel");
      if (panel && textArea) {
        panel.classList.add("open");
        textArea.value = exportLogState.text;
      }
    }

    function rectCenter(rect) {
      if (!rect) return null;
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    function waitForImages(imgs) {
      const loadPromises = Array.from(imgs).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      });
      return Promise.all(loadPromises);
    }

    function waitForImage(img) {
      if (!img) return Promise.resolve();
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }

    async function getMonochromeLogoDataURL(img) {
      if (!img) return null;
      await waitForImage(img);
      if (!img.naturalWidth || !img.naturalHeight) return null;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a === 0) continue;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const bw = lum > 128 ? 255 : 0;
        data[i] = bw;
        data[i + 1] = bw;
        data[i + 2] = bw;
      }
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL("image/png");
    }

    function nextFrame() {
      return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    function captureCanvas(target) {
      return html2canvas(target, {
        scale: 2,
        useCORS: false,
        allowTaint: true,
        backgroundColor: null,
      });
    }

    function applyExportStyles(root, logoSource) {
      root.querySelectorAll(".button-slot").forEach((slot) => {
        slot.style.position = "relative";
        slot.style.transform = "none";
      });
      root.querySelectorAll(".checkbox").forEach((el) => {
        el.style.display = "none";
      });
      root.querySelectorAll(".overlay-inner, .overlay-middle").forEach((el) => {
        el.style.visibility = "hidden";
      });
      root.querySelectorAll(".overlay-outer").forEach((el) => {
        el.style.boxSizing = "border-box";
        el.style.border = "1px solid #000";
        el.style.borderRadius = "50%";
        el.style.background = "transparent";
        el.style.zIndex = "0";
      });
      root.querySelectorAll(".overlay-cutline-default, .overlay-cutline-custom").forEach((el) => {
        if (el.style.display !== "none") {
          el.style.boxSizing = "border-box";
          el.style.border = "1px solid #000";
          el.style.borderRadius = "50%";
          el.style.background = "transparent";
          el.style.zIndex = "15";
        }
      });
      root.querySelectorAll(".button-slot").forEach((slot) => {
        slot.classList.remove("selected");
      });

      const cloneLogo = root.querySelector("#logo");
      if (cloneLogo && logoSource && logoSource.naturalWidth) {
        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");
        tempCanvas.width = logoSource.naturalWidth;
        tempCanvas.height = logoSource.naturalHeight;
        ctx.drawImage(logoSource, 0, 0);
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
        cloneLogo.src = tempCanvas.toDataURL();
      }
    }

    function lockClonePixelLayout(cloneRoot) {
      const liveStyle = getComputedStyle(a4canvas);
      cloneRoot.style.width = `${a4canvas.clientWidth}px`;
      cloneRoot.style.height = `${a4canvas.clientHeight}px`;
      cloneRoot.style.padding = liveStyle.padding;
      cloneRoot.style.gap = liveStyle.gap;
      cloneRoot.style.boxSizing = "border-box";

      const liveSlots = Array.from(a4canvas.querySelectorAll(".button-slot"));
      liveSlots.forEach((liveSlot) => {
        const idx = liveSlot.dataset.index;
        const cloneSlot = cloneRoot.querySelector(`.button-slot[data-index="${idx}"]`);
        if (!cloneSlot) return;
        const rect = liveSlot.getBoundingClientRect();
        cloneSlot.style.width = `${rect.width}px`;
        cloneSlot.style.height = `${rect.height}px`;
      });
    }

    // =========================
    // 4) Export Helpers
    // =========================

    function applyExportCanvasStyles(cloneRoot) {
      const liveStyle = getComputedStyle(a4canvas);
      const props = [
        "width",
        "height",
        "display",
        "grid-template-columns",
        "grid-template-rows",
        "gap",
        "padding",
        "box-sizing",
        "background",
        "position",
        "overflow"
      ];
      props.forEach((prop) => {
        cloneRoot.style.setProperty(prop, liveStyle.getPropertyValue(prop));
      });
    }

    function recomputeCloneImageScales(root) {
      root.querySelectorAll(".button-content img.button-image").forEach((img) => {
        const content = img.closest(".button-content");
        const slot = img.closest(".button-slot");
        const slotIndex = slot ? slot.dataset.index : null;
        const liveSlot = slotIndex ? a4canvas.querySelector(`.button-slot[data-index="${slotIndex}"]`) : null;
        const liveSlotRect = liveSlot ? liveSlot.getBoundingClientRect() : null;
        const cloneSlotRect = slot ? slot.getBoundingClientRect() : null;
        const scaleRatio =
          liveSlotRect && cloneSlotRect && liveSlotRect.width
            ? cloneSlotRect.width / liveSlotRect.width
            : 1;

        const targetSize = content ? content.clientWidth || 0 : 0;
        if (!img.naturalWidth || !img.naturalHeight || !targetSize) return;
        const widthScale = targetSize / img.naturalWidth;
        const heightScale = targetSize / img.naturalHeight;
        const fitScale = Math.max(widthScale, heightScale);
        img.dataset.baseScale = String(fitScale);
        const scale = parseFloat(img.dataset.scale || "1");
        const offsetX = parseFloat(img.dataset.offsetX || "0") * scaleRatio;
        const offsetY = parseFloat(img.dataset.offsetY || "0") * scaleRatio;
        img.style.left = `calc(50% + ${offsetX}px)`;
        img.style.top = `calc(50% + ${offsetY}px)`;
        img.style.transform = `translate(-50%, -50%) scale(${scale * fitScale})`;
      });
    }

    function freezeExportLayout(rememberStyle) {
      const slots = a4canvas.querySelectorAll(".button-slot");
      slots.forEach((slot) => {
        const slotRect = slot.getBoundingClientRect();
        if (!slotRect.width || !slotRect.height) return;
        const targets = slot.querySelectorAll(
          ".button-content, .button-content img.button-image, .button-bg-color, .overlay-cutbox, .overlay-outer, .overlay-inner, .overlay-middle, .overlay-cutline-default, .overlay-cutline-custom"
        );
        targets.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (!rect.width && !rect.height) return;
          rememberStyle(el);
          const left = rect.left - slotRect.left;
          const top = rect.top - slotRect.top;
          el.style.inset = "auto";
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          el.style.right = "auto";
          el.style.bottom = "auto";
          el.style.width = `${rect.width}px`;
          el.style.height = `${rect.height}px`;
          el.style.transform = "none";
        });
      });
    }

    function freezeExportLayoutForRoot(root, rememberStyle) {
      const slots = root.querySelectorAll(".button-slot");
      slots.forEach((slot) => {
        const slotRect = slot.getBoundingClientRect();
        if (!slotRect.width || !slotRect.height) return;
        const targets = slot.querySelectorAll(
          ".button-content, .button-content img.button-image, .button-bg-color, .overlay-cutbox, .overlay-outer, .overlay-inner, .overlay-middle, .overlay-cutline-default, .overlay-cutline-custom"
        );
        targets.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (!rect.width && !rect.height) return;
          if (rememberStyle) {
            rememberStyle(el);
          }
          const left = rect.left - slotRect.left;
          const top = rect.top - slotRect.top;
          el.style.inset = "auto";
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          el.style.right = "auto";
          el.style.bottom = "auto";
          el.style.width = `${rect.width}px`;
          el.style.height = `${rect.height}px`;
          el.style.transform = "none";
        });
      });
    }

    function exportSheet(kind) {
      const imgs = a4canvas.querySelectorAll("img");
      const acmeLogo = document.getElementById("logo");
      waitForImages(imgs).then(async () => {
        const exportScale = Math.min(8, Math.max(4, Math.ceil(window.devicePixelRatio || 1)));
        const originalLogoSrc = acmeLogo ? acmeLogo.getAttribute("src") : null;
        const bwDataUrl = await getMonochromeLogoDataURL(acmeLogo);
        const exportWidth = a4canvas.scrollWidth || a4canvas.clientWidth;
        const exportHeight = a4canvas.scrollHeight || a4canvas.clientHeight;

        if (acmeLogo && bwDataUrl) {
          acmeLogo.setAttribute("src", bwDataUrl);
          await waitForImage(acmeLogo);
        }

        html2canvas(a4canvas, {
          scale: exportScale,
          useCORS: false,
          allowTaint: true,
          backgroundColor: null,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: exportWidth,
          height: exportHeight,
          windowWidth: exportWidth,
          windowHeight: exportHeight,
          onclone: (clonedDoc) => {
            const clonedCanvas = clonedDoc.getElementById("a4canvas");
            if (!clonedCanvas) return;

            clonedCanvas.style.transform = "none";
            clonedCanvas.style.zoom = "1";
            clonedCanvas.style.transformOrigin = "top left";
            clonedCanvas.style.transition = "none";

            applyExportStyles(clonedCanvas, acmeLogo);
            freezeExportLayoutForRoot(clonedCanvas);

            const clonedLogo = clonedCanvas.querySelector("#logo");
            if (clonedLogo && bwDataUrl) {
              clonedLogo.setAttribute("src", bwDataUrl);
            }
          }
        })
          .then((canvas) => {
            if (kind === "pdf") {
              const imgData = canvas.toDataURL("image/png");
              const pdf = new window.jspdf.jsPDF({
                orientation: "p",
                unit: "mm",
                format: "a4"
              });
              pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
              pdf.save("ⒶCME-button-sheet.pdf");
              return null;
            }
            return new Promise((resolve) => {
              canvas.toBlob((blob) => {
                if (!blob) {
                  const dataUrl = canvas.toDataURL("image/png");
                  const link = document.createElement("a");
                  link.download = "ⒶCME-button-sheet.png";
                  link.href = dataUrl;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  resolve();
                  return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.download = "ⒶCME-button-sheet.png";
                link.href = url;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                resolve();
              }, "image/png");
            });
          })
          .finally(async () => {
            if (acmeLogo && originalLogoSrc) {
              acmeLogo.setAttribute("src", originalLogoSrc);
              await waitForImage(acmeLogo);
            }
          });
      });
    }

    function exportToPNG() {
      exportSheet("png");
    }

    function exportToPDF() {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library failed to load. Please refresh and try again.");
        return;
      }
      exportSheet("pdf");
    }
    const imageScaleSlider = document.getElementById("imageScaleSlider");
    const imageScaleValue = document.getElementById("imageScaleValue");

    function resetImageAdjustments() {
      const defaultOffset = "0";
      const defaultScale = "1";
      const offsetXInput = document.getElementById("offsetX");
      const offsetYInput = document.getElementById("offsetY");

      offsetXInput.value = defaultOffset;
      offsetYInput.value = defaultOffset;
      imageScaleSlider.value = defaultScale;
      imageScaleValue.innerText = "1.00×";

      if (!selectedSlots.size) {
        return; // no selection, just prep inputs for the next selection
      }

      selectedSlots.forEach((slot) => {
        const img = slot.querySelector(".button-content img.button-image");
        if (img) {
          img.dataset.offsetX = defaultOffset;
          img.dataset.offsetY = defaultOffset;
          img.dataset.scale = defaultScale;
          applyImageTransform(img);
        }
      });
    }

    imageScaleSlider.addEventListener("input", function (e) {
      const scale = parseFloat(e.target.value);
      imageScaleValue.innerText = scale.toFixed(2) + "×";

      // Apply scale transform to each selected image
      selectedSlots.forEach((slot) => {
        const img = slot.querySelector(".button-content img.button-image");
        if (img) {
          img.dataset.scale = scale;
          applyImageTransform(img);
        }
      });
    });
    // Ensure there is no base transform so export matches preview
    window.addEventListener("load", () => {
      const scaleSlider = document.getElementById("scaleSlider");
      const scaleValueLabel = document.getElementById("scaleValue");
      scaleSlider.value = "1";
      scaleValueLabel.innerText = "1.00×";
      document.querySelectorAll(".button-slot").forEach((slot) => {
        slot.style.transform = "scale(1)";
      });

      const imageScaleSlider = document.getElementById("imageScaleSlider");
      const imageScaleValue = document.getElementById("imageScaleValue");
      imageScaleSlider.value = "1";
      imageScaleValue.innerText = "1.00×";
      updateGridlines();
    });

    preloadStandardImages();
    // ensureExportLogUI();

    window.addEventListener("load", () => {
      if (!userSetCanvasZoom) {
        if (shouldAutoFitCanvasZoom()) {
          autoFitCanvasZoom();
        } else {
          if (canvasZoomSlider) {
            canvasZoomSlider.value = desktopDefaultCanvasZoom.toFixed(2);
          }
          setCanvasZoom(desktopDefaultCanvasZoom);
        }
      }
      updateGridlines();
      if (canvasWrapper && canvasScale) {
        const targetLeft = Math.max(0, (canvasScale.scrollWidth - canvasWrapper.clientWidth) / 2);
        canvasWrapper.scrollLeft = targetLeft;
        canvasWrapper.scrollTop = 0;
      }
    });

    window.addEventListener("resize", () => {
      if (!userSetCanvasZoom) {
        if (shouldAutoFitCanvasZoom()) {
          autoFitCanvasZoom();
        } else {
          if (canvasZoomSlider) {
            canvasZoomSlider.value = desktopDefaultCanvasZoom.toFixed(2);
          }
          setCanvasZoom(desktopDefaultCanvasZoom);
        }
      }
      measureBaseCanvas();
      setCanvasZoom(currentCanvasZoom || 1);
      updateGridlines();
      centerCanvasInWrapper();
    });

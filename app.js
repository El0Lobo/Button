
    const maxCols = 5;
    const maxRows = 6;
    const totalButtons = maxCols * maxRows;
    const a4canvas = document.getElementById("a4canvas");
    const canvasWrapper = document.getElementById("canvasWrapper");
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

    // 1) Build the 5×6 grid of button-slot DIVs
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
      galleryImg.addEventListener("click", onClick);

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

    function updateBackgroundFillSizes() {
      const diameter = getActiveFillDiameterMm();
      document.querySelectorAll(".button-slot .button-bg-color").forEach((bg) => {
        bg.style.width = `${diameter}mm`;
        bg.style.height = `${diameter}mm`;
        bg.style.left = "50%";
        bg.style.top = "50%";
        bg.style.transform = "translate(-50%, -50%)";
      });
    }

    function updateButtonContentSizes() {
      const diameter = getActiveMaskDiameterMm();
      document.querySelectorAll(".button-slot .button-content").forEach((content) => {
        if (diameter === defaultCutlineDiameterMm) {
          content.style.inset = "";
          content.style.width = "";
          content.style.height = "";
          content.style.left = "";
          content.style.top = "";
          content.style.transform = "";
          return;
        }
        content.style.inset = "auto";
        content.style.width = `${diameter}mm`;
        content.style.height = `${diameter}mm`;
        content.style.left = "50%";
        content.style.top = "50%";
        content.style.transform = "translate(-50%, -50%)";
      });
    }

    function updateImageBaseScales() {
      document.querySelectorAll(".button-content img.button-image").forEach((img) => {
        img.dataset.baseScale = "1";
        setImageBaseScale(img);
      });
    }

    function updateCutboxSizes() {
      const diameter = getActiveCutlineDiameterMm();
      document.querySelectorAll(".overlay-cutbox").forEach((box) => {
        box.style.width = `${diameter}mm`;
        box.style.height = `${diameter}mm`;
        box.style.left = "50%";
        box.style.top = "50%";
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
      updateImageBaseScales();
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
        if (!slot) return;
        const slotSize = slot.clientWidth || 0;
        if (!img.naturalWidth || !img.naturalHeight || !slotSize) return;
        const widthScale = slotSize / img.naturalWidth;
        const heightScale = slotSize / img.naturalHeight;
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
    function setCanvasZoom(value) {
      currentCanvasZoom = value;
      if (canvasZoomValue) {
        canvasZoomValue.innerText = value.toFixed(2) + "×";
      }
      a4canvas.style.transform = `scale(${value})`;
      updateGridlines();
    }

    function autoFitCanvasZoom() {
      if (!canvasWrapper) return;
      const baseWidth = a4canvas.offsetWidth || 0;
      const baseHeight = a4canvas.offsetHeight || 0;
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
      const targetZoom = canUseLargeZoom ? 1.2 : fitZoom;
      const clamped = Math.max(0.5, Math.min(1.5, targetZoom));
      if (canvasZoomSlider) {
        canvasZoomSlider.value = clamped.toFixed(2);
      }
      setCanvasZoom(clamped);
    }

    if (canvasZoomSlider) {
      const initialZoom = parseFloat(canvasZoomSlider.value) || 1;
      setCanvasZoom(initialZoom);
      canvasZoomSlider.addEventListener("input", (e) => {
        const zoom = parseFloat(e.target.value) || 1;
        userSetCanvasZoom = true;
        setCanvasZoom(zoom);
      });
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

    // 3) Export to PNG
    let appliedCanvasScale = 1;
    function logExportState(label, root) {
      const scope = root || document;
      const canvas = scope.querySelector ? scope.querySelector("#a4canvas") : null;
      const firstSlot = scope.querySelector ? scope.querySelector(".button-slot") : null;
      const firstContent = scope.querySelector ? scope.querySelector(".button-content") : null;
      const firstImg = scope.querySelector ? scope.querySelector(".button-content img.button-image") : null;
      console.groupCollapsed(`[export] ${label}`);
      console.log("cutlineCustom", !!customCutlineToggle?.checked, "diameter", customCutlineDiameter?.value);
      console.log("inkSaver", !!inkSaverToggle?.checked, "buttonScale", scaleSlider?.value, "canvasZoom", canvasZoomSlider?.value);
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        console.log("canvas", { width: rect.width, height: rect.height });
      }
      if (firstSlot) {
        const rect = firstSlot.getBoundingClientRect();
        console.log("slot", { width: rect.width, height: rect.height, transform: firstSlot.style.transform });
      }
      if (firstContent) {
        const rect = firstContent.getBoundingClientRect();
        console.log("content", { width: rect.width, height: rect.height, inset: firstContent.style.inset });
      }
      if (firstImg) {
        const rect = firstImg.getBoundingClientRect();
        console.log("img", {
          width: rect.width,
          height: rect.height,
          left: firstImg.style.left,
          top: firstImg.style.top,
          transform: firstImg.style.transform,
          baseScale: firstImg.dataset.baseScale,
          scale: firstImg.dataset.scale,
          offsetX: firstImg.dataset.offsetX,
          offsetY: firstImg.dataset.offsetY
        });
      }
      console.groupEnd();
    }
    function exportToPNG() {
      const imgs = a4canvas.querySelectorAll("img");
      const acmeLogo = document.getElementById("logo");

      const loadPromises = Array.from(imgs).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      });

      Promise.all(loadPromises).then(() => {
        // Hide UI helpers that should not appear in export
        const hiddenCheck = [];
        document.querySelectorAll(".checkbox").forEach((el) => {
          hiddenCheck.push(el);
          el.style.display = "none";
        });

        const hiddenOverlayHelpers = [];
        document.querySelectorAll(".overlay-inner, .overlay-middle").forEach((el) => {
          hiddenOverlayHelpers.push(el);
          el.style.visibility = "hidden";
        });

        const outerRingTweaks = [];
        document.querySelectorAll(".overlay-outer").forEach((el) => {
          outerRingTweaks.push({ el, cssText: el.style.cssText });
          el.style.boxSizing = "border-box";
          el.style.border = "1px solid #000";
          el.style.borderRadius = "50%";
          el.style.background = "transparent";
          el.style.zIndex = "0";
        });

        const topCutlineTweaks = [];
        document.querySelectorAll(".overlay-cutline-default, .overlay-cutline-custom").forEach((el) => {
          topCutlineTweaks.push({ el, cssText: el.style.cssText });
          if (el.style.display !== "none") {
            el.style.boxSizing = "border-box";
            el.style.border = "1px solid #000";
            el.style.borderRadius = "50%";
            el.style.background = "transparent";
            el.style.zIndex = "15";
          }
        });

        document.querySelectorAll(".button-slot").forEach((slot) => {
          slot.classList.remove("selected");
        });

        // === Convert logo to grayscale ===
        const logoClone = acmeLogo.cloneNode();
        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");
        tempCanvas.width = acmeLogo.naturalWidth;
        tempCanvas.height = acmeLogo.naturalHeight;
        ctx.drawImage(acmeLogo, 0, 0);
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
        acmeLogo.src = tempCanvas.toDataURL();

        acmeLogo.onload = () => {
          const prevCanvasTransform = a4canvas.style.transform;
          const prevCanvasTransformOrigin = a4canvas.style.transformOrigin;
          a4canvas.style.transform = "none";
          a4canvas.style.transformOrigin = "top left";
          const exportScale = 3.125; // 300 DPI relative to 96 CSS PPI
          html2canvas(a4canvas, {
            scale: exportScale,
            useCORS: false,
            allowTaint: true,
            backgroundColor: null,
            onclone: (clonedDoc) => {
              const clonedCanvas = clonedDoc.getElementById("a4canvas");
              if (clonedCanvas) {
                clonedCanvas.style.transform = "none";
                clonedCanvas.style.transformOrigin = "top left";
              }
              clonedDoc.querySelectorAll(".button-content img.button-image").forEach((img) => {
                const scale = parseFloat(img.dataset.scale || "1");
                const baseScale = parseFloat(img.dataset.baseScale || "1");
                const offsetX = parseFloat(img.dataset.offsetX || "0");
                const offsetY = parseFloat(img.dataset.offsetY || "0");
                img.style.left = "50%";
                img.style.top = "50%";
                img.style.transform = `translate(${offsetX}px, ${offsetY}px) translate(-50%, -50%) scale(${scale * baseScale})`;
              });
            },
          })
            .then((canvas) => {
              const link = document.createElement("a");
              link.download = "ⒶCME-button-sheet.png";
              link.href = canvas.toDataURL("image/png");
              link.click();
            })
            .finally(() => {
              a4canvas.style.transform = prevCanvasTransform;
              a4canvas.style.transformOrigin = prevCanvasTransformOrigin;
              acmeLogo.replaceWith(logoClone);
              hiddenCheck.forEach((el) => (el.style.display = ""));
              hiddenOverlayHelpers.forEach((el) => (el.style.visibility = ""));
              outerRingTweaks.forEach(({ el, cssText }) => {
                el.style.cssText = cssText;
              });
              topCutlineTweaks.forEach(({ el, cssText }) => {
                el.style.cssText = cssText;
              });
            });
        };
      });
    }

    function exportToPDF() {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library failed to load. Please refresh and try again.");
        return;
      }
      const imgs = a4canvas.querySelectorAll("img");
      const acmeLogo = document.getElementById("logo");

      const loadPromises = Array.from(imgs).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      });

      Promise.all(loadPromises).then(() => {
        // Hide UI helpers that should not appear in export
        const hiddenCheck = [];
        document.querySelectorAll(".checkbox").forEach((el) => {
          hiddenCheck.push(el);
          el.style.display = "none";
        });

        const hiddenOverlayHelpers = [];
        document.querySelectorAll(".overlay-inner, .overlay-middle").forEach((el) => {
          hiddenOverlayHelpers.push(el);
          el.style.visibility = "hidden";
        });

        const outerRingTweaks = [];
        document.querySelectorAll(".overlay-outer").forEach((el) => {
          outerRingTweaks.push({ el, cssText: el.style.cssText });
          el.style.boxSizing = "border-box";
          el.style.border = "1px solid #000";
          el.style.borderRadius = "50%";
          el.style.background = "transparent";
          el.style.zIndex = "0";
        });

        const topCutlineTweaks = [];
        document.querySelectorAll(".overlay-cutline").forEach((el) => {
          topCutlineTweaks.push({ el, cssText: el.style.cssText });
          if (el.style.display !== "none") {
            el.style.boxSizing = "border-box";
            el.style.border = "1px solid #000";
            el.style.borderRadius = "50%";
            el.style.background = "transparent";
            el.style.zIndex = "15";
          }
        });

        document.querySelectorAll(".button-slot").forEach((slot) => {
          slot.classList.remove("selected");
        });

        // === Convert logo to grayscale ===
        const logoClone = acmeLogo.cloneNode();
        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");
        tempCanvas.width = acmeLogo.naturalWidth;
        tempCanvas.height = acmeLogo.naturalHeight;
        ctx.drawImage(acmeLogo, 0, 0);
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
        acmeLogo.src = tempCanvas.toDataURL();

        acmeLogo.onload = () => {
          const prevCanvasTransform = a4canvas.style.transform;
          const prevCanvasTransformOrigin = a4canvas.style.transformOrigin;
          a4canvas.style.transform = "none";
          a4canvas.style.transformOrigin = "top left";
          const exportScale = 3.125; // 300 DPI relative to 96 CSS PPI
          html2canvas(a4canvas, {
            scale: exportScale,
            useCORS: false,
            allowTaint: true,
            backgroundColor: null,
            onclone: (clonedDoc) => {
              const clonedCanvas = clonedDoc.getElementById("a4canvas");
              if (clonedCanvas) {
                clonedCanvas.style.transform = "none";
                clonedCanvas.style.transformOrigin = "top left";
              }
              clonedDoc.querySelectorAll(".button-content img.button-image").forEach((img) => {
                const scale = parseFloat(img.dataset.scale || "1");
                const baseScale = parseFloat(img.dataset.baseScale || "1");
                const offsetX = parseFloat(img.dataset.offsetX || "0");
                const offsetY = parseFloat(img.dataset.offsetY || "0");
                img.style.left = "50%";
                img.style.top = "50%";
                img.style.transform = `translate(${offsetX}px, ${offsetY}px) translate(-50%, -50%) scale(${scale * baseScale})`;
              });
            },
          })
            .then((canvas) => {
              const imgData = canvas.toDataURL("image/png");
              const pdf = new window.jspdf.jsPDF({
                orientation: "p",
                unit: "mm",
                format: "a4"
              });
              pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
              pdf.save("ⒶCME-button-sheet.pdf");
            })
            .finally(() => {
              a4canvas.style.transform = prevCanvasTransform;
              a4canvas.style.transformOrigin = prevCanvasTransformOrigin;
              acmeLogo.replaceWith(logoClone);
              hiddenCheck.forEach((el) => (el.style.display = ""));
              hiddenOverlayHelpers.forEach((el) => (el.style.visibility = ""));
              outerRingTweaks.forEach(({ el, cssText }) => {
                el.style.cssText = cssText;
              });
              topCutlineTweaks.forEach(({ el, cssText }) => {
                el.style.cssText = cssText;
              });
            });
        };
      });
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

    window.addEventListener("load", () => {
      if (!userSetCanvasZoom) {
        autoFitCanvasZoom();
      }
      updateGridlines();
    });

    window.addEventListener("resize", () => {
      if (!userSetCanvasZoom) {
        autoFitCanvasZoom();
      }
      updateGridlines();
    });

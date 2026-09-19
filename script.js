
// =========================================
// COMPRESSIFY JAVASCRIPT
// =========================================


// ---------- GLOBAL VARIABLES ----------

let selectedFile = null;
let outputUrl = null;


// ---------- ELEMENTS ----------

const fileType = document.getElementById("fileType");
const fileInput = document.getElementById("fileInput");
const uploadBox = document.getElementById("uploadBox");

const imageSettings = document.getElementById("imageSettings");
const pdfSettings = document.getElementById("pdfSettings");

const selectedFileBox = document.getElementById("selectedFile");
const fileName = document.getElementById("fileName");
const removeFileBtn = document.getElementById("removeFileBtn");

const compressBtn = document.getElementById("compressBtn");

const statusMessage = document.getElementById("statusMessage");

const progressContainer = document.getElementById("progressContainer");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

const resultSection = document.getElementById("resultSection");

const originalSize = document.getElementById("originalSize");
const compressedSize = document.getElementById("compressedSize");
const savingPercentage = document.getElementById("savingPercentage");

const resultNote = document.getElementById("resultNote");
const downloadBtn = document.getElementById("downloadBtn");


// =========================================
// HELPER FUNCTIONS
// =========================================


// Convert bytes into readable format
function formatFileSize(bytes) {

  if (bytes < 1024) {
    return bytes + " B";
  }

  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(2) + " MB";

}


// Calculate percentage reduction
function calculateSavings(original, compressed) {

  if (original <= 0) {
    return 0;
  }

  return ((original - compressed) / original) * 100;

}


// Release an object URL
function revokeOutputUrl() {

  if (outputUrl) {

    URL.revokeObjectURL(outputUrl);

    outputUrl = null;

  }

}


// Display status
function showStatus(message, type = "") {

  statusMessage.textContent = message;

  statusMessage.className = "status-message";

  if (type) {
    statusMessage.classList.add(type);
  }

}


// Show progress
function showProgress(message, percentage = 0) {

  progressContainer.hidden = false;

  progressText.textContent = message;

  progressFill.style.width = percentage + "%";

}


// Hide progress
function hideProgress() {

  progressContainer.hidden = true;

  progressFill.style.width = "0%";

}


// Reset result
function resetResult() {

  resultSection.hidden = true;

  originalSize.textContent = "-";
  compressedSize.textContent = "-";
  savingPercentage.textContent = "-";

  resultNote.textContent = "";

  downloadBtn.removeAttribute("href");

}


// =========================================
// FILE TYPE CHANGE
// =========================================

fileType.addEventListener("change", function () {

  resetFile();

  const selectedType = fileType.value;

  if (selectedType === "image") {

    imageSettings.hidden = false;
    pdfSettings.hidden = true;

    fileInput.accept =
      "image/jpeg,image/png,image/webp";

  } else {

    imageSettings.hidden = true;
    pdfSettings.hidden = false;

    fileInput.accept = "application/pdf";

  }

});


// =========================================
// FILE SELECTION
// =========================================

fileInput.addEventListener("change", function () {

  const file = fileInput.files[0];

  if (!file) {
    return;
  }

  handleFile(file);

});


// Handle selected file
function handleFile(file) {

  const type = fileType.value;

  const isValidImage =
    type === "image" &&
    ["image/jpeg", "image/png", "image/webp"].includes(file.type);

  const isValidPdf =
    type === "pdf" &&
    file.type === "application/pdf";

  if (!isValidImage && !isValidPdf) {

    showStatus(
      "Please choose a valid " + type.toUpperCase() + " file.",
      "error"
    );

    return;

  }


  // Maximum 20 MB
  if (file.size > 20 * 1024 * 1024) {

    showStatus(
      "File size must be 20 MB or smaller.",
      "error"
    );

    return;

  }


  selectedFile = file;

  fileName.textContent =
    file.name + " (" + formatFileSize(file.size) + ")";

  selectedFileBox.classList.add("active");

  resetResult();

  showStatus("File selected successfully.", "success");

}


// =========================================
// REMOVE FILE
// =========================================

removeFileBtn.addEventListener("click", function () {

  resetFile();

});


// Reset file
function resetFile() {

  selectedFile = null;

  fileInput.value = "";

  fileName.textContent = "No file selected";

  selectedFileBox.classList.remove("active");

  resetResult();

  hideProgress();

  showStatus("");

  revokeOutputUrl();

}


// =========================================
// DRAG AND DROP
// =========================================

uploadBox.addEventListener("dragover", function (event) {

  event.preventDefault();

  uploadBox.classList.add("dragover");

});


uploadBox.addEventListener("dragleave", function () {

  uploadBox.classList.remove("dragover");

});


uploadBox.addEventListener("drop", function (event) {

  event.preventDefault();

  uploadBox.classList.remove("dragover");

  const file = event.dataTransfer.files[0];

  if (!file) {
    return;
  }

  handleFile(file);

});


// =========================================
// COMPRESS BUTTON
// =========================================

compressBtn.addEventListener("click", async function () {

  if (!selectedFile) {

    showStatus(
      "Please choose a file first.",
      "error"
    );

    return;

  }

  compressBtn.disabled = true;

  compressBtn.textContent = "Processing...";

  resetResult();

  showStatus("");

  try {

    let result;

    if (fileType.value === "image") {

      showProgress("Compressing image...", 30);

      result = await processImage(selectedFile);

    } else {

      showProgress("Processing PDF...", 30);

      result = await processPdf(selectedFile);

    }

    showProgress("Preparing download...", 100);

    displayResult(result);

    showStatus(
      "Processing completed successfully.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showStatus(
      error.message || "Something went wrong.",
      "error"
    );

  } finally {

    compressBtn.disabled = false;

    compressBtn.textContent = "Compress File";

    hideProgress();

  }

});


// =========================================
// IMAGE PROCESSING
// =========================================

function processImage(file) {

  return new Promise((resolve, reject) => {

    const image = new Image();

    const imageUrl = URL.createObjectURL(file);

    image.onload = function () {

      try {

        let width = image.naturalWidth;
        let height = image.naturalHeight;

        const maxWidthValue =
          document.getElementById("maxWidth").value;

        const maxWidth =
          maxWidthValue === "original"
            ? width
            : Number(maxWidthValue);


        // Maintain image aspect ratio
        if (width > maxWidth) {

          height = Math.round(
            height * maxWidth / width
          );

          width = maxWidth;

        }


        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {

          throw new Error("Canvas is not supported.");

        }


        const format =
          document.getElementById("imageFormat").value;

        const quality =
          Number(document.getElementById("quality").value);


        // White background for JPEG
        if (format === "image/jpeg") {

          context.fillStyle = "#ffffff";

          context.fillRect(
            0,
            0,
            width,
            height
          );

        }


        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );


        // PNG quality is not generally controlled
        // by Canvas toBlob.
        const outputQuality =
          format === "image/png"
            ? undefined
            : quality;


        canvas.toBlob(
          function (blob) {

            URL.revokeObjectURL(imageUrl);

            if (!blob) {

              reject(
                new Error("Image compression failed.")
              );

              return;

            }

            resolve({

              blob: blob,

              originalSize: file.size,

              note:
                "Image resized and encoded using Canvas."

            });

          },
          format,
          outputQuality
        );


      } catch (error) {

        URL.revokeObjectURL(imageUrl);

        reject(error);

      }

    };


    image.onerror = function () {

      URL.revokeObjectURL(imageUrl);

      reject(
        new Error("Unable to read the image.")
      );

    };


    image.src = imageUrl;

  });

}


// =========================================
// PDF PROCESSING
// =========================================

// Important:
// This creates a new PDF by copying pages.
// It is not a full embedded-image compressor.

async function processPdf(file) {

  if (!window.PDFLib) {

    throw new Error(
      "PDF library is not loaded. Check your internet connection."
    );

  }


  const inputBytes = await file.arrayBuffer();


  const inputPdf =
    await PDFLib.PDFDocument.load(inputBytes);


  const outputPdf =
    await PDFLib.PDFDocument.create();


  const pageIndices =
    inputPdf.getPageIndices();


  const copiedPages =
    await outputPdf.copyPages(
      inputPdf,
      pageIndices
    );


  copiedPages.forEach(function (page) {

    outputPdf.addPage(page);

  });


  const outputBytes =
    await outputPdf.save({

      useObjectStreams: true,

      addDefaultPage: false

    });


  const blob = new Blob(
    [outputBytes],
    { type: "application/pdf" }
  );


  return {

    blob: blob,

    originalSize: file.size,

    note:
      "PDF pages were copied into a new PDF. Embedded images were not recompressed."

  };

}


// =========================================
// DISPLAY RESULT
// =========================================

function displayResult(result) {

  const blob = result.blob;

  const original = result.originalSize;

  const compressed = blob.size;


  revokeOutputUrl();

  outputUrl = URL.createObjectURL(blob);


  const savings =
    calculateSavings(original, compressed);


  originalSize.textContent =
    formatFileSize(original);


  compressedSize.textContent =
    formatFileSize(compressed);


  if (savings > 0) {

    savingPercentage.textContent =
      savings.toFixed(2) + "% smaller";

  } else if (savings < 0) {

    savingPercentage.textContent =
      Math.abs(savings).toFixed(2) + "% larger";

  } else {

    savingPercentage.textContent =
      "No change";

  }


  resultNote.textContent = result.note;


  // Filename
  const isPdf = fileType.value === "pdf";

  const extension = isPdf
    ? "pdf"
    : document.getElementById("imageFormat").value === "image/webp"
      ? "webp"
      : document.getElementById("imageFormat").value === "image/png"
        ? "png"
        : "jpg";


  downloadBtn.href = outputUrl;

  downloadBtn.download =
    "compressed-file." + extension;


  downloadBtn.textContent =
    isPdf
      ? "Download Processed PDF"
      : "Download Compressed Image";


  resultSection.hidden = false;

}


// =========================================
// MOBILE NAVIGATION
// =========================================

const menuBtn = document.getElementById("menuBtn");

const navMenu = document.getElementById("navMenu");


menuBtn.addEventListener("click", function () {

  navMenu.classList.toggle("open");

});


navMenu.querySelectorAll("a").forEach(function (link) {

  link.addEventListener("click", function () {

    navMenu.classList.remove("open");

  });

});


// =========================================
// CLEANUP
// =========================================

window.addEventListener("beforeunload", function () {

  revokeOutputUrl();

});
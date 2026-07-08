// Elements
const form = document.getElementById('config-form');
const bookWidthInput = document.getElementById('book-width');
const bookHeightInput = document.getElementById('book-height');
const paperTypeInput = document.getElementById('paper-type');
const pageCountInput = document.getElementById('page-count');
const hasFlapInput = document.getElementById('has-flap');
const flapSizeGroup = document.getElementById('flap-size-group');
const flapSizeInput = document.getElementById('flap-size');
const flapError = document.getElementById('flap-error'); // Novo: Elemento de mensagem de erro

const spineWidthDisplay = document.getElementById('spine-width-display');
const totalWidthDisplay = document.getElementById('total-width-display');
const totalHeightDisplay = document.getElementById('total-height-display');

const canvasWrapper = document.querySelector('.canvas-wrapper');
const coverCanvas = document.getElementById('cover-canvas');
const previewArea = document.getElementById('preview-area');
const downloadBtn = document.getElementById('download-pdf');

const zoomSlider = document.getElementById('zoom-slider');
const zoomValue = document.getElementById('zoom-value');

// Constants
const BLEED_MM = 3;
let baseScale = 1; // Base scale to fit screen

/**
 * Validates inputs and shows visual errors (red outline & messages)
 */
function validateInputs() {
    const hasFlap = hasFlapInput.checked;
    const flapCm = parseFloat(flapSizeInput.value) || 0;
    
    // Se a orelha estiver habilitada, faz a verificação de limites (5cm a 8cm)
    if (hasFlap) {
        if (flapCm < 5) {
            flapSizeInput.classList.add('input-error');
            if (flapError) {
                flapError.textContent = '⚠️ Erro: A orelha não pode ser menor que 5 cm.';
                flapError.style.display = 'block';
            }
            return false;
        } else if (flapCm > 8) {
            flapSizeInput.classList.add('input-error');
            if (flapError) {
                flapError.textContent = '⚠️ Erro: A orelha não pode ser maior que 8 cm.';
                flapError.style.display = 'block';
            }
            return false;
        }
    }
    
    // Remove os alertas caso o valor seja válido ou a orelha esteja desmarcada
    flapSizeInput.classList.remove('input-error');
    if (flapError) {
        flapError.style.display = 'none';
    }
    return true;
}

/**
 * Updates the UI based on inputs and renders the canvas.
 */
function updateCanvas() {
    // 0. Executar validações visuais
    validateInputs();

    // 1. Get values
    const widthCm = parseFloat(bookWidthInput.value) || 14;
    const heightCm = parseFloat(bookHeightInput.value) || 21;
    const paperThickness = parseFloat(paperTypeInput.value) || 0.09;
    const pages = parseInt(pageCountInput.value) || 100;
    const hasFlap = hasFlapInput.checked;
    const flapCm = parseFloat(flapSizeInput.value) || 6;

    // Toggle flap size input visibility
    flapSizeGroup.style.display = hasFlap ? 'flex' : 'none';

    // 2. Calculations (all in mm)
    const widthMm = widthCm * 10;
    const heightMm = heightCm * 10;
    const flapMm = hasFlap ? flapCm * 10 : 0;
    
    // Spine = (Pages / 2) * Thickness
    const spineMm = (pages / 2) * paperThickness;

    const contentWidthMm = (flapMm * 2) + (widthMm * 2) + spineMm;
    const totalWidthMm = contentWidthMm + (BLEED_MM * 2);
    const totalHeightMm = heightMm + (BLEED_MM * 2);

    // 3. Update Text Summaries
    spineWidthDisplay.textContent = spineMm.toFixed(2);
    totalWidthDisplay.textContent = totalWidthMm.toFixed(2);
    totalHeightDisplay.textContent = totalHeightMm.toFixed(2);

    // 4. Render Canvas HTML
    let html = `
        <div class="bleed-area"></div>
        <div class="safety-area"></div>
    `;

    if (hasFlap) {
        html += `<div class="canvas-part part-flap-left" style="width: ${flapMm}mm;">
            <span class="part-label">Orelha</span>
            <span class="dimensions-label">${flapCm} cm</span>
        </div>`;
    }

    // Back cover includes ISBN box
    html += `<div class="canvas-part part-back" style="width: ${widthMm}mm;">
        <span class="part-label">Quarta Capa</span>
        <span class="dimensions-label">${widthCm} x ${heightCm} cm</span>
        <div class="isbn-box">
            <span>CÓDIGO ISBN</span>
        </div>
    </div>`;

    html += `<div class="canvas-part part-spine" style="width: ${spineMm}mm;">
        <span class="part-label" style="transform: rotate(-90deg); white-space: nowrap;">Lombada</span>
        <span class="dimensions-label" style="transform: rotate(-90deg); margin-top: 30px;">${spineMm.toFixed(1)} mm</span>
    </div>`;

    html += `<div class="canvas-part part-front" style="width: ${widthMm}mm;">
        <span class="part-label">Capa</span>
        <span class="dimensions-label">${widthCm} x ${heightCm} cm</span>
    </div>`;

    if (hasFlap) {
        html += `<div class="canvas-part part-flap-right" style="width: ${flapMm}mm;">
            <span class="part-label">Orelha</span>
            <span class="dimensions-label">${flapCm} cm</span>
        </div>`;
    }

    coverCanvas.innerHTML = html;

    // Apply styles to canvas
    coverCanvas.style.width = `${totalWidthMm}mm`;
    coverCanvas.style.height = `${totalHeightMm}mm`;
    coverCanvas.style.padding = `${BLEED_MM}mm`;
    coverCanvas.style.boxSizing = 'border-box';
    
    // Scale canvas to fit preview area
    fitCanvas();
}

/**
 * Calculates the base scale to fit the canvas in the preview area
 */
function fitCanvas() {
    // Reset transform to get actual dimensions
    canvasWrapper.style.transform = 'scale(1)';
    
    const previewRect = previewArea.getBoundingClientRect();
    
    // offsetWidth/offsetHeight returns dimensions ignoring CSS transform scale
    const canvasWidth = coverCanvas.offsetWidth;
    const canvasHeight = coverCanvas.offsetHeight;
    
    // Calculate padding/margin space
    const paddingX = 40;
    const paddingY = 40;
    
    const scaleX = (previewRect.width - paddingX) / canvasWidth;
    const scaleY = (previewRect.height - paddingY) / canvasHeight;
    
    // Base scale fits it completely within the view
    baseScale = Math.min(scaleX, scaleY, 1); 
    
    applyZoom();
}

/**
 * Applies the zoom factor multiplied by the base scale
 */
function applyZoom() {
    const userZoom = parseFloat(zoomSlider.value);
    const finalScale = baseScale * userZoom;
    
    // Update label
    zoomValue.textContent = Math.round(userZoom * 100) + '%';
    
    // Apply transform
    canvasWrapper.style.transform = `scale(${finalScale})`;
}

// Event Listeners
form.addEventListener('input', updateCanvas);
window.addEventListener('resize', fitCanvas);
zoomSlider.addEventListener('input', applyZoom);

// Initial Render
updateCanvas();

// PDF Generation
downloadBtn.addEventListener('click', async () => {
    // Validação extra para impedir download caso os dados estejam incorretos
    if (!validateInputs()) {
        alert("Por favor, corrija os erros sinalizados em vermelho antes de baixar o PDF.");
        return;
    }

    // 1. Prepare canvas for full resolution capture
    const originalTransform = canvasWrapper.style.transform;
    canvasWrapper.style.transform = 'scale(1)'; // Reset scale
    
    // Add loading state
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = 'Gerando PDF...';
    downloadBtn.disabled = true;

    try {
        // Wait a small moment for DOM to apply scale(1)
        await new Promise(r => setTimeout(r, 100));

        // Use html2canvas to capture the element
        const canvas = await window.html2canvas(coverCanvas, {
            scale: 2, // higher resolution
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        // Get image data
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        // Parse total dimensions from UI to create exactly sized PDF
        const tWidthMm = parseFloat(totalWidthDisplay.textContent);
        const tHeightMm = parseFloat(totalHeightDisplay.textContent);

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [tWidthMm, tHeightMm]
        });

        // Add image to PDF at exact mm size
        pdf.addImage(imgData, 'JPEG', 0, 0, tWidthMm, tHeightMm);

        // Download
        pdf.save('gabarito-capa.pdf');
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Houve um erro ao gerar o PDF. Verifique o console.");
    } finally {
        // Restore scale and button state
        canvasWrapper.style.transform = originalTransform;
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
});

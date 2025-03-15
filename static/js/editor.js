let editor;
let isPreviewVisible = false;

// Initialize CodeMirror
document.addEventListener('DOMContentLoaded', () => {

    editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
        mode: 'markdown',
        theme: 'vscode-dark',
        lineNumbers: true,
        lineWrapping: true,
        autofocus: true,
        indentUnit: 4,
        tabSize: 4,
        viewportMargin: Infinity
    });

    // Initialize event listeners
    initializeEventListeners();

    // Update status bar initially
    updateStatusBar();

    // Listen for cursor activity
    editor.on('cursorActivity', updateStatusBar);

    // Add click handler for preview close
    document.querySelector('.preview-wrapper').addEventListener('click', (e) => {
        if (e.target.classList.contains('preview-wrapper')) {
            togglePreview();
        }
    });
});

function initializeEventListeners() {
    // Toolbar buttons
    document.getElementById('save').addEventListener('click', showSaveDialog);
    document.getElementById('load').addEventListener('click', loadFromDevice);
    document.getElementById('preview-toggle').addEventListener('click', togglePreview);
    document.getElementById('toc').addEventListener('click', showTOCModal);
    document.getElementById('undo').addEventListener('click', () => editor.undo());
    document.getElementById('redo').addEventListener('click', () => editor.redo());

    // Formatting buttons
    document.getElementById('bold').addEventListener('click', () => insertFormat('**', '**'));
    document.getElementById('italic').addEventListener('click', () => insertFormat('*', '*'));
    document.getElementById('table').addEventListener('click', showTableDialog);
    document.getElementById('image').addEventListener('click', insertImage);
    document.getElementById('latex').addEventListener('click', insertLatex);
}



// File operations with device
function showSaveDialog() {
    new bootstrap.Modal(document.getElementById('saveFileModal')).show();
}

function saveToDeviceWithName() {
    const filename = document.getElementById('filename').value.trim();
    if (!filename) {
        alert('Please enter a filename');
        return;
    }

    // Add .md extension if not present
    const finalFilename = filename.endsWith('.md') ? filename : filename + '.md';

    const content = editor.getValue();
    const blob = new Blob([content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = finalFilename;
    a.click();
    URL.revokeObjectURL(a.href);

    // Close the modal
    bootstrap.Modal.getInstance(document.getElementById('saveFileModal')).hide();
}

function loadFromDevice() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                editor.setValue(e.target.result);
                updateFileSize(file.size);
                updateStatusBar();
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Status bar updates
function updateStatusBar() {
    const pos = editor.getCursor();
    const content = editor.getValue();
    const lines = content.split('\n').length;
    const chars = content.length;

    document.getElementById('file-size').textContent = `Size: ${formatSize(chars)} | Lines: ${lines} | Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
}

function formatSize(size) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// Table dialog
function showTableDialog() {
    const html = `
        <div class="modal fade" id="tableModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">Insert Table</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="rows" class="form-label">Rows</label>
                            <input type="number" class="form-control bg-dark text-light" id="rows" value="3" min="1">
                        </div>
                        <div class="mb-3">
                            <label for="cols" class="form-label">Columns</label>
                            <input type="number" class="form-control bg-dark text-light" id="cols" value="3" min="1">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="insertCustomTable()">Insert</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!document.getElementById('tableModal')) {
        document.body.insertAdjacentHTML('beforeend', html);
    }

    new bootstrap.Modal(document.getElementById('tableModal')).show();
}

function insertCustomTable() {
    const rows = parseInt(document.getElementById('rows').value) || 3;
    const cols = parseInt(document.getElementById('cols').value) || 3;

    let table = '\n';

    // Header row
    table += '|' + ' Header '.repeat(cols) + '|\n';

    // Separator row
    table += '|' + ' --- |'.repeat(cols) + '\n';

    // Data rows
    for (let i = 0; i < rows; i++) {
        table += '|' + ' Cell |'.repeat(cols) + '\n';
    }

    editor.replaceSelection(table);
    bootstrap.Modal.getInstance(document.getElementById('tableModal')).hide();
}

// TOC Modal
function showTOCModal() {
    const html = `
        <div class="modal fade" id="tocModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">Table of Contents</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="tocContent"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!document.getElementById('tocModal')) {
        document.body.insertAdjacentHTML('beforeend', html);
    }

    const modal = new bootstrap.Modal(document.getElementById('tocModal'));
    generateTOC();
    modal.show();
}

function generateTOC() {
    const content = editor.getValue();
    const headers = content.match(/#{1,6}.+/g) || [];
    const tocContent = document.getElementById('tocContent');
    let toc = '';

    headers.forEach((header, index) => {
        const level = header.match(/^#+/)[0].length;
        const text = header.replace(/^#+\s*/, '');

        toc += `
            <div class="toc-item toc-level-${level}">
                <span class="toc-bullet">></span>
                <a href="#" onclick="scrollToHeader('${text}'); return false;">${text}</a>
            </div>
        `;
    });

    tocContent.innerHTML = toc || '<div class="text-muted text-center p-4">No headers found in the document</div>';
}

function scrollToHeader(text) {
    const content = editor.getValue();
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(text)) {
            editor.scrollIntoView({line: i, ch: 0}, 100);
            editor.setCursor({line: i, ch: 0});
            editor.focus();
            bootstrap.Modal.getInstance(document.getElementById('tocModal')).hide();
            break;
        }
    }
}

// Preview functionality
async function togglePreview() {
    const previewWrapper = document.querySelector('.preview-wrapper');
    const editorWrapper = document.querySelector('.editor-wrapper');
    const previewButton = document.getElementById('preview-toggle');
    const spinner = previewButton.querySelector('.spinner-border');

    if (!isPreviewVisible) {
        try {
            // Show loading spinner
            spinner.classList.remove('d-none');
            previewButton.setAttribute('disabled', 'true');

            const response = await fetch('/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: editor.getValue() })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('preview-content').innerHTML = data.html;
                // Render math expressions
                if (window.MathJax) {
                    MathJax.typesetPromise();
                }
                previewWrapper.classList.remove('d-none');
                editorWrapper.style.flex = '1';
            } else {
                alert('Error generating preview: ' + data.message);
            }
        } catch (error) {
            alert('Error generating preview: ' + error.message);
        } finally {
            // Hide loading spinner
            spinner.classList.add('d-none');
            previewButton.removeAttribute('disabled');
        }
    } else {
        previewWrapper.classList.add('d-none');
        editorWrapper.style.flex = '2';
    }

    isPreviewVisible = !isPreviewVisible;
}

// Utility functions
function insertFormat(prefix, suffix) {
    const selection = editor.getSelection();
    editor.replaceSelection(prefix + selection + suffix);
}

function insertImage() {
    editor.replaceSelection('![Alt text](image.jpg)');
}

function insertLatex() {
    const html = `
        <div class="modal fade" id="latexModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">Insert LaTeX</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Common expressions:</label>
                            <div class="btn-group-vertical w-100">
                                <button class="btn btn-outline-light mb-2" onclick="insertLatexTemplate('inline', '\\( x^2 + y^2 = z^2 \\)')">Inline math: (x² + y² = z²)</button>
                                <button class="btn btn-outline-light mb-2" onclick="insertLatexTemplate('block', '\\\[ \\sum_{i=1}^n i = \\frac{n(n+1)}{2} \\\]')">Sum formula</button>
                                <button class="btn btn-outline-light mb-2" onclick="insertLatexTemplate('block', '\\\[ \\int_{a}^b f(x) dx \\\]')">Integral</button>
                                <button class="btn btn-outline-light mb-2" onclick="insertLatexTemplate('block', '\\\[ \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} \\\]')">Quadratic formula</button>
                                <button class="btn btn-outline-light mb-2" onclick="insertLatexTemplate('block', '\\\[ \\begin{matrix} a & b \\\\ c & d \\end{matrix} \\\]')">Matrix</button>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="latexInput" class="form-label">Custom LaTeX:</label>
                            <textarea class="form-control bg-dark text-light" id="latexInput" rows="3" placeholder="Enter LaTeX code"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="insertCustomLatex()">Insert</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!document.getElementById('latexModal')) {
        document.body.insertAdjacentHTML('beforeend', html);
    }

    new bootstrap.Modal(document.getElementById('latexModal')).show();
}

function insertLatexTemplate(type, formula) {
    editor.replaceSelection(formula);
    bootstrap.Modal.getInstance(document.getElementById('latexModal')).hide();
}

function insertCustomLatex() {
    const latex = document.getElementById('latexInput').value;
    editor.replaceSelection(`\\[ ${latex} \\]`);
    bootstrap.Modal.getInstance(document.getElementById('latexModal')).hide();
}

function updateFileSize(size) {
    const sizeElement = document.getElementById('file-size');
    if (size < 1024) {
        sizeElement.textContent = `Size: ${size} B`;
    } else if (size < 1024 * 1024) {
        sizeElement.textContent = `Size: ${(size / 1024).toFixed(1)} KB`;
    } else {
        sizeElement.textContent = `Size: ${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
}
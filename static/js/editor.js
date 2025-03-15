// Wait for all required resources to load
let editor;
let tocModal;
let lastSavedContent = '';

function initializeEditor() {
    try {
        editor = new EasyMDE({
            element: document.getElementById('editor'),
            autofocus: true,
            spellChecker: false,
            autoRefresh: true,
            lineNumbers: true,
            codemirror: {
                lineWrapping: true,
                lineNumbers: true,
                viewportMargin: Infinity,
                mode: 'markdown',
                theme: 'dark',
                scrollbarStyle: 'native'
            },
            previewRender: function(plainText) {
                // Process all LaTeX delimiters before markdown
                let latexProcessed = plainText
                    // Keep display math mode delimiters
                    .replace(/\$\$([\s\S]*?)\$\$/g, function(match) {
                        return match;
                    })
                    // Keep inline math mode with parentheses
                    .replace(/\\\(([\s\S]*?)\\\)/g, function(match, inside) {
                        // Handle special characters in inline mode
                        return '\\(' + inside.replace(/\\\\/g, '\\\\\\\\') + '\\)';
                    })
                    // Keep display math mode with square brackets
                    .replace(/\\\[([\s\S]*?)\\\]/g, function(match, inside) {
                        // Handle matrix notation with double backslashes
                        return '\\[' + inside.replace(/\\\\/g, '\\\\\\\\') + '\\]';
                    });

                const rendered = marked.parse(latexProcessed);

                // Process with MathJax after markdown rendering
                setTimeout(() => {
                    if (typeof MathJax !== 'undefined') {
                        MathJax.typesetPromise().catch(function (err) {
                            console.log('MathJax error:', err);
                        });
                    }
                }, 0);

                return rendered;
            },
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'unordered-list', 'ordered-list', 
                {
                    name: "latex",
                    action: function(editor) {
                        const cm = editor.codemirror;
                        const selection = cm.getSelection();
                        const text = selection || '  ';
                        cm.replaceSelection(`$$${text}$$`);
                    },
                    className: "fa fa-square-root-alt",
                    title: "Insert LaTeX Math",
                },
                '|',
                {
                    name: "custom-table",
                    action: insertCustomTable,
                    className: "fa fa-table",
                    title: "Insert Custom Table",
                },
                {
                    name: "toc",
                    action: showTOCModal,
                    className: "fa fa-list-alt",
                    title: "Show Table of Contents",
                },
                'link', 'image', '|',
                'preview', 'side-by-side', 'fullscreen', '|',
                'undo', 'redo', '|',
                {
                    name: "clear",
                    action: clearEditor,
                    className: "fa fa-trash",
                    title: "Clear Editor",
                }
            ],
            sideBySideFullscreen: true,
            maxHeight: '85vh'
        });

        // Initialize Bootstrap modal
        tocModal = new bootstrap.Modal(document.getElementById('tocModal'));

        // Initialize file size display and save status
        updateFileSize();
        lastSavedContent = editor.value();

        // Setup change handlers
        editor.codemirror.on('change', () => {
            updateFileSize();
            updateSaveStatus();
        });

    } catch (error) {
        console.error('Error initializing editor:', error);
        document.getElementById('editor').value = 'Error initializing editor. Please refresh the page.';
    }
}

function updateSaveStatus() {
    const currentContent = editor.value();
    const statusElement = document.querySelector('.save-status');
    const statusText = document.getElementById('save-status-text');

    if (currentContent === lastSavedContent) {
        statusElement.className = 'save-status saved';
        statusText.textContent = 'All changes saved';
    } else {
        statusElement.className = 'save-status unsaved';
        statusText.textContent = 'Unsaved changes';
    }
}

function updateFileSize() {
    try {
        const content = editor.value();
        const size = new Blob([content]).size;
        const formattedSize = formatFileSize(size);
        document.getElementById('file-size').textContent = formattedSize;
    } catch (error) {
        console.error('Error updating file size:', error);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function insertCustomTable() {
    try {
        const rows = prompt('Number of rows:', '3');
        const cols = prompt('Number of columns:', '3');

        if (rows && cols) {
            let table = '\n|';
            // Header row
            for (let i = 0; i < cols; i++) {
                table += ` Column ${i + 1} |`;
            }
            table += '\n|';
            // Separator row
            for (let i = 0; i < cols; i++) {
                table += ' --- |';
            }
            // Data rows
            for (let i = 0; i < rows; i++) {
                table += '\n|';
                for (let j = 0; j < cols; j++) {
                    table += '   |';
                }
            }
            table += '\n\n';

            const cursor = editor.codemirror.getCursor();
            editor.codemirror.replaceSelection(table);
            editor.codemirror.scrollIntoView(cursor);
        }
    } catch (error) {
        console.error('Error inserting table:', error);
        alert('Error inserting table');
    }
}

function showTOCModal() {
    try {
        const content = editor.value();
        const headings = content.match(/^#{1,6}.+/gm) || [];
        let tocHtml = '<div class="list-group list-group-flush">';

        headings.forEach((heading, index) => {
            const level = heading.match(/^#+/)[0].length;
            const text = heading.replace(/^#+\s*/, '');
            const id = `toc-heading-${index}`;
            const indent = level - 1;

            tocHtml += `
                <button class="list-group-item list-group-item-action d-flex align-items-center" 
                        style="padding-left: ${indent * 1.5}rem"
                        onclick="scrollToHeading('${text}')">
                    <span class="text-secondary me-2">${'#'.repeat(level)}</span>
                    ${text}
                </button>`;
        });

        tocHtml += '</div>';
        document.getElementById('toc-content').innerHTML = 
            headings.length ? tocHtml : '<p class="text-muted mb-0">No headings found in the document.</p>';
        tocModal.show();
    } catch (error) {
        console.error('Error showing TOC:', error);
        alert('Error displaying table of contents');
    }
}

function scrollToHeading(headingText) {
    const content = editor.value();
    const lines = content.split('\n');
    const headingPattern = new RegExp(`^#+\\s*${headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

    for (let i = 0; i < lines.length; i++) {
        if (headingPattern.test(lines[i])) {
            editor.codemirror.scrollIntoView({line: i, ch: 0}, 200);
            editor.codemirror.setCursor({line: i, ch: 0});
            tocModal.hide();
            return;
        }
    }
}

function insertCurrentTOC() {
    try {
        const content = editor.value();
        const headings = content.match(/^#{1,6}.+/gm) || [];
        let toc = '\n## Table of Contents\n\n';

        headings.forEach(heading => {
            const level = heading.match(/^#+/)[0].length;
            const text = heading.replace(/^#+\s*/, '');
            const indent = '  '.repeat(level - 1);
            const link = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            toc += `${indent}- [${text}](#${link})\n`;
        });

        const cursor = editor.codemirror.getCursor();
        editor.codemirror.replaceSelection(toc + '\n');
        editor.codemirror.scrollIntoView(cursor);
        tocModal.hide();
    } catch (error) {
        console.error('Error inserting TOC:', error);
        alert('Error inserting table of contents');
    }
}

function clearEditor() {
    try {
        if (confirm('Are you sure you want to clear the editor?')) {
            editor.value('');
            updateFileSize();
            lastSavedContent = '';
            updateSaveStatus();
        }
    } catch (error) {
        console.error('Error clearing editor:', error);
        alert('Error clearing editor');
    }
}

function saveFile() {
    try {
        const content = editor.value();
        const filename = prompt('Enter filename:', 'document.md');

        if (!filename) return;

        fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                filename: filename
            })
        })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            lastSavedContent = content;
            updateSaveStatus();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error saving file');
        });
    } catch (error) {
        console.error('Error in save operation:', error);
        alert('Error preparing file for save');
    }
}

function loadFile() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.markdown';

        input.onchange = e => {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('file', file);

            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                editor.value(data.content);
                lastSavedContent = data.content;
                updateFileSize();
                updateSaveStatus();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error loading file');
            });
        };

        input.click();
    } catch (error) {
        console.error('Error in load operation:', error);
        alert('Error preparing file load');
    }
}

// Initialize editor when DOM is fully loaded
function generateRandomUsername() {
    const adjectives = ['Happy', 'Smart', 'Quick', 'Clever', 'Bright', 'Swift'];
    const nouns = ['Writer', 'Editor', 'Coder', 'Author', 'Ninja', 'Star'];
    const randomNum = Math.floor(Math.random() * 1000);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}${randomNum}`;
}

// Initialize editor when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    document.getElementById('random-username').textContent = generateRandomUsername();
});
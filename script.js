const pdfUpload = document.getElementById('pdfUpload');
const readButton = document.getElementById('read');
const pauseButton = document.getElementById('pause');
const resumeButton = document.getElementById('resume');
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');
const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');
const speedSelector = document.getElementById('speed');
const voiceSelector = document.getElementById('voiceSelector');
const controls = document.getElementById('controls');
const viewer = document.getElementById('viewer');
const pageNumberDisplay = document.getElementById('pageNumber');
const scrollContainer = document.getElementById('scrollContainer');
const canvas = document.getElementById('pdfCanvas');

let currentPageIndex = 0;
let totalPages = 0;
let pdfDoc = null;
let zoomLevel = 1; 
let voices = [];
let isReading = false; 
let utterance = null; 
let textContent = "";

const populateVoices = () => {
    voices = window.speechSynthesis.getVoices();
    voiceSelector.innerHTML = ''; 

    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' [default]' : ''}`;
        voiceSelector.appendChild(option);
    });
};

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
} else {
    populateVoices();
}

const renderPage = (pageNum) => {
    pdfDoc.getPage(pageNum).then((page) => {
        const viewport = page.getViewport({ scale: zoomLevel });

        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        page.render({
            canvasContext: context,
            viewport: viewport
        });

        updatePageNumber();

        page.getTextContent().then((content) => {
            textContent = content.items.map(item => item.str).join(' ');
        });
    });
};

const updatePageNumber = () => {
    pageNumberDisplay.textContent = `Page ${currentPageIndex + 1} of ${totalPages}`;
};

pdfUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];

    if (file && file.type === 'application/pdf') {
        const fileReader = new FileReader();

        fileReader.onload = async function () {
            const typedArray = new Uint8Array(this.result);
            pdfDoc = await pdfjsLib.getDocument(typedArray).promise;

            totalPages = pdfDoc.numPages;
            controls.style.display = 'flex';
            viewer.style.display = 'flex';
            currentPageIndex = 0;

            renderPage(currentPageIndex + 1);
        };

        fileReader.readAsArrayBuffer(file);
    }
});

prevPageButton.addEventListener('click', () => {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        renderPage(currentPageIndex + 1);
    }
});

nextPageButton.addEventListener('click', () => {
    if (currentPageIndex < totalPages - 1) {
        currentPageIndex++;
        renderPage(currentPageIndex + 1);
    }
});

zoomInButton.addEventListener('click', () => {
    zoomLevel += 0.1;
    renderPage(currentPageIndex + 1);
});

zoomOutButton.addEventListener('click', () => {
    if (zoomLevel > 0.2) {
        zoomLevel -= 0.1;
        renderPage(currentPageIndex + 1);
    }
});

readButton.addEventListener('click', () => {
    if (!isReading && textContent) {
        const voice = voices[voiceSelector.value];
        utterance = new SpeechSynthesisUtterance(textContent);
        utterance.voice = voice;
        utterance.rate = parseFloat(speedSelector.value);

        isReading = true;
        speechSynthesis.speak(utterance);
    }
});

pauseButton.addEventListener('click', () => {
    if (isReading) {
        speechSynthesis.pause();
    }
});

resumeButton.addEventListener('click', () => {
    if (isReading) {
        speechSynthesis.resume();
    }
});

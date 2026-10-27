//const API_URL = "https://script.google.com/macros/s/AKfycbwhoB0e6LuaHxo4r5lIblBFTuxSh5jWrtEOnQxcTnVe3I45TWxyeac-F6BH7LA3IBKg/exec";

const API_URL = "https://script.google.com/macros/s/AKfycbwhoB0e6LuaHxo4r5lIblBFTuxSh5jWrtEOnQxcTnVe3I45TWxyeac-F6BH7LA3IBKg/exec";

let words = [];
let currentWord;
let filteredWords = [];
let progress = {};
let isAnswerLocked = false;

const GROQ_API_KEY = "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";
const PIXABAY_KEY = "42051557-64e42dfa97b3a7efc88de6d55";


// ✅ INIT
window.onload = function () {
    loadWords();
    showPage("home");
};

// ✅ PAGE SWITCH
function showPage(page) {
    ["home","setup","quiz","result","finish"].forEach(p => {
        document.getElementById(p).style.display = "none";
    });

    document.getElementById(page).style.display = "block";

    document.body.className = "";
    document.body.classList.add(page + "-page");
}

// ✅ LOAD WORDS
async function loadWords() {
    let res = await fetch(API_URL);
    let data = await res.json();

    words = data.map(w => ({
        word: w.word.trim(),
        meaning: w.meaning.trim(),
        difficulty: w.difficulty.toUpperCase(),
		synonym: w.synonym,
        example: w.example,
        leadership_example: w.leadership_example
    }));

    updateSets();
}

// ✅ UPDATE SETS
function updateSets() {
    let difficulty = document.getElementById("difficulty").value;
    let list = words.filter(w => w.difficulty === difficulty);

    let dropdown = document.getElementById("setSelector");
    dropdown.innerHTML = "";

    for (let i = 1; i <= Math.ceil(list.length / 30); i++) {
        dropdown.innerHTML += `<option value="${i}">Set ${i}</option>`;
    }
}

// ✅ START QUIZ
function startQuiz() {

    let difficulty = document.getElementById("difficulty").value;
    let set = parseInt(document.getElementById("setSelector").value);

    let list = words.filter(w => w.difficulty === difficulty);

    filteredWords = list.slice((set - 1) * 30, set * 30);

    // Reset progress for a new quiz
    progress = {};

    filteredWords.forEach(w => {
        progress[w.word] = 0;
    });

    // Update progress bar and counters
    updateProgress();
	
	function finishQuiz() {

    const total = filteredWords.length;

    const mastered =
        Object.values(progress)
            .filter(v => v >= 2)
            .length;

    document.getElementById("finishTotal").textContent = total;
    document.getElementById("finishMastered").textContent = mastered;
    document.getElementById("finishRemaining").textContent =
        total - mastered;

    showPage("finish");
}

    // Open quiz page
    showPage("quiz");

    // Display first random word
    nextWord();
}


function updateProgress() {

    const total = filteredWords.length;

    const mastered =
        Object.values(progress)
        .filter(v => v >= 2)
        .length;

    const remaining = total - mastered;

    document.getElementById("wordCounter").innerText =
        `Word ${Math.min(mastered + 1, total)} / ${total}`;

    document.getElementById("mastered").innerText =
        `Mastered : ${mastered}`;

    document.getElementById("remaining").innerText =
        `Remaining : ${remaining}`;

    document.getElementById("progressBar").style.width =
        ((mastered / total) * 100) + "%";

}

showPage("quiz");
nextWord();


// ✅ NEXT WORD
function nextWord() {
    isAnswerLocked = false;

    let pending = filteredWords.filter(w => progress[w.word] < 2);

    if (pending.length === 0) {
    finishQuiz();
    return;
}

    currentWord = pending[Math.floor(Math.random() * pending.length)];

    let options = generateOptions(currentWord.meaning);
    options.push("I_AM_NOT_SURE");

    let html = `
<div class="result-container">

    <div class="result-header">
        <div class="result-word">
            ${currentWord.word}
        </div>
    </div>

    <table class="result-table">

        ${options.map(opt => {

            const text =
                opt === "I_AM_NOT_SURE"
                ? "I'm not sure"
                : opt;

            return `
                <tr class="quiz-row">
                    <td>${text}</td>
                </tr>
            `;

        }).join("")}

    </table>

</div>
`;

    document.getElementById("options").innerHTML = html;

    document.querySelectorAll(".quiz-row").forEach((el,i) => {
        el.onclick = () => submitAnswer(options[i]);
    });
}

// ✅ OPTIONS
function generateOptions(correct) {
    let meanings = words.map(w => w.meaning);
    let opts = new Set([correct]);

    while (opts.size < 4) {
        opts.add(meanings[Math.floor(Math.random() * meanings.length)]);
    }

    return [...opts].sort(() => Math.random() - 0.5);
}

async function generateAISentence(word) {
    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "user",
                        content: `Use "${word}" in a sentence.`
                    }
                ]
            })
        });

        const data = await res.json();
        return data?.choices?.[0]?.message?.content?.trim() ||
               `Sentence using ${word}`;

    } catch (e) {
        console.error(e);
        return `Sentence using ${word}`;
    }
}

//✅ LOAD WIKIMEDIA IMAGES

async function getOpenverseImages(word) {

    try {

        const url =
            "https://api.openverse.org/v1/images/?" +
            "q=" + encodeURIComponent(word) +
            "&page_size=6";

        const response = await fetch(url);

        if (!response.ok)
            throw new Error("Openverse request failed");

        const data = await response.json();

        if (!data.results)
            return [];

        return data.results.map(img => ({
            url: img.thumbnail || img.url,
            title: img.title || "",
            creator: img.creator || "",
            license: img.license || ""
        }));

    } catch (e) {
        console.error(e);
        return [];
    }
}

// ✅ Openverse Images (No API Key Required)
async function getOpenverseImages(word) {

    try {

        // Try different search terms for better vocabulary results
        const searchQueries = [
            word,
            word + " concept",
            word + " illustration"
        ];

        for (const query of searchQueries) {

            const url =
                "https://api.openverse.org/v1/images/?" +
                "q=" + encodeURIComponent(query) +
                "&page_size=6" +
                "&license_type=all";

            const response = await fetch(url);

            if (!response.ok)
                continue;

            const data = await response.json();

            if (data.results && data.results.length > 0) {

                return data.results
                    .filter(img => img.thumbnail || img.url)
                    .map(img => ({
                        url: img.thumbnail || img.url,
                        full: img.url,
                        title: img.title || "Untitled",
                        creator: img.creator || "Unknown",
                        license: img.license || ""
                    }));
            }
        }

        return [];

    } catch (e) {
        console.error("Openverse Error:", e);
        return [];
    }
}

// ✅ RESULT PAGE
async function submitAnswer(ans) {

    if (isAnswerLocked) return;
    isAnswerLocked = true;

    let resultClass = "";
    let resultText = "";

    // -----------------------------
    // Evaluate Answer
    // -----------------------------
    if (ans === currentWord.meaning) {

        progress[currentWord.word] =
            Math.min(progress[currentWord.word] + 1, 2);

        resultClass = "correct";

        if (progress[currentWord.word] === 1) {
            resultText = "✅ Correct • 1/2";
        } else {
            resultText = "🏆 Mastered";
        }

    } else if (ans === "I_AM_NOT_SURE") {

        progress[currentWord.word] = 0;

        resultClass = "neutral";
        resultText = "🤔 I'm Not Sure";

    } else {

        progress[currentWord.word] = 0;

        resultClass = "incorrect";
        resultText = "❌ Incorrect";

    }

    // -----------------------------
    // Update Progress
    // -----------------------------
    updateProgress();

    // -----------------------------
    // AI Sentence + Images
    // -----------------------------
    const [aiSentence, openverseImages] = await Promise.all([
        generateAISentence(currentWord.word),
        getOpenverseImages(currentWord.word)
    ]);

    // -----------------------------
    // Build Image Gallery
    // -----------------------------
    let imageGallery = "";

    if (openverseImages.length > 0) {

        imageGallery = openverseImages.map(img => `
            <div class="gallery-item">
                <img
                    src="${img.url}"
                    alt="${img.title}"
                    class="result-image"
                    loading="lazy"
                >
                <div class="caption">${img.title}</div>
            </div>
        `).join("");

    } else {

        imageGallery = `
            <div class="gallery-item">
                <p>No images found.</p>
            </div>
        `;
    }

    // -----------------------------
    // Result Page
    // -----------------------------
    const html = `
<div class="result-container">

    <div class="card">

        <div class="result-header">

            <div class="result-word">
                ${currentWord.word}
            </div>

            <div class="result-status ${resultClass}">
                ${resultText}
            </div>

        </div>

        <table class="result-table">

            <tr>
                <td>Your Answer</td>
                <td>${ans === "I_AM_NOT_SURE" ? "🤔 I'm not sure" : ans}</td>
                <td></td>
            </tr>

            <tr>
                <td>Meaning</td>
                <td>${currentWord.meaning}</td>
                <td>
                    <button class="speak-btn"
                        data-text="${currentWord.meaning}">
                        🔊
                    </button>
                </td>
            </tr>
			
			<tr>
                <td>Synonym</td>
                <td>${currentWord.synonym}</td>
                <td>
                    <button class="speak-btn"
                        data-text="${currentWord.synonym}">
                        🔊
                    </button>
                </td>
            </tr>

            <tr>
                <td>Example</td>
                <td>${currentWord.example}</td>
                <td>
                    <button class="speak-btn"
                        data-text="${currentWord.example}">
                        🔊
                    </button>
                </td>
            </tr>

            <tr>
                <td>Leadership</td>
                <td>${currentWord.leadership_example}</td>
                <td>
                    <button class="speak-btn"
                        data-text="${currentWord.leadership_example}">
                        🔊
                    </button>
                </td>
            </tr>

            <tr>
                <td>AI Sentence</td>
                <td>${aiSentence}</td>
                <td>
                    <button class="speak-btn"
                        data-text="${aiSentence}">
                        🔊
                    </button>
                </td>
            </tr>

        </table>

        <div class="result-footer">
            <button class="next-btn" onclick="next()">
                Next →
            </button>
        </div>

    </div>

    <div class="image-gallery">
        ${imageGallery}
    </div>

</div>
`;

    document.getElementById("resultDetails").innerHTML = html;

    bindSpeakButtons();

    showPage("result");
}


function finishQuiz() {

    const total = filteredWords.length;

    const mastered =
        Object.values(progress)
            .filter(v => v >= 2)
            .length;

    document.getElementById("finishTotal").textContent = total;
    document.getElementById("finishMastered").textContent = mastered;
    document.getElementById("finishRemaining").textContent = total - mastered;

    showPage("finish");
}


// ✅ SPEECH
function bindSpeakButtons() {
    document.querySelectorAll(".speak-btn").forEach(btn => {
        btn.onclick = function () {
            let text = this.getAttribute("data-text");
            speechSynthesis.cancel();
            let msg = new SpeechSynthesisUtterance(text);
            msg.lang = "en-US";
            speechSynthesis.speak(msg);
        };
    });
}

// ✅ NEXT
function next() {
    showPage("quiz");
    nextWord();
}

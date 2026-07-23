"use strict";

/* ==========================================================
   VanLangpt v2.0
   File: static/script.js

   Features:
   - Send messages to Flask API
   - Render Markdown responses
   - Highlight code blocks
   - Simulated streaming effect
   - Sidebar conversation history
   - Open previous conversations
   - New Chat
   - Copy assistant responses
   - Auto-resize textarea
   - Enter to send, Shift + Enter for new line
   - Suggestion buttons
   - Loading indicator
   - Error handling
========================================================== */


/* ==========================================================
   DOM Elements
========================================================== */

const chatContainer = document.getElementById("chatContainer");
const welcomeScreen = document.getElementById("welcomeScreen");

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const typingIndicator = document.getElementById("typingIndicator");

const historyList = document.getElementById("historyList");
const newChatButton = document.getElementById("newChatBtn");

const suggestionButtons = document.querySelectorAll(".suggestion");


/* ==========================================================
   Application State
========================================================== */

const appState = {
    isWaiting: false,
    activeHistoryId: null
};

const DEFAULT_TEXTAREA_HEIGHT = 56;
const MAX_TEXTAREA_HEIGHT = 180;


/* ==========================================================
   Application Initialization
========================================================== */

document.addEventListener("DOMContentLoaded", initializeApplication);


function initializeApplication() {
    validateRequiredElements();
    configureMarkdown();
    bindEvents();

    resetTextareaHeight();
    updateSendButtonState();

    loadHistory();

    messageInput.focus();
}


/* ==========================================================
   Element Validation
========================================================== */

function validateRequiredElements() {
    const requiredElements = {
        chatContainer,
        messageInput,
        sendButton,
        typingIndicator,
        historyList,
        newChatButton
    };

    for (const [name, element] of Object.entries(requiredElements)) {
        if (!element) {
            throw new Error(
                `VanLangpt initialization error: missing element "${name}".`
            );
        }
    }
}


/* ==========================================================
   Markdown Configuration
========================================================== */

function configureMarkdown() {
    if (typeof marked === "undefined") {
        console.warn(
            "Marked.js was not loaded. AI responses will use plain text."
        );

        return;
    }

    marked.setOptions({
        breaks: true,
        gfm: true
    });
}


/* ==========================================================
   Event Binding
========================================================== */

function bindEvents() {
    sendButton.addEventListener("click", handleSendMessage);

    messageInput.addEventListener("keydown", handleInputKeydown);
    messageInput.addEventListener("input", handleInputChange);

    newChatButton.addEventListener("click", startNewChat);

    suggestionButtons.forEach((button) => {
        button.addEventListener("click", handleSuggestionClick);
    });

    historyList.addEventListener("click", handleHistoryClick);
}


/* ==========================================================
   Input Events
========================================================== */

function handleInputKeydown(event) {
    const isEnterKey = event.key === "Enter";
    const isNewLine = event.shiftKey;

    if (isEnterKey && !isNewLine) {
        event.preventDefault();

        if (!appState.isWaiting) {
            handleSendMessage();
        }
    }
}


function handleInputChange() {
    autoResizeTextarea();
    updateSendButtonState();
}


function handleSuggestionClick(event) {
    const suggestionText = event.currentTarget.textContent.trim();

    messageInput.value = suggestionText;

    autoResizeTextarea();
    updateSendButtonState();

    messageInput.focus();
}


/* ==========================================================
   Send Message
========================================================== */

async function handleSendMessage() {
    const userMessage = normalizeMessage(messageInput.value);

    if (!userMessage || appState.isWaiting) {
        return;
    }

    hideWelcomeScreen();
    clearActiveHistoryItem();

    appendUserMessage(userMessage);
    clearMessageInput();

    setWaitingState(true);
    showTypingIndicator();

    try {
        const response = await fetch("/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: userMessage
            })
        });

        const result = await readJsonResponse(response);

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to receive an AI response."
            );
        }

        const aiResponse = normalizeMessage(result.response);

        if (!aiResponse) {
            throw new Error("VanLangpt returned an empty response.");
        }

        hideTypingIndicator();

        await appendAssistantMessageWithStreaming(aiResponse);

        await loadHistory();
    } catch (error) {
        console.error("Chat request failed:", error);

        hideTypingIndicator();

        appendErrorMessage(
            error.message ||
            "An unexpected error occurred while contacting VanLangpt."
        );
    } finally {
        setWaitingState(false);
        scrollToBottom();
    }
}


/* ==========================================================
   API Utilities
========================================================== */

async function readJsonResponse(response) {
    try {
        return await response.json();
    } catch (error) {
        throw new Error(
            "The server returned an invalid response."
        );
    }
}


/* ==========================================================
   Message Rendering
========================================================== */

function appendUserMessage(content) {
    const messageElement = createMessageElement({
        role: "user",
        content,
        useMarkdown: false,
        showCopyButton: false
    });

    chatContainer.appendChild(messageElement);
    scrollToBottom();
}


function appendAssistantMessage(content) {
    const messageElement = createMessageElement({
        role: "assistant",
        content,
        useMarkdown: true,
        showCopyButton: true
    });

    chatContainer.appendChild(messageElement);

    const bubble = messageElement.querySelector(".bubble");

    enhanceAssistantBubble(bubble, content);
    scrollToBottom();

    return messageElement;
}


async function appendAssistantMessageWithStreaming(content) {
    const messageElement = createMessageElement({
        role: "assistant",
        content: "",
        useMarkdown: false,
        showCopyButton: false
    });

    chatContainer.appendChild(messageElement);

    const bubble = messageElement.querySelector(".bubble");
    const streamText = document.createElement("div");

    streamText.className = "streaming-text";
    bubble.appendChild(streamText);

    const chunks = splitTextIntoChunks(content);

    for (const chunk of chunks) {
        streamText.textContent += chunk;

        scrollToBottom("auto");

        await wait(calculateStreamingDelay(chunk));
    }

    bubble.innerHTML = renderMarkdown(content);

    enhanceAssistantBubble(bubble, content);
    scrollToBottom();
}


function appendErrorMessage(content) {
    const safeContent =
        `⚠️ **Không thể xử lý yêu cầu:** ${normalizeMessage(content)}`;

    const messageElement = createMessageElement({
        role: "assistant",
        content: safeContent,
        useMarkdown: true,
        showCopyButton: false
    });

    chatContainer.appendChild(messageElement);

    const bubble = messageElement.querySelector(".bubble");

    bubble.setAttribute("role", "alert");

    highlightCodeBlocks(bubble);
    scrollToBottom();
}


function createMessageElement({
    role,
    content,
    useMarkdown,
    showCopyButton
}) {
    const messageElement = document.createElement("article");

    messageElement.className = `message ${role}`;

    const avatar = document.createElement("div");

    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "U" : "VL";
    avatar.setAttribute(
        "aria-label",
        role === "user" ? "User" : "VanLangpt"
    );

    const bubble = document.createElement("div");

    bubble.className = "bubble";

    if (useMarkdown) {
        bubble.innerHTML = renderMarkdown(content);
    } else {
        const paragraph = document.createElement("p");

        paragraph.textContent = content;
        bubble.appendChild(paragraph);
    }

    if (showCopyButton) {
        addCopyButton(bubble, content);
    }

    messageElement.appendChild(avatar);
    messageElement.appendChild(bubble);

    return messageElement;
}


/* ==========================================================
   Assistant Message Enhancements
========================================================== */

function enhanceAssistantBubble(bubble, originalContent) {
    if (!bubble) {
        return;
    }

    highlightCodeBlocks(bubble);
    addCopyButton(bubble, originalContent);
    addCodeCopyButtons(bubble);
}


function addCopyButton(bubble, content) {
    if (!bubble || bubble.querySelector(":scope > .copy-btn")) {
        return;
    }

    const copyButton = document.createElement("button");

    copyButton.type = "button";
    copyButton.className = "copy-btn";
    copyButton.textContent = "Copy";
    copyButton.setAttribute("aria-label", "Copy AI response");

    copyButton.addEventListener("click", async () => {
        await handleCopyButton(copyButton, content);
    });

    bubble.appendChild(copyButton);
}


function addCodeCopyButtons(bubble) {
    const codeBlocks = bubble.querySelectorAll("pre");

    codeBlocks.forEach((preElement) => {
        if (preElement.querySelector(".code-copy-btn")) {
            return;
        }

        const codeElement = preElement.querySelector("code");

        if (!codeElement) {
            return;
        }

        preElement.style.position = "relative";

        const copyButton = document.createElement("button");

        copyButton.type = "button";
        copyButton.className = "code-copy-btn";
        copyButton.textContent = "Copy code";
        copyButton.setAttribute("aria-label", "Copy code block");

        Object.assign(copyButton.style, {
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: "2",
            border: "none",
            borderRadius: "8px",
            padding: "7px 10px",
            cursor: "pointer",
            background: "#2d2d2d",
            color: "#ffffff",
            fontSize: "12px"
        });

        copyButton.addEventListener("click", async () => {
            await handleCopyButton(
                copyButton,
                codeElement.textContent
            );
        });

        preElement.appendChild(copyButton);
    });
}


async function handleCopyButton(button, content) {
    const originalLabel = button.textContent;

    try {
        await copyTextToClipboard(content);

        button.textContent = "Copied";
    } catch (error) {
        console.error("Clipboard error:", error);

        button.textContent = "Failed";
    }

    window.setTimeout(() => {
        button.textContent = originalLabel;
    }, 1500);
}


/* ==========================================================
   History
========================================================== */

async function loadHistory() {
    historyList.setAttribute("aria-busy", "true");

    try {
        const response = await fetch("/history", {
            method: "GET",

            headers: {
                "Accept": "application/json"
            },

            cache: "no-store"
        });

        const result = await readJsonResponse(response);

        if (!response.ok || !result.success) {
            throw new Error(
                result.message ||
                "Unable to load conversation history."
            );
        }

        renderHistory(result.history);
    } catch (error) {
        console.error("History loading failed:", error);

        renderHistoryError();
    } finally {
        historyList.removeAttribute("aria-busy");
    }
}


function renderHistory(history) {
    historyList.innerHTML = "";

    if (!Array.isArray(history) || history.length === 0) {
        renderEmptyHistory();
        return;
    }

    history.forEach((conversation) => {
        const historyItem = document.createElement("button");

        historyItem.type = "button";
        historyItem.className = "history-item";
        historyItem.dataset.historyId = String(conversation.id);

        historyItem.title =
            normalizeMessage(conversation.user_message) ||
            "Conversation";

        historyItem.textContent = truncateText(
            conversation.user_message,
            38
        );

        historyItem.dataset.userMessage =
            conversation.user_message || "";

        historyItem.dataset.botMessage =
            conversation.bot_message || "";

        if (
            appState.activeHistoryId !== null &&
            String(appState.activeHistoryId) ===
            String(conversation.id)
        ) {
            historyItem.classList.add("active");
        }

        historyList.appendChild(historyItem);
    });
}


function renderEmptyHistory() {
    const emptyItem = document.createElement("div");

    emptyItem.className = "history-item";
    emptyItem.textContent = "No conversations yet";
    emptyItem.style.cursor = "default";
    emptyItem.style.opacity = "0.65";

    historyList.appendChild(emptyItem);
}


function renderHistoryError() {
    historyList.innerHTML = "";

    const errorItem = document.createElement("div");

    errorItem.className = "history-item";
    errorItem.textContent = "History unavailable";
    errorItem.style.cursor = "default";
    errorItem.style.opacity = "0.65";

    historyList.appendChild(errorItem);
}


function handleHistoryClick(event) {
    const historyItem = event.target.closest(
        "[data-history-id]"
    );

    if (!historyItem || appState.isWaiting) {
        return;
    }

    const historyId = historyItem.dataset.historyId;
    const userMessage = historyItem.dataset.userMessage;
    const botMessage = historyItem.dataset.botMessage;

    openHistoryConversation({
        id: historyId,
        user_message: userMessage,
        bot_message: botMessage
    });
}


function openHistoryConversation(conversation) {
    clearChatMessages();
    hideWelcomeScreen();

    appState.activeHistoryId = conversation.id;

    markActiveHistoryItem(conversation.id);

    appendUserMessage(
        conversation.user_message ||
        "Previous user message"
    );

    appendAssistantMessage(
        conversation.bot_message ||
        "No assistant response was stored."
    );

    messageInput.focus();
}


function markActiveHistoryItem(historyId) {
    const historyItems =
        historyList.querySelectorAll("[data-history-id]");

    historyItems.forEach((item) => {
        const isActive =
            String(item.dataset.historyId) ===
            String(historyId);

        item.classList.toggle("active", isActive);
    });
}


function clearActiveHistoryItem() {
    appState.activeHistoryId = null;

    historyList
        .querySelectorAll(".history-item.active")
        .forEach((item) => {
            item.classList.remove("active");
        });
}


/* ==========================================================
   New Chat
========================================================== */

function startNewChat() {
    if (appState.isWaiting) {
        return;
    }

    clearChatMessages();
    clearActiveHistoryItem();

    showWelcomeScreen();
    hideTypingIndicator();

    clearMessageInput();

    messageInput.focus();
}


/* ==========================================================
   Chat Container Utilities
========================================================== */

function clearChatMessages() {
    const messages = chatContainer.querySelectorAll(".message");

    messages.forEach((message) => {
        message.remove();
    });
}


function hideWelcomeScreen() {
    if (welcomeScreen) {
        welcomeScreen.classList.add("hidden");
    }
}


function showWelcomeScreen() {
    if (welcomeScreen) {
        welcomeScreen.classList.remove("hidden");
    }
}


/* ==========================================================
   Typing Indicator
========================================================== */

function showTypingIndicator() {
    typingIndicator.classList.remove("hidden");
    scrollToBottom();
}


function hideTypingIndicator() {
    typingIndicator.classList.add("hidden");
}


/* ==========================================================
   Textarea
========================================================== */

function autoResizeTextarea() {
    messageInput.style.height = "auto";

    const nextHeight = Math.min(
        messageInput.scrollHeight,
        MAX_TEXTAREA_HEIGHT
    );

    messageInput.style.height = `${nextHeight}px`;
}


function resetTextareaHeight() {
    messageInput.style.height =
        `${DEFAULT_TEXTAREA_HEIGHT}px`;
}


function clearMessageInput() {
    messageInput.value = "";

    resetTextareaHeight();
    updateSendButtonState();
}


function updateSendButtonState() {
    const hasMessage =
        normalizeMessage(messageInput.value).length > 0;

    sendButton.disabled =
        appState.isWaiting || !hasMessage;
}


/* ==========================================================
   Waiting State
========================================================== */

function setWaitingState(isWaiting) {
    appState.isWaiting = isWaiting;

    messageInput.disabled = isWaiting;
    sendButton.disabled = isWaiting;

    if (isWaiting) {
        sendButton.textContent = "Waiting...";
    } else {
        sendButton.textContent = "Send";

        updateSendButtonState();
        messageInput.focus();
    }
}


/* ==========================================================
   Scrolling
========================================================== */

function scrollToBottom(behavior = "smooth") {
    window.requestAnimationFrame(() => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior
        });
    });
}


/* ==========================================================
   Markdown Rendering
========================================================== */

function renderMarkdown(content) {
    const normalizedContent = normalizeMessage(content);

    if (!normalizedContent) {
        return "";
    }

    if (typeof marked === "undefined") {
        return `<p>${escapeHtml(normalizedContent)}</p>`;
    }

    try {
        const renderedHtml = marked.parse(normalizedContent);

        return sanitizeHtml(renderedHtml);
    } catch (error) {
        console.error("Markdown rendering failed:", error);

        return `<p>${escapeHtml(normalizedContent)}</p>`;
    }
}


function sanitizeHtml(html) {
    const parser = new DOMParser();

    const documentFragment = parser.parseFromString(
        html,
        "text/html"
    );

    const forbiddenElements = documentFragment.body.querySelectorAll(
        "script, style, iframe, object, embed, link, meta, form"
    );

    forbiddenElements.forEach((element) => {
        element.remove();
    });

    const allElements =
        documentFragment.body.querySelectorAll("*");

    allElements.forEach((element) => {
        [...element.attributes].forEach((attribute) => {
            const attributeName =
                attribute.name.toLowerCase();

            const attributeValue =
                attribute.value.trim().toLowerCase();

            if (attributeName.startsWith("on")) {
                element.removeAttribute(attribute.name);
            }

            if (
                ["href", "src", "xlink:href"].includes(
                    attributeName
                ) &&
                attributeValue.startsWith("javascript:")
            ) {
                element.removeAttribute(attribute.name);
            }
        });
    });

    documentFragment.body
        .querySelectorAll("a")
        .forEach((link) => {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        });

    return documentFragment.body.innerHTML;
}


function highlightCodeBlocks(container) {
    if (!container || typeof hljs === "undefined") {
        return;
    }

    container.querySelectorAll("pre code").forEach(
        (codeBlock) => {
            if (codeBlock.dataset.highlighted) {
                return;
            }

            try {
                hljs.highlightElement(codeBlock);
            } catch (error) {
                console.warn(
                    "Code highlighting failed:",
                    error
                );
            }
        }
    );
}


/* ==========================================================
   Simulated Streaming
========================================================== */

function splitTextIntoChunks(content) {
    const words = content.split(/(\s+)/);
    const chunks = [];

    let currentChunk = "";

    words.forEach((word) => {
        currentChunk += word;

        if (
            currentChunk.length >= 8 ||
            /[.!?,;:\n]$/.test(currentChunk)
        ) {
            chunks.push(currentChunk);
            currentChunk = "";
        }
    });

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}


function calculateStreamingDelay(chunk) {
    if (chunk.includes("\n")) {
        return 25;
    }

    return Math.min(
        45,
        Math.max(8, chunk.length * 1.5)
    );
}


function wait(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}


/* ==========================================================
   Text Utilities
========================================================== */

function normalizeMessage(value) {
    return typeof value === "string"
        ? value.trim()
        : "";
}


function truncateText(value, maxLength = 42) {
    const normalizedValue = normalizeMessage(value);

    if (normalizedValue.length <= maxLength) {
        return normalizedValue;
    }

    return (
        `${normalizedValue
            .slice(0, maxLength)
            .trim()}…`
    );
}


function escapeHtml(value) {
    const element = document.createElement("div");

    element.textContent = String(value);

    return element.innerHTML;
}


/* ==========================================================
   Clipboard
========================================================== */

async function copyTextToClipboard(text) {
    const normalizedText =
        typeof text === "string" ? text : String(text);

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {
        await navigator.clipboard.writeText(
            normalizedText
        );

        return;
    }

    const temporaryTextarea =
        document.createElement("textarea");

    temporaryTextarea.value = normalizedText;
    temporaryTextarea.setAttribute("readonly", "");
    temporaryTextarea.style.position = "fixed";
    temporaryTextarea.style.opacity = "0";

    document.body.appendChild(temporaryTextarea);

    temporaryTextarea.select();

    const copied = document.execCommand("copy");

    temporaryTextarea.remove();

    if (!copied) {
        throw new Error(
            "Clipboard access is unavailable."
        );
    }
}
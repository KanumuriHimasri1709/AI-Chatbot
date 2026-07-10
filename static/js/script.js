let conversationId = null;
let allConversations = [];
let deleteTargetId = null;
let autoScroll = true;
let showTyping = true;

const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typing = document.getElementById("typing");
const newChatBtn = document.getElementById("newChatBtn");
const conversationList = document.getElementById("conversationList");
const pinnedList = document.getElementById("pinnedList");
const pinnedSection = document.getElementById("pinnedSection");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const searchInput = document.getElementById("searchInput");

// Settings
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const clearAllBtn = document.getElementById("clearAllBtn");
const enterToSendCheckbox = document.getElementById("enterToSend");
const themeRadios = document.querySelectorAll("input[name='theme']");

// Modals
const deleteModal = document.getElementById("deleteModal");
const clearAllModal = document.getElementById("clearAllModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
const cancelClearAll = document.getElementById("cancelClearAll");
const confirmClearAll = document.getElementById("confirmClearAll");

// ---------------------
// Initialize Theme
// ---------------------
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    applyTheme(savedTheme);
    
    // Set radio button
    document.querySelector(`input[value="${savedTheme}"]`).checked = true;
}

function applyTheme(theme) {
    document.body.classList.remove("dark-theme", "light-theme");
    document.body.classList.add(`${theme}-theme`);
    localStorage.setItem("theme", theme);
}

// Theme radio buttons
themeRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
        applyTheme(e.target.value);
    });
});

// ---------------------
// Settings Panel
// ---------------------
settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.add("open");
});

closeSettings.addEventListener("click", () => {
    settingsPanel.classList.remove("open");
});

// Close settings when clicking outside
document.addEventListener("click", (e) => {
    if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
        settingsPanel.classList.remove("open");
    }
});

// Enter to Send
enterToSendCheckbox.addEventListener("change", () => {
    const status = document.getElementById("enterToSendStatus");
    status.textContent = enterToSendCheckbox.checked ? "Enabled" : "Disabled";
    localStorage.setItem("enterToSend", enterToSendCheckbox.checked);
});

// Load Enter to Send preference
if (localStorage.getItem("enterToSend") === "false") {
    enterToSendCheckbox.checked = false;
    document.getElementById("enterToSendStatus").textContent = "Disabled";
}

// Auto Scroll
const autoScrollCheckbox = document.querySelector("input#autoScroll");
if (autoScrollCheckbox) {
    autoScroll = localStorage.getItem("autoScroll") !== "false";
    autoScrollCheckbox.checked = autoScroll;
    
    autoScrollCheckbox.addEventListener("change", () => {
        autoScroll = autoScrollCheckbox.checked;
        localStorage.setItem("autoScroll", autoScroll);
    });
}

// Typing Indicator
const typingCheckbox = document.querySelector("input#typingIndicator");
if (typingCheckbox) {
    showTyping = localStorage.getItem("showTyping") !== "false";
    typingCheckbox.checked = showTyping;
    
    typingCheckbox.addEventListener("change", () => {
        showTyping = typingCheckbox.checked;
        localStorage.setItem("showTyping", showTyping);
    });
}

// ---------------------
// Clear All Chats
// ---------------------
clearAllBtn.addEventListener("click", () => {
    clearAllModal.classList.add("show");
});

cancelClearAll.addEventListener("click", () => {
    clearAllModal.classList.remove("show");
});

confirmClearAll.addEventListener("click", async () => {
    await fetch("/clear-all", { method: "DELETE" });
    conversationId = null;
    chatBox.innerHTML = "";
    loadHistory();
    clearAllModal.classList.remove("show");
    settingsPanel.classList.remove("open");
});

// ---------------------
// Sidebar Toggle
// ---------------------
sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
});

// ---------------------
// Search Chats
// ---------------------
searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const items = document.querySelectorAll("#conversationList li, #pinnedList li");
    
    items.forEach(item => {
        const title = item.querySelector("span").textContent.toLowerCase();
        if (title.includes(searchTerm)) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
});

// ---------------------
// Add Message with Markdown Support
// ---------------------
function addMessage(sender, message) {

    const div = document.createElement("div");

    div.classList.add("message");

    if (sender === "user") {
        div.classList.add("user");
        div.textContent = message;
    } else {
        div.classList.add("bot");
        
        // Simple markdown: **bold**, code blocks, lists
        let formattedMessage = message
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
            .replace(/^- (.*?)$/gm, "<li>$1</li>");
        
        div.innerHTML = formattedMessage;
        
        // Add copy button for AI responses
        const copyBtn = document.createElement("button");
        copyBtn.classList.add("copy-btn");
        copyBtn.textContent = "📋 Copy";
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(message);
            copyBtn.textContent = "✅ Copied!";
            setTimeout(() => { copyBtn.textContent = "📋 Copy"; }, 2000);
        };
        div.appendChild(copyBtn);
    }

    chatBox.appendChild(div);

    if (autoScroll) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// ---------------------
// Send Message
// ---------------------
async function sendMessage() {

    const message = messageInput.value.trim();

    if (message === "") return;

    addMessage("user", message);

    messageInput.value = "";

    if (showTyping) {
        typing.style.display = "block";
    }

    try {

        const response = await fetch("/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                message: message,

                conversation_id: conversationId

            })

        });

        const data = await response.json();

        typing.style.display = "none";

        addMessage("assistant", data.reply);

        conversationId = data.conversation_id;

        loadHistory();

    } catch (error) {

        typing.style.display = "none";

        addMessage("assistant", "❌ Error connecting to server.");

    }

}

// ---------------------
// Enter Key
// ---------------------
messageInput.addEventListener("keypress", function(event){

    if(event.key==="Enter" && enterToSendCheckbox.checked){

        sendMessage();

    }

});

// ---------------------
// Send Button
// ---------------------
sendBtn.addEventListener("click", sendMessage);

// ---------------------
// New Chat
// ---------------------
newChatBtn.addEventListener("click", ()=>{

    conversationId = null;

    chatBox.innerHTML="";
    
    messageInput.focus();

});

// ---------------------
// Load History
// ---------------------
async function loadHistory(){

    const response = await fetch("/history");

    const history = await response.json();
    
    allConversations = history;

    conversationList.innerHTML="";
    pinnedList.innerHTML="";

    const pinnedChats = history.filter(chat => chat.pinned === 1);
    const unpinnedChats = history.filter(chat => chat.pinned === 0);

    // Show/hide pinned section
    if (pinnedChats.length > 0) {
        pinnedSection.style.display = "block";
        pinnedChats.forEach(chat => {
            createChatItem(chat, pinnedList, true);
        });
    } else {
        pinnedSection.style.display = "none";
    }

    // Add unpinned chats
    unpinnedChats.forEach(chat => {
        createChatItem(chat, conversationList, false);
    });

}

// ---------------------
// Create Chat Item
// ---------------------
function createChatItem(chat, parentList, isPinned) {

    const li = document.createElement("li");
    
    // Add active class if this is the current conversation
    if (chat.id === conversationId) {
        li.classList.add("active");
    }
    
    const titleSpan = document.createElement("span");
    titleSpan.textContent = chat.title;
    titleSpan.style.cursor = "pointer";
    titleSpan.onclick = (e) => {
        e.stopPropagation();
        loadConversation(chat.id);
    };
    
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "5px";
    
    const pinBtn = document.createElement("button");
    pinBtn.classList.add("pin-btn");
    pinBtn.textContent = chat.pinned ? "📌" : "📍";
    pinBtn.onclick = (e) => {
        e.stopPropagation();
        pinChat(chat.id);
    };
    
    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.textContent = "🗑";
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        showDeleteConfirm(chat.id);
    };
    
    buttonContainer.appendChild(pinBtn);
    buttonContainer.appendChild(deleteBtn);
    
    li.appendChild(titleSpan);
    li.appendChild(buttonContainer);
    
    parentList.appendChild(li);

}

// ---------------------
// Load Conversation
// ---------------------
async function loadConversation(id){

    conversationId=id;

    chatBox.innerHTML="";

    const response=await fetch(`/conversation/${id}`);

    const messages=await response.json();

    messages.forEach(msg=>{

        addMessage(msg.sender,msg.message);

    });
    
    loadHistory();

}

// ---------------------
// Pin Chat
// ---------------------
async function pinChat(id) {
    await fetch(`/pin/${id}`, { method: "POST" });
    loadHistory();
}

// ---------------------
// Delete Chat Confirmation
// ---------------------
function showDeleteConfirm(id) {
    deleteTargetId = id;
    deleteModal.classList.add("show");
}

cancelDelete.addEventListener("click", () => {
    deleteModal.classList.remove("show");
    deleteTargetId = null;
});

confirmDelete.addEventListener("click", async () => {
    if (deleteTargetId) {
        await deleteChat(deleteTargetId);
        deleteModal.classList.remove("show");
    }
    deleteTargetId = null;
});

// Close modal when clicking outside
deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
        deleteModal.classList.remove("show");
        deleteTargetId = null;
    }
});

clearAllModal.addEventListener("click", (e) => {
    if (e.target === clearAllModal) {
        clearAllModal.classList.remove("show");
    }
});

// ---------------------
// Delete Chat
// ---------------------
async function deleteChat(id){

    await fetch(`/delete/${id}`,{

        method:"DELETE"

    });

    if(conversationId===id){

        conversationId=null;

        chatBox.innerHTML="";

    }

    loadHistory();

}

// ---------------------
// Initialize App
// ---------------------
initTheme();
loadHistory();

// ---------------------
// File Upload Handling
// ---------------------
let uploadedFile = null;

const attachmentBtn = document.getElementById("attachmentBtn");
const fileInput = document.getElementById("fileInput");
const filePreview = document.getElementById("filePreview");
const fileIcon = document.getElementById("fileIcon");
const fileName = document.getElementById("fileName");
const removeFileBtn = document.getElementById("removeFileBtn");

attachmentBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Store the uploaded file information
            uploadedFile = {
                filename: data.filename,
                content: data.content,
                icon: data.icon,
                type: data.type
            };

            // Show file preview
            fileIcon.textContent = data.icon;
            fileName.textContent = data.filename;
            filePreview.style.display = "flex";

            // Optionally, populate the message input with a suggestion
            if (!messageInput.value) {
                if (data.type === "pdf") {
                    messageInput.value = `Analyze this ${data.filename}`;
                } else if (data.type in {"jpg": 1, "jpeg": 1, "png": 1}) {
                    messageInput.value = `Analyze this image`;
                } else if (data.type === "csv") {
                    messageInput.value = `Analyze this CSV data`;
                } else if (data.type === "xlsx") {
                    messageInput.value = `Analyze this spreadsheet`;
                } else {
                    messageInput.value = `Analyze this document`;
                }
            }
        } else {
            alert("Error uploading file: " + (data.error || "Unknown error"));
        }
    } catch (error) {
        alert("Error uploading file: " + error.message);
    }

    // Reset file input
    fileInput.value = "";
});

removeFileBtn.addEventListener("click", () => {
    uploadedFile = null;
    filePreview.style.display = "none";
    fileInput.value = "";
});

// Modify sendMessage to include file content
const originalSendMessage = sendMessage;
async function sendMessage() {
    const message = messageInput.value.trim();

    if (message === "" && !uploadedFile) return;

    let fullMessage = message;

    // If file is attached, include its content
    if (uploadedFile) {
        fullMessage += `\n\n[File: ${uploadedFile.filename}]\n${uploadedFile.content}`;
    }

    addMessage("user", message || `Attached: ${uploadedFile.filename}`);

    messageInput.value = "";
    uploadedFile = null;
    filePreview.style.display = "none";

    if (showTyping) {
        typing.style.display = "block";
    }

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: fullMessage,
                conversation_id: conversationId
            })
        });

        const data = await response.json();

        typing.style.display = "none";

        addMessage("assistant", data.reply);

        conversationId = data.conversation_id;

        loadHistory();

    } catch (error) {
        typing.style.display = "none";
        addMessage("assistant", "❌ Error connecting to server.");
    }
}

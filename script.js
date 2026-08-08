/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Replace this URL with your actual Cloudflare Worker endpoint.
// The worker should forward the request to OpenAI and return the JSON response.
const WORKER_URL = "https://08-prj-loreal-chatbot.omololuayobanji.workers.dev/";

const messages = [
  {
    role: "system",
    content:
      "You are a friendly L’Oréal beauty assistant. Only answer questions about L’Oréal products, beauty routines, and related recommendations. If the user asks about anything unrelated to L’Oréal, beauty products, skincare, haircare, cosmetics, routines, or fragrance, politely refuse and explain that you only support L’Oréal product and beauty guidance.",
  },
];

let userName = "";
const pastQuestions = [];

function extractUserName(text) {
  const patterns = [
    /my name is ([A-Z][a-z]+)/i,
    /I am ([A-Z][a-z]+)/i,
    /I'm ([A-Z][a-z]+)/i,
    /this is ([A-Z][a-z]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return "";
}

function updateSystemMessage() {
  let contextText =
    "You are a friendly L’Oréal beauty assistant. Only answer questions about L’Oréal products, beauty routines, and related recommendations. If the user asks about anything unrelated to L’Oréal, beauty products, skincare, haircare, cosmetics, routines, or fragrance, politely refuse and explain that you only support L’Oréal product and beauty guidance.";

  if (userName) {
    contextText += ` The user’s name is ${userName}.`;
  }

  if (pastQuestions.length > 0) {
    contextText += ` The user has asked about: ${pastQuestions.join(", ")}. Remember this context so your responses remain helpful and natural in multiple turns.`;
  }

  messages[0].content = contextText;
}

const latestQuestionElement = document.getElementById("latestQuestion");

function appendMessage(role, text) {
  const messageElement = document.createElement("div");
  messageElement.className = `msg ${role}`;
  messageElement.textContent = text;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setChatIntro() {
  chatWindow.innerHTML = "";
  appendMessage(
    "ai",
    "👋 Hello! I’m your L’Oréal Smart Product Advisor. I can remember your name and past questions for a more natural conversation.",
  );
}

async function sendMessageToOpenAI(userText) {
  const requestBody = {
    messages: [...messages, { role: "user", content: userText }],
  };

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const userText = userInput.value.trim();
  if (!userText) return;

  const detectedName = extractUserName(userText);
  if (detectedName && !userName) {
    userName = detectedName;
  }

  pastQuestions.push(userText);
  updateSystemMessage();

  latestQuestionElement.textContent = `Your latest question: ${userText}`;
  latestQuestionElement.classList.remove("hidden");
  appendMessage("user", userText);
  userInput.value = "";
  appendMessage("ai", "Typing... please wait.");

  try {
    const assistantText = await sendMessageToOpenAI(userText);
    messages.push({ role: "user", content: userText });
    messages.push({ role: "assistant", content: assistantText });

    const typingMessage = chatWindow.querySelector(".msg.ai:last-child");
    if (
      typingMessage &&
      typingMessage.textContent === "Typing... please wait."
    ) {
      typingMessage.textContent = assistantText;
    } else {
      appendMessage("ai", assistantText);
    }
  } catch (error) {
    const typingMessage = chatWindow.querySelector(".msg.ai:last-child");
    if (
      typingMessage &&
      typingMessage.textContent === "Typing... please wait."
    ) {
      typingMessage.textContent =
        "Sorry, something went wrong. Please try again.";
    } else {
      appendMessage("ai", "Sorry, something went wrong. Please try again.");
    }
    console.error("OpenAI request failed:", error);
  }
});

setChatIntro();

/**
 * DV Dream Homes AI Chatbot Widget
 * Uses the existing chat-float button as the trigger.
 */

class DVChatbot {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.isLoading = false;
    this.model = 'llama-3.1-8b-instant';
    this.apiEndpoint = '/api/chatbot';

    this.init();
  }

  init() {
    this.createChatPanel();

    const existingChatButton = document.querySelector('.chat-float');
    if (existingChatButton) {
      existingChatButton.href = '#';
      existingChatButton.onclick = (event) => {
        event.preventDefault();
        this.toggle();
        return false;
      };
    }

    this.attachEventListeners();
  }

  createChatPanel() {
    const container = document.createElement('div');
    container.id = 'dv-chatbot-container';

    const panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.id = 'dv-chat-panel';

    panel.innerHTML = `
      <div class="chat-header">
        <h3 class="chat-header-title">Assistant</h3>
        <button class="chat-close-btn" id="dv-chat-close" aria-label="Close chat">
          &times;
        </button>
      </div>

      <div class="chat-messages" id="dv-chat-messages">
        <div class="chat-message bot">
          <div class="message-bubble bot">
            Hi! I'm the DV Dream Homes assistant. How can I help you today?
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <input
          type="text"
          class="chat-input-field"
          id="dv-chat-input"
          placeholder="Type your message..."
          aria-label="Chat message input"
        >
        <button
          class="chat-send-btn"
          id="dv-chat-send"
          aria-label="Send message"
        >
          &#8593;
        </button>
      </div>
    `;

    container.appendChild(panel);
    document.body.appendChild(container);

    this.panel = panel;
    this.messagesContainer = document.getElementById('dv-chat-messages');
    this.inputField = document.getElementById('dv-chat-input');
    this.sendButton = document.getElementById('dv-chat-send');
    this.closeButton = document.getElementById('dv-chat-close');
  }

  attachEventListeners() {
    this.closeButton.addEventListener('click', () => this.close());
    this.sendButton.addEventListener('click', () => this.sendMessage());

    this.inputField.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
    });

    this.inputField.addEventListener('input', () => {
      this.inputField.style.height = 'auto';
      this.inputField.style.height = Math.min(this.inputField.scrollHeight, 80) + 'px';
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.panel.classList.add('open');
    this.inputField.focus();

    const existingChatButton = document.querySelector('.chat-float');
    if (existingChatButton) {
      existingChatButton.innerHTML = '<i class="fas fa-times"></i>';
    }
  }

  close() {
    this.isOpen = false;
    this.panel.classList.remove('open');

    const existingChatButton = document.querySelector('.chat-float');
    if (existingChatButton) {
      existingChatButton.innerHTML = '<i class="fas fa-comment-dots"></i>';
    }
  }

  async sendMessage() {
    const message = this.inputField.value.trim();

    if (!message || this.isLoading) {
      return;
    }

    this.addMessageToUI(message, 'user');

    this.inputField.value = '';
    this.inputField.style.height = 'auto';
    this.sendButton.disabled = true;
    this.isLoading = true;

    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    try {
      const response = await this.callGeminiAPI(message);

      this.addMessageToUI(response, 'bot');
      this.conversationHistory.push({
        role: 'bot',
        content: response
      });
    } catch (error) {
      console.error('Chat error:', error);
      this.addMessageToUI(
        'Sorry, I encountered an error. Please try again or contact us at sales@dvdreamhomes.info',
        'bot',
        true
      );
    } finally {
      this.sendButton.disabled = false;
      this.isLoading = false;
      this.inputField.focus();
    }
  }

  async callGeminiAPI(userMessage) {
    const recentHistory = this.conversationHistory.slice(-4).map((message) => ({
      role: message.role,
      content: String(message.content || '').trim().slice(0, 320)
    }));

    this.showTypingIndicator();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: recentHistory
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'API request failed');
      }

      const data = await response.json();
      this.removeTypingIndicator();

      if (data.ok && typeof data.text === 'string' && data.text.trim()) {
        return data.text.trim();
      }

      throw new Error('Unexpected API response format');
    } catch (error) {
      this.removeTypingIndicator();
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  addMessageToUI(content, sender, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `message-bubble ${sender}`;

    if (isError) {
      bubbleDiv.className += ' chat-error';
    }

    bubbleDiv.textContent = content;
    messageDiv.appendChild(bubbleDiv);

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot';
    messageDiv.id = 'dv-typing-indicator';

    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'typing-indicator';
    indicatorDiv.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;

    messageDiv.appendChild(indicatorDiv);
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('dv-typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 0);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.dvChatbot = new DVChatbot();
});

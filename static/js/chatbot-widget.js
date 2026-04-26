/**
 * DV Dream Homes AI Chatbot Widget
 * Integrates with Google Gemini API
 * Uses existing chat-float button as trigger
 */

class DVChatbot {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.isLoading = false;
    this.model = 'gemini-flash-lite-latest';
    this.apiEndpoint = '/api/chatbot';

    // Comprehensive system prompt with DV Dream Homes information
    this.systemPrompt = `You are the DV Dream Homes customer service AI assistant. You represent DV Dream Homes, a premium real estate company in Chennai specializing in luxury apartments, villas, and custom residences.

ABOUT DV DREAM HOMES:
- Founded: 2023
- Location: 63, New No 56, Surapet Main Road, Surapet, Chennai - 600 066, Tamil Nadu
- Phone: +91 8778755146
- Email: sales@dvdreamhomes.info
- Specialties: Premium apartments, villas, custom residences
- Core values: Quality construction, clear delivery timelines, dependable service, customer-first philosophy

ONGOING PROJECTS:
1. DV Emerald (New Launch)
   - Description: A refined residential address planned for comfort, convenience, and long-term value
   - Location: Surapet
   - Type: Premium homes
   - Features: Refined finishes, practical maintenance, family-focused design

2. DV Marina (Ongoing)
   - Description: Smart residential planning with modern amenities families expect
   - Focus: Modern living, quality build
   - Features: Exceptional quality standards, end-to-end transparency

3. DV Empire (Upcoming)
   - Description: Future-ready development with strong foundations and elegant spaces
   - Status: Upcoming
   - Focus: Family-focused, premium development

COMPLETED PROJECTS:
- Multiple successfully delivered projects in Chennai with high customer satisfaction

YOUR BEHAVIOR:
- If a user just says a general greeting (like "hi", "hello"), respond naturally and briefly, then ask how you can help.
- Answer ONLY the specific question asked. Do not add unnecessary information, extra details, or unsolicited advice unless explicitly asked.
- Keep your replies extremely concise, direct, and highly readable.
- Be friendly, simple, and conversational. Speak like a real, helpful human assistant.
- Do not write long, dense paragraphs. If an answer requires multiple points, use a short bulleted list.
- Only suggest contacting the sales team if you absolutely cannot answer the user's question, or if they explicitly ask to contact a human.

IMPORTANT: You represent DV Dream Homes directly. Answer all questions from this perspective.
CRITICAL CONSTRAINT: You must ONLY provide 100% accurate, factual information based on the context above. NEVER invent, guess, or hallucinate details, prices, or timelines. If a user asks something you do not know the exact factual answer to, do not guess—simply state that you don't have that specific information and politely direct them to contact sales@dvdreamhomes.info or call +91 8778755146.`;

    this.init();
  }

  /**
   * Initialize the chatbot by using the existing chat-float button
   */
  init() {
    // Create the chat panel UI
    this.createChatPanel();
    
    // Find and setup the existing chat-float button
    const existingChatButton = document.querySelector('.chat-float');
    if (existingChatButton) {
      // Remove the link behavior
      existingChatButton.href = '#';
      existingChatButton.onclick = (e) => {
        e.preventDefault();
        this.toggle();
        return false;
      };
    }
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Create the chat panel UI (only the panel, not the button)
   */
  createChatPanel() {
    // Create container for chat panel
    const container = document.createElement('div');
    container.id = 'dv-chatbot-container';

    // Create chat panel
    const panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.id = 'dv-chat-panel';

    panel.innerHTML = `
      <div class="chat-header">
        <h3 class="chat-header-title">DV Assistant</h3>
        <button class="chat-close-btn" id="dv-chat-close" aria-label="Close chat">
          ✕
        </button>
      </div>
      
      <div class="chat-messages" id="dv-chat-messages">
        <div class="chat-message bot">
          <div class="message-bubble bot">
            Hi! 👋 I'm the DV Dream Homes assistant. How can I help you today?
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
          ↑
        </button>
      </div>
    `;

    container.appendChild(panel);
    document.body.appendChild(container);

    // Store references to DOM elements
    this.panel = panel;
    this.messagesContainer = document.getElementById('dv-chat-messages');
    this.inputField = document.getElementById('dv-chat-input');
    this.sendButton = document.getElementById('dv-chat-send');
    this.closeButton = document.getElementById('dv-chat-close');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.closeButton.addEventListener('click', () => this.close());
    this.sendButton.addEventListener('click', () => this.sendMessage());
    
    // Send message on Enter key
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize input field
    this.inputField.addEventListener('input', () => {
      this.inputField.style.height = 'auto';
      this.inputField.style.height = Math.min(this.inputField.scrollHeight, 80) + 'px';
    });
  }

  /**
   * Toggle chat panel open/close
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open chat panel
   */
  open() {
    this.isOpen = true;
    this.panel.classList.add('open');
    this.inputField.focus();
    
    const existingChatButton = document.querySelector('.chat-float');
    if (existingChatButton) {
      existingChatButton.innerHTML = '<i class="fas fa-times"></i>';
    }
  }

  /**
   * Close chat panel
   */
  close() {
    this.isOpen = false;
    this.panel.classList.remove('open');
    
    const existingChatButton = document.querySelector('.chat-float');
    if (existingChatButton) {
      existingChatButton.innerHTML = '<i class="fas fa-comment-dots"></i>';
    }
  }

  /**
   * Send message to the backend chatbot endpoint
   */
  async sendMessage() {
    const message = this.inputField.value.trim();
    
    if (!message || this.isLoading) {
      return;
    }

    // Add user message to UI
    this.addMessageToUI(message, 'user');
    
    // Clear input
    this.inputField.value = '';
    this.inputField.style.height = 'auto';
    this.sendButton.disabled = true;
    this.isLoading = true;

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    try {
      // Get response from Gemini
      const response = await this.callGeminiAPI(message);
      
      // Add bot response to UI
      this.addMessageToUI(response, 'bot');
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'bot',
        content: response
      });
    } catch (error) {
      console.error('Chat error:', error);
      this.addMessageToUI(`Sorry, I encountered an error. Please try again or contact us at sales@dvdreamhomes.info`, 'bot', true);
    } finally {
      this.sendButton.disabled = false;
      this.isLoading = false;
      this.inputField.focus();
    }
  }

  /**
   * Call backend chatbot endpoint with improved prompt engineering
   */
  async callGeminiAPI(userMessage) {
    // Build a more structured prompt with explicit instructions
    let prompt = this.systemPrompt + '\n\n';
    
    // Add recent conversation history
    const recentHistory = this.conversationHistory.slice(-8);
    if (recentHistory.length > 0) {
      prompt += 'CONVERSATION HISTORY:\n';
      recentHistory.forEach(msg => {
        if (msg.role === 'user') {
          prompt += `User: ${msg.content}\n`;
        } else {
          prompt += `DV Assistant: ${msg.content}\n`;
        }
      });
      prompt += '\n';
    }

    // Add current user message with explicit instruction
    prompt += `User: ${userMessage}\n`;
    prompt += `DV Assistant:`;

    // Show typing indicator
    this.showTypingIndicator();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'API request failed');
      }

      const data = await response.json();

      // Remove typing indicator
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

  /**
   * Add message to UI
   */
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

  /**
   * Show typing indicator
   */
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

  /**
   * Remove typing indicator
   */
  removeTypingIndicator() {
    const indicator = document.getElementById('dv-typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Auto-scroll to latest message
   */
  scrollToBottom() {
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 0);
  }
}

/**
 * Initialize chatbot when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  window.dvChatbot = new DVChatbot();
});

/**
 * Add to window for manual initialization if needed
 * Usage: window.dvChatbot = new DVChatbot()
 */

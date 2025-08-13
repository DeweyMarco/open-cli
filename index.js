import * as readline from 'readline';
import { stdin as input, stdout as output } from 'process';

// Conversation histories for each model
const conversations = {
  gemini: [],
  claude: []
};

// API keys from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Create readline interface
const rl = readline.createInterface({ input, output });

// Track Ctrl-C presses
let ctrlCCount = 0;

// Handle Ctrl-C through readline interface
rl.on('SIGINT', () => {
  ctrlCCount++;
  if (ctrlCCount >= 2) {
    console.log('\nGoodbye!');
    rl.close();
    process.exit(0);
  } else {
    console.log('\nPress Ctrl-C again to quit');
    setTimeout(() => { ctrlCCount = 0; }, 2000);
  }
});

// Reset counter on any line input (Enter key)
rl.on('line', () => {
  ctrlCCount = 0;
});

// Detect which model is being requested
function detectModel(input) {
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('@gemini')) {
    return 'gemini';
  } else if (lowerInput.includes('@claude')) {
    return 'claude';
  }
  return null;
}

// Call Gemini API
async function callGemini(message) {
  if (!GEMINI_API_KEY) {
    return 'Error: GEMINI_API_KEY not set in environment variables';
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          ...conversations.gemini,
          {
            role: 'user',
            parts: [{ text: message }]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return `Error: ${data.error.message}`;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    
    // Update conversation history
    conversations.gemini.push(
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: reply }] }
    );

    return reply;
  } catch (error) {
    return `Error calling Gemini API: ${error.message}`;
  }
}

// Call Claude API
async function callClaude(message) {
  if (!CLAUDE_API_KEY) {
    return 'Error: CLAUDE_API_KEY not set in environment variables';
  }

  try {
    const messages = [
      ...conversations.claude,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return `Error: ${data.error.message}`;
    }

    const reply = data.content?.[0]?.text || 'No response generated';
    
    // Update conversation history
    conversations.claude.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );

    return reply;
  } catch (error) {
    return `Error calling Claude API: ${error.message}`;
  }
}

// Main function
async function main() {
  console.log('Open CLI (press Ctrl-C two times to quit)');
  console.log('\nAvailable models:');
  
  // Check and display Gemini status
  if (GEMINI_API_KEY) {
    console.log('  ✓ @Gemini');
  } else {
    console.log('  ✗ @Gemini - GEMINI_API_KEY not set');
  }
  
  // Check and display Claude status
  if (CLAUDE_API_KEY) {
    console.log('  ✓ @Claude');
  } else {
    console.log('  ✗ @Claude - CLAUDE_API_KEY not set');
  }
  
  console.log('');
  
  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (input.trim() === '') {
        askQuestion();
        return;
      }

      const model = detectModel(input);
      
      if (!model) {
        console.log('Please specify a model using @Gemini or @Claude');
        askQuestion();
        return;
      }

      // Remove the @ModelName mention from the message
      const cleanMessage = input.replace(/@(gemini|claude)/gi, '').trim();
      
      let response;
      if (model === 'gemini') {
        response = await callGemini(cleanMessage);
        console.log(`Gemini: ${response}`);
      } else if (model === 'claude') {
        response = await callClaude(cleanMessage);
        console.log(`Claude: ${response}`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

// Start the CLI
main().catch(console.error);
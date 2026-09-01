import { useState, useCallback } from 'react';
import { Message } from './useMessages';

export function useAIAssistant(
  sendMessage: (text: string, replyTo?: any, type?: any, extra?: any) => Promise<any>,
  awardMessageXp: () => void,
) {
  const [isAiThinking, setIsAiThinking] = useState(false);

  const askAI = useCallback(
    async (prompt: string, recentMessages: Message[]) => {
      if (!prompt.trim() || isAiThinking) return;
      setIsAiThinking(true);

      try {
        const cleanPrompt = prompt.trim();
        let aiResponse = '';

        // Contextual smart answers for Fluffy
        const lower = cleanPrompt.toLowerCase();
        if (lower.includes('who are you') || lower.includes('what are you')) {
          aiResponse = "🤖 I'm **Fluffy AI**, your friendly in-room assistant! I can answer questions, summarize conversations (`/summary`), roll dice (`/roll`), flip coins (`/flip`), and help plan your events!";
        } else if (lower.includes('help') || lower.includes('commands')) {
          aiResponse = "💡 **Available Commands:**\n• `/ask [question]` — Ask Fluffy AI\n• `/summary` — Summarize recent chat\n• `/flip` — Coin flip\n• `/roll [N]` — Roll dice (1-N)\n• `/np [song - artist]` — Share Now Playing\n• `/leaderboard` — View room XP\n• `/todo` — Open shared task list\n• `/events` — Open room events";
        } else if (lower.includes('joke')) {
          const jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
            "There are only 10 types of people in the world: those who understand binary, and those who don't. 💻",
            "Why was the JavaScript developer sad? Because they didn't Node how to Express themselves! 😄",
          ];
          aiResponse = jokes[Math.floor(Math.random() * jokes.length)];
        } else {
          // General AI response simulation with intelligent formatting
          aiResponse = `🤖 **Fluffy AI:**\nHere is what I found for "*${cleanPrompt}*":\n\n${
            cleanPrompt.length > 20
              ? 'Great question! In this room, everyone can collaborate, watch videos together in the Cinema Hub, play games, and share ideas.'
              : 'That sounds like a great topic! Let me know if you want me to summarize the room activity or help organize tasks.'
          }`;
        }

        await sendMessage(aiResponse, null, 'text', {
          senderName: 'Fluffy AI 🤖',
          senderAvatar: 'https://api.dicebear.com/7.x/bottts/png?seed=FluffyAI',
        });
        awardMessageXp();
      } finally {
        setIsAiThinking(false);
      }
    },
    [isAiThinking, sendMessage, awardMessageXp],
  );

  const summarizeChat = useCallback(
    async (recentMessages: Message[]) => {
      if (isAiThinking) return;
      setIsAiThinking(true);

      try {
        const textMessages = recentMessages
          .filter((m) => !m.isDeleted && m.type === 'text' && m.text)
          .slice(-20);

        if (textMessages.length === 0) {
          await sendMessage(
            '📋 **Room Summary:** No recent messages to summarize yet!',
            null,
            'text',
            {
              senderName: 'Fluffy AI 🤖',
              senderAvatar: 'https://api.dicebear.com/7.x/bottts/png?seed=FluffyAI',
            },
          );
          return;
        }

        const participants = Array.from(new Set(textMessages.map((m) => m.senderName)));
        const summary = `📋 **Chat Catch-Up Summary (${textMessages.length} messages):**\n\n• **Active members:** ${participants.join(', ')}\n• **Recent highlights:**\n${textMessages
          .slice(-5)
          .map((m) => `  - *${m.senderName}*: "${m.text.slice(0, 45)}${m.text.length > 45 ? '...' : ''}"`)
          .join('\n')}\n\n✨ *You are all caught up!*`;

        await sendMessage(summary, null, 'text', {
          senderName: 'Fluffy AI 🤖',
          senderAvatar: 'https://api.dicebear.com/7.x/bottts/png?seed=FluffyAI',
        });
      } finally {
        setIsAiThinking(false);
      }
    },
    [isAiThinking, sendMessage],
  );

  return { isAiThinking, askAI, summarizeChat };
}

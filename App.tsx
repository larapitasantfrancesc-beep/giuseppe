import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './constants';
import type { ChatMessage as ChatMessageType } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { BotIcon } from './components/icons/BotIcon';

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = useCallback(() => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API_KEY environment variable not set. Please set it in your Netlify site settings.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
      setChat(newChat);
      setMessages([
        {
          role: 'model',
          parts: [{ text: "Hola! Sóc en Giuseppe, preparat per ajudar-te amb la teva pizza. Vols una recomanació o vols saber quina promoció tenim avui? Bon profit!" }],
          id: Date.now().toString(),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred during initialization.");
      console.error(e);
    }
  }, []);

  useEffect(() => {
    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || !chat) return;

    setIsLoading(true);
    setError(null);

    const userMessage: ChatMessageType = {
      role: 'user',
      parts: [{ text: userInput }],
      id: Date.now().toString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');

    try {
      const stream = await chat.sendMessageStream({ message: userInput });

      let newBotMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        parts: [{ text: "" }],
      };
      setMessages(prev => [...prev, newBotMessage]);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          setMessages(prevMessages => {
            return prevMessages.map(msg =>
              msg.id === newBotMessage.id
                ? { ...msg, parts: [{ text: msg.parts[0].text + chunkText }] }
                : msg
            );
          });
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Error sending message: ${errorMessage}`);
      const errorBotMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        parts: [{ text: "Oops! Sembla que tinc problemes tècnics. Si us plau, intenta-ho de nou més tard." }],
      };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-800 font-sans">
      <header className="bg-white dark:bg-gray-900 shadow-md p-4 flex items-center space-x-4">
        <div className="p-2 bg-red-600 rounded-full text-white">
          <BotIcon />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Giuseppe</h1>
          <p className="text-sm text-green-500 dark:text-green-400">Online</p>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && messages[messages.length-1].role === 'user' && (
           <div className="flex justify-start items-end space-x-3">
             <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white flex-shrink-0">
               <BotIcon />
             </div>
             <div className="bg-white dark:bg-gray-700 p-3 rounded-lg rounded-bl-none shadow-sm">
                <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></span>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 text-center">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      <footer className="bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0">
        <ChatInput
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onSubmit={handleSendMessage}
          isLoading={isLoading}
        />
      </footer>
    </div>
  );
};

export default App;
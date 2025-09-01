import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const FeedbackButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);

  // Check rate limit on mount and when modal opens
  useEffect(() => {
    const checkCooldown = () => {
      const lastSubmit = localStorage.getItem('feedback_last_submit');
      if (lastSubmit) {
        const timeSinceSubmit = Date.now() - parseInt(lastSubmit);
        const cooldownTime = 1 * 60 * 1000; // 1 minute in ms
        if (timeSinceSubmit < cooldownTime) {
          setCooldownRemaining(Math.ceil((cooldownTime - timeSinceSubmit) / 1000));
        } else {
          setCooldownRemaining(0);
        }
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [isModalOpen]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isModalOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isModalOpen]);

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = e => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    const handleClickOutside = e => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

  const handleSubmit = async e => {
    e.preventDefault();

    // Validate message
    if (message.trim().length < 10) {
      toast.error('Please enter at least 10 characters');
      return;
    }

    if (cooldownRemaining > 0) {
      toast.error(`Please wait ${cooldownRemaining} seconds before sending another message`);
      return;
    }

    setIsSubmitting(true);

    try {
      const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error('Discord webhook URL not configured');
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: null,
          embeds: [
            {
              title: '📝 New Feedback',
              description: message.trim(),
              color: 0x5865f2, // Discord blurple
              fields: [
                {
                  name: '👤 Discord',
                  value: discordUsername.trim() || 'Anonymous',
                  inline: true,
                },
                {
                  name: '📍 Page',
                  value: window.location.pathname || '/',
                  inline: true,
                },
                {
                  name: '🕐 Time',
                  value: new Date().toLocaleString(),
                  inline: false,
                },
                {
                  name: '🖥️ Browser',
                  value: navigator.userAgent.split(' ').slice(-2).join(' ') || 'Unknown',
                  inline: false,
                },
              ],
              footer: {
                text: 'OSRS Flip Dashboard Feedback',
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }

      // Set rate limit
      localStorage.setItem('feedback_last_submit', Date.now().toString());

      // Success!
      toast.success('Thanks! I got your message');
      setMessage('');
      setDiscordUsername('');

      // Close modal after short delay
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to send feedback:', error);
      toast.error('Oops, something went wrong. Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCooldown = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 group"
        title="Send feedback"
      >
        <span className="text-lg">💬</span>
        <span className="text-sm font-medium">Feedback</span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            ref={modalRef}
            className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Send Feedback</h2>
              <p className="mt-1 text-sm text-gray-400">
                Got thoughts? Feature ideas? Issues? Just want to say hi? I'd love to hear from you!
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Message Field */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Your Message *
                </label>
                <textarea
                  ref={textareaRef}
                  id="message"
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 1000))}
                  placeholder="Type your message here..."
                  className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                  disabled={isSubmitting}
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>
                    {message.length < 10 && message.length > 0
                      ? `${10 - message.length} more characters needed`
                      : ''}
                  </span>
                  <span>{message.length}/1000</span>
                </div>
              </div>

              {/* Discord Username Field */}
              <div>
                <label htmlFor="discord" className="block text-sm font-medium text-gray-300 mb-2">
                  Discord Username
                </label>
                <input
                  id="discord"
                  type="text"
                  value={discordUsername}
                  onChange={e => setDiscordUsername(e.target.value)}
                  placeholder="Discord username (totally optional)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to stay anonymous - totally up to you!
                </p>
              </div>

              {/* Rate Limit Warning */}
              {cooldownRemaining > 0 && (
                <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    Please wait {formatCooldown(cooldownRemaining)} before sending another message
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || cooldownRemaining > 0 || message.trim().length < 10}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;

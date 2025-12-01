import { Plus, MessageSquare, X } from 'lucide-react';
import type { Conversation } from '../types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  isOpen: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;

  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) {
    const minutes = Math.max(1, Math.floor(diff / 60_000));
    return `${minutes}m ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.max(1, Math.floor(diff / 3_600_000));
    return `${hours}h ago`;
  }
  const days = Math.max(1, Math.floor(diff / 86_400_000));
  return `${days}d ago`;
}

export function Sidebar({
  conversations,
  activeConversationId,
  isOpen,
  onSelectConversation,
  onNewConversation,
  onClose,
}: SidebarProps) {
  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'} bg-[var(--bg-panel)] text-[var(--text-primary)]`}
      aria-label="Chat history"
    >
      <div className="sidebar-header">
        <button
          type="button"
          onClick={onNewConversation}
          className="new-chat-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span>New chat</span>
        </button>
        <button
          type="button"
          className="sidebar-close md:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Recent conversations">
        {conversations.length === 0 ? (
          <p className="sidebar-empty">No conversations yet</p>
        ) : (
          <ul className="conversation-list">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`conversation-item ${isActive ? 'is-active' : ''}`}
                  >
                    <MessageSquare className="h-4 w-4 flex-none" aria-hidden />
                    <div className="conversation-meta">
                      <span className="conversation-title">{conversation.title || 'New chat'}</span>
                      <span className="conversation-time">{formatRelativeTime(conversation.updatedAt)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatMessage({ message, isTyping }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* Avatar */}
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center mt-1">
                    <div className="w-4 h-4 rounded-full border border-zinc-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-zinc-50 rounded-full" />
                    </div>
                </div>
            )}

            {/* Bubble */}
            <div
                className={`max-w-[85%] rounded-lg px-4 py-2 text-[13px] ${isUser
                    ? 'bg-zinc-100 text-zinc-950 ml-12'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200 mr-12'
                    }`}
            >
                {/* Image if attached */}
                {message.image_url && (
                    <img
                        src={message.image_url}
                        alt="Attached"
                        className="max-w-full max-h-48 rounded-lg mb-2 object-cover"
                    />
                )}

                {/* Content */}
                {message.content ? (
                    isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div className="chat-markdown text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )
                ) : isTyping ? (
                    <div className="flex items-center gap-1 py-1">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                    </div>
                ) : null}
            </div>

            {/* User avatar hidden in modern sync style */}
        </div>
    );
}

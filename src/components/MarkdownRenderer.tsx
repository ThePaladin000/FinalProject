import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// import rehypeHighlight from 'rehype-highlight';
import { Components } from 'react-markdown';
import { safeUrl } from '../utils/safeUrl';
// import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
    const components: Components = {
        // Custom styling for different markdown elements
        h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold text-white mb-2">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-bold text-white mb-2">{children}</h4>,
        h5: ({ children }) => <h5 className="text-sm font-bold text-white mb-1">{children}</h5>,
        h6: ({ children }) => <h6 className="text-xs font-bold text-white mb-1">{children}</h6>,
        p: ({ children }) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-gray-300">{children}</li>,
        blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-300 mb-3">
                {children}
            </blockquote>
        ),
        code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return !isInline ? (
                <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto mb-3">
                    <code className={`${className} hljs`} {...props}>
                        {children}
                    </code>
                </pre>
            ) : (
                <code className="bg-gray-700 text-purple-300 px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                </code>
            );
        },
        pre: ({ children }) => (
            <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto mb-3">
                {children}
            </pre>
        ),
        a: ({ children, href }) => (
            <a
                href={safeUrl(href)}
                className="text-purple-400 hover:text-purple-300 underline"
                target="_blank"
                rel="noopener noreferrer"
            >
                {children}
            </a>
        ),
        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-200">{children}</em>,
        table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
                <table className="min-w-full border border-gray-700">
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
        tbody: ({ children }) => <tbody className="bg-gray-900">{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-gray-700">{children}</tr>,
        th: ({ children }) => <th className="px-4 py-2 text-left text-white font-semibold">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2 text-gray-300">{children}</td>,
        hr: () => <hr className="border-gray-700 my-4" />,
    };

    return (
        <div className={`prose prose-invert max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                // rehypePlugins={[rehypeHighlight]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
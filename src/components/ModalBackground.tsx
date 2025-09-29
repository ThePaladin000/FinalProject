import React, { useState, useEffect } from 'react';

interface ModalBackgroundProps {
    children: React.ReactNode;
    className?: string;
    onClose?: () => void;
}

export default function ModalBackground({ children, className = "", onClose }: ModalBackgroundProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.onload = () => setImageLoaded(true);
        img.onerror = () => setImageError(true);
        img.src = 'https://hxoioik70f.ufs.sh/f/0k2E79EeOiRXC9JT9EPZDyl0tX8EF2mnzs16kBHpQR9JiOYM';
    }, []);

    return (
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${className}`}
            onClick={onClose}
        >
            {/* Background Image Layer */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
                        url('https://hxoioik70f.ufs.sh/f/0k2E79EeOiRXC9JT9EPZDyl0tX8EF2mnzs16kBHpQR9JiOYM') center/cover no-repeat
                    `,
                    opacity: imageLoaded && !imageError ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                    pointerEvents: 'none'
                }}
            />

            {/* Content Layer */}
            <div 
                className="relative z-10 w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
} 
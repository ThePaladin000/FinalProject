import React, { useState, useEffect } from 'react';
import { KEYBOARD_CONSTANTS } from '@/config/constants';

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
        img.src = '/images/modal-background.png';
    }, []);

    // Handle ESC key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === KEYBOARD_CONSTANTS.ESCAPE_KEY && onClose) {
                onClose();
            }
        };

        if (onClose) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${className}`}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Modal dialog"
        >
            {/* Background Image Layer */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
                        url('/images/modal-background.png') center/cover no-repeat
                    `,
                    opacity: imageLoaded && !imageError ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                    pointerEvents: 'none'
                }}
                aria-hidden="true"
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
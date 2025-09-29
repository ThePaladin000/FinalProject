import React from 'react';

interface LargeLoadingSpinnerProps {
    size?: number;
    color?: string;
    thickness?: number;
    className?: string;
}

export default function LargeLoadingSpinner({
    size = 48,
    color = "#8b5cf6",
    thickness = 4,
    className = ""
}: LargeLoadingSpinnerProps) {
    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div
                className="animate-spin rounded-full border-solid border-current"
                style={{
                    width: size,
                    height: size,
                    borderWidth: thickness,
                    borderColor: `${color} transparent ${color} transparent`,
                }}
            />
        </div>
    );
} 
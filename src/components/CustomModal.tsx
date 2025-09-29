import React, { useEffect, useRef } from 'react';
import ModalBackground from './ModalBackground';

export interface ModalField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select';
    placeholder?: string | ((formData: Record<string, string>) => string);
    required?: boolean;
    defaultValue?: string;
    maxLength?: number;
    options?: Array<{ value: string; label: string }>;
}

export interface ModalAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
}

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fields: ModalField[];
    actions: ModalAction[];
    onSubmit: (data: Record<string, string>) => void;
    loading?: boolean;
}

export default function CustomModal({
    isOpen,
    onClose,
    title,
    fields,
    actions,
    onSubmit,
    loading = false
}: CustomModalProps) {
    const [formData, setFormData] = React.useState<Record<string, string>>({});
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const modalRef = useRef<HTMLDivElement>(null);

    // Initialize form data with default values
    useEffect(() => {
        if (isOpen) {
            const initialData: Record<string, string> = {};
            fields.forEach(field => {
                initialData[field.name] = field.defaultValue || '';
            });
            setFormData(initialData);
            setErrors({});
        }
    }, [isOpen, fields]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Handle Ctrl+Enter to submit form
    useEffect(() => {
        const handleCtrlEnter = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && event.ctrlKey) {
                // Prevent default behavior
                event.preventDefault();

                // Only submit if not currently loading
                if (!loading) {
                    // Validate required fields before submitting
                    const newErrors: Record<string, string> = {};
                    fields.forEach(field => {
                        if (field.required && (!formData[field.name] || formData[field.name].trim() === '')) {
                            newErrors[field.name] = `${field.label} is required`;
                        }
                    });

                    if (Object.keys(newErrors).length > 0) {
                        setErrors(newErrors);
                        return;
                    }

                    onSubmit(formData);
                }
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleCtrlEnter);
        }

        return () => {
            document.removeEventListener('keydown', handleCtrlEnter);
        };
    }, [isOpen, loading, fields, formData, onSubmit]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleInputChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        const newErrors: Record<string, string> = {};
        fields.forEach(field => {
            if (field.required && (!formData[field.name] || formData[field.name].trim() === '')) {
                newErrors[field.name] = `${field.label} is required`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <ModalBackground className="p-4">
            <div
                ref={modalRef}
                className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                            disabled={loading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {fields.map((field) => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {field.label}
                                    {field.required && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        placeholder={
                                            typeof field.placeholder === 'function'
                                                ? field.placeholder(formData)
                                                : field.placeholder
                                        }
                                        maxLength={field.maxLength}
                                        className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${errors[field.name] ? 'border-red-500' : 'border-gray-600'
                                            }`}
                                        rows={3}
                                        disabled={loading}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors[field.name] ? 'border-red-500' : 'border-gray-600'
                                            }`}
                                        disabled={loading}
                                    >
                                        {field.options?.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        placeholder={
                                            typeof field.placeholder === 'function'
                                                ? field.placeholder(formData)
                                                : field.placeholder
                                        }
                                        maxLength={field.maxLength}
                                        className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors[field.name] ? 'border-red-500' : 'border-gray-600'
                                            }`}
                                        disabled={loading}
                                    />
                                )}
                                {errors[field.name] && (
                                    <p className="text-red-400 text-sm mt-1">{errors[field.name]}</p>
                                )}
                                {field.maxLength && (
                                    <p className="text-gray-500 text-xs mt-1">
                                        {(formData[field.name] || '').length}/{field.maxLength}
                                    </p>
                                )}
                            </div>
                        ))}

                        <div className="flex items-center justify-end gap-3 pt-4">
                            {actions.map((action, index) => (
                                <button
                                    key={index}
                                    type={action.label.toLowerCase().includes('cancel') ? 'button' : 'submit'}
                                    onClick={action.onClick}
                                    disabled={action.disabled || loading}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${action.variant === 'primary'
                                        ? 'bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white disabled:bg-gray-600 shadow-lg hover:shadow-xl transform hover:scale-105'
                                        : action.variant === 'danger'
                                            ? 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600'
                                            : 'bg-gray-600 hover:bg-gray-700 text-white disabled:bg-gray-500'
                                        } disabled:cursor-not-allowed`}
                                >
                                    {loading && action.variant === 'primary' ? (
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Loading...
                                        </div>
                                    ) : (
                                        action.label
                                    )}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>
            </div>
        </ModalBackground>
    );
} 
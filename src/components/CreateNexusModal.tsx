"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import CustomModal, { ModalField, ModalAction } from "./CustomModal";

interface CreateNexusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNexusCreated?: (nexusId: Id<"nexi">) => void;
    isGuest?: boolean;
    guestSessionId?: string;
}

export default function CreateNexusModal({ isOpen, onClose, onNexusCreated, isGuest = false, guestSessionId }: CreateNexusModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const createNexus = useMutation(api.mutations.createNexus);
    const createGuestNexus = useMutation(api.mutations.createGuestNexus);

    const fields: ModalField[] = [
        {
            name: "name",
            label: "Nexus Name",
            type: "text",
            placeholder: "Enter nexus name...",
            required: true,
            maxLength: 100,
        },
        {
            name: "description",
            label: "Description",
            type: "textarea",
            placeholder: "Describe what this nexus is about...",
            maxLength: 500,
        },
    ];

    const actions: ModalAction[] = [
        {
            label: "Cancel",
            onClick: onClose,
            variant: "secondary",
        },
        {
            label: "Create Nexus",
            onClick: () => { }, // This will be handled by onSubmit
            variant: "primary",
            disabled: isSubmitting,
        },
    ];

    const handleSubmit = async (data: Record<string, string>) => {
        if (!data.name.trim()) return;
        if (isGuest && !guestSessionId) {
            console.error("Guest session ID is required for guest nexus creation");
            return;
        }

        setIsSubmitting(true);
        try {
            const nexusId = isGuest 
                ? await createGuestNexus({
                    name: data.name.trim(),
                    description: data.description.trim() || undefined,
                    guestSessionId: guestSessionId!,
                })
                : await createNexus({
                    name: data.name.trim(),
                    description: data.description.trim() || undefined,
                });

            onNexusCreated?.(nexusId);
            onClose();
        } catch (error) {
            console.error("Failed to create nexus:", error);
            // Re-throw to let the modal handle the error display
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <CustomModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Nexus"
            fields={fields}
            actions={actions}
            onSubmit={handleSubmit}
            loading={isSubmitting}
        />
    );
} 
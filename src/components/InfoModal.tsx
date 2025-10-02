import React from "react";
import ModalBackground from "./ModalBackground";

interface InfoModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  onClose: () => void;
  onConfirm?: () => void;
}

export default function InfoModal({
  isOpen,
  title = "",
  message = "",
  confirmLabel = "Ok",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  onClose,
  onConfirm,
}: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <ModalBackground className="p-4" onClose={onClose}>
      <dialog 
        open 
        className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden border-0 p-0"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={message ? "modal-description" : undefined}
      >
        <div className="p-8 text-center">
          {title && <h2 id="modal-title" className="text-2xl font-semibold text-white mb-4">{title}</h2>}
          {message && <p id="modal-description" className="text-gray-300 mb-8 whitespace-pre-wrap">{message}</p>}
          {onConfirm ? (
            <menu className="flex items-center gap-3">
              <li>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 text-lg font-semibold rounded-lg text-white bg-gray-600 hover:bg-gray-700 transition-all duration-300"
                >
                  {cancelLabel}
                </button>
              </li>
              <li>
                <button
                  onClick={onConfirm}
                  className={
                    "flex-1 py-3 text-lg font-semibold rounded-lg text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] " +
                    (confirmVariant === "danger"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700")
                  }
                >
                  {confirmLabel}
                </button>
              </li>
            </menu>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 text-lg font-semibold rounded-lg text-white bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </dialog>
    </ModalBackground>
  );
}


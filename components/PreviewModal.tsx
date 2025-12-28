/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    caption: string;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, imageUrl, caption }) => {

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-3xl max-h-[90vh] w-full bg-neutral-100 rounded-lg shadow-2xl p-4 flex flex-col items-center"
                    >
                        <button
                            onClick={onClose}
                            className="absolute -top-3 -right-3 z-10 p-2 bg-neutral-800 rounded-full text-white hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Close preview"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="w-full flex-grow overflow-hidden flex items-center justify-center">
                            <img
                                src={imageUrl}
                                alt={`Preview of ${caption}`}
                                className="max-w-full max-h-[75vh] object-contain"
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <p className="font-permanent-marker text-2xl text-black">{caption}</p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PreviewModal;

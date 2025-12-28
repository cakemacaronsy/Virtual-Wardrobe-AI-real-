/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

type ImageStatus = 'pending' | 'done' | 'error';

interface PolaroidCardProps {
    imageUrl?: string;
    caption: string;
    status: ImageStatus;
    error?: string;
    prompt?: string;
    onPromptChange?: (caption: string, newPrompt: string) => void;
    onRegenerate?: (caption: string) => void;
    onDownload?: (caption: string) => void;
    onPreview?: (caption: string) => void;
    isMobile?: boolean;
    isDraggingOver?: boolean;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ErrorDisplay = () => (
    <div className="flex items-center justify-center h-full">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    </div>
);

const Placeholder = ({ isDraggingOver }: { isDraggingOver?: boolean }) => (
    <div className="flex flex-col items-center justify-center h-full text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-permanent-marker text-xl">{isDraggingOver ? "Drop to Upload" : "Upload Photo"}</span>
    </div>
);


const PolaroidCard: React.FC<PolaroidCardProps> = ({ imageUrl, caption, status, error, prompt, onPromptChange, onRegenerate, onDownload, onPreview, isMobile, isDraggingOver }) => {
    const [isDeveloped, setIsDeveloped] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const isClickable = status === 'done' && !!imageUrl && !!onPreview;

    // Reset states when the image URL changes or status goes to pending.
    useEffect(() => {
        if (status === 'pending') {
            setIsDeveloped(false);
            setIsImageLoaded(false);
        }
        if (status === 'done' && imageUrl) {
            setIsDeveloped(false);
            setIsImageLoaded(false);
        }
    }, [imageUrl, status]);

    // When the image is loaded, start the developing animation.
    useEffect(() => {
        if (isImageLoaded) {
            const timer = setTimeout(() => {
                setIsDeveloped(true);
            }, 200); // Short delay before animation starts
            return () => clearTimeout(timer);
        }
    }, [isImageLoaded]);

    return (
        <div
            className={cn(
                "bg-neutral-100 dark:bg-neutral-100 !p-4 !pb-20 flex flex-col items-center justify-start aspect-square w-full rounded-md shadow-lg relative group transition-all duration-300",
                isDraggingOver && "border-4 border-dashed border-yellow-400 scale-105 bg-neutral-200"
            )}
        >
            <div 
                className={cn(
                    "w-full bg-neutral-900 shadow-inner flex-grow relative overflow-hidden",
                    isClickable && "cursor-pointer"
                )}
                onClick={isClickable ? () => onPreview(caption) : undefined}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : -1}
                aria-label={isClickable ? `Preview image for ${caption}` : undefined}
                onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onPreview(caption) } : undefined}
            >
                {status === 'pending' && <LoadingSpinner />}
                {status === 'error' && <ErrorDisplay />}
                {status === 'done' && imageUrl && (
                    <>
                        <div className={cn(
                            "absolute top-2 right-2 z-20 flex flex-col gap-2 transition-opacity duration-300",
                            !isMobile && "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                        )}>
                            {onPreview && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPreview(caption);
                                    }}
                                    className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Preview image for ${caption}`}
                                >
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
                                    </svg>
                                </button>
                            )}
                            {onRegenerate && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRegenerate(caption);
                                    }}
                                    className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Regenerate image for ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.42.71a5.002 5.002 0 00-8.479-1.554H10a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.42-.71a5.002 5.002 0 008.479 1.554H10a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 01-1 1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                             {onDownload && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDownload(caption);
                                    }}
                                    className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Download image for ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* The developing chemical overlay - fades out */}
                        <div
                            className={`absolute inset-0 z-10 bg-[#3a322c] transition-opacity duration-[3500ms] ease-out ${
                                isDeveloped ? 'opacity-0' : 'opacity-100'
                            }`}
                            aria-hidden="true"
                        />
                        
                        {/* The Image - fades in and color corrects */}
                        <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={caption}
                            onLoad={() => setIsImageLoaded(true)}
                            className={`w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${
                                isDeveloped 
                                ? 'opacity-100 filter-none' 
                                : 'opacity-80 filter sepia(1) contrast(0.8) brightness(0.8)'
                            }`}
                            style={{ opacity: isImageLoaded ? undefined : 0 }}
                        />
                    </>
                )}
                {status === 'done' && !imageUrl && <Placeholder isDraggingOver={isDraggingOver} />}
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-center px-1">
                {(status === 'done' || status === 'error') && onRegenerate && onPromptChange ? (
                     <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={prompt || ''}
                            onChange={(e) => onPromptChange(caption, e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Prevent card click-to-preview
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter' && onRegenerate) {
                                    onRegenerate(caption);
                                }
                            }}
                            placeholder="Describe an outfit..."
                            className="font-permanent-marker text-sm text-black bg-white/50 border border-neutral-400 rounded-sm px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            aria-label={`Prompt for ${caption}`}
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onRegenerate) onRegenerate(caption);
                            }}
                            className="font-permanent-marker text-sm text-center text-black bg-yellow-400 py-1 px-3 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:bg-yellow-300 shadow-[1px_1px_0px_1px_rgba(0,0,0,0.1)] whitespace-nowrap"
                            aria-label={`Generate new image for ${caption}`}
                        >
                            Gen
                        </button>
                    </div>
                ) : status === 'pending' ? (
                     <p className="font-permanent-marker text-lg text-neutral-800 truncate animate-pulse">
                        {prompt || caption}
                    </p>
                ) : (
                    <p className="font-permanent-marker text-lg text-black truncate">
                        {caption}
                    </p>
                )}
            </div>
        </div>
    );
};

export default PolaroidCard;
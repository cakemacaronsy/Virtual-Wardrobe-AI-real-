/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import JSZip from 'jszip';
import { generateOutfitImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createOutfitSheet } from './lib/albumUtils';
import Footer from './components/Footer';
import PreviewModal from './components/PreviewModal';
import { DraggableCardContainer, DraggableCardBody } from './components/ui/draggable-card';

const OUTFITS = ['Casual Chic', 'Business Formal', 'Evening Gown', 'Summer Dress', 'Vintage Style', 'Athleisure Wear', 'Streetwear Look', 'Bohemian Vibe', 'Minimalist Casual'];

type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}

const primaryButtonClasses = "font-permanent-marker text-xl text-center text-black bg-yellow-400 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]";
const secondaryButtonClasses = "font-permanent-marker text-xl text-center text-white bg-white/10 backdrop-blur-sm border-2 border-white/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

function App() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [prompts, setPrompts] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);
    const [appState, setAppState] = useState<'idle' | 'image-uploaded' | 'generating' | 'results-shown'>('idle');
    const [selectedPreview, setSelectedPreview] = useState<{url: string; caption: string} | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');


    const processUploadedFile = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImage(reader.result as string);
            setAppState('image-uploaded');
            setGeneratedImages({});
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0]);
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDraggingOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (e.dataTransfer.files.length > 1) {
                alert("Please upload only one image.");
                return;
            }
            const file = e.dataTransfer.files[0];
             if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                alert(`Please upload a valid image file (PNG, JPEG, WEBP). You provided: ${file.type}`);
                return;
            }
            processUploadedFile(file);
        }
    };

    const handleGenerateClick = async () => {
        if (!uploadedImage) return;

        setIsLoading(true);
        setAppState('generating');
        
        const initialImages: Record<string, GeneratedImage> = {};
        const initialPrompts: Record<string, string> = {};
        OUTFITS.forEach(outfit => {
            initialImages[outfit] = { status: 'pending' };
            initialPrompts[outfit] = outfit;
        });
        setGeneratedImages(initialImages);
        setPrompts(initialPrompts);

        const concurrencyLimit = 3; 
        const outfitsQueue = [...OUTFITS];

        const processOutfit = async (outfit: string) => {
            try {
                const prompt = `Create a photorealistic image of the person in this photo wearing a single, complete '${outfit.toLowerCase()}' outfit. The output must be a realistic photo, even if the original image has a different art style (like anime or a painting). The image should clearly showcase the clothing. Maintain the original person's likeness, face, and body shape.`;
                const resultUrl = await generateOutfitImage(uploadedImage, prompt);
                setGeneratedImages(prev => ({
                    ...prev,
                    [outfit]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setGeneratedImages(prev => ({
                    ...prev,
                    [outfit]: { status: 'error', error: errorMessage },
                }));
                console.error(`Failed to generate image for ${outfit}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (outfitsQueue.length > 0) {
                const outfit = outfitsQueue.shift();
                if (outfit) {
                    await processOutfit(outfit);
                }
            }
        });

        await Promise.all(workers);

        setIsLoading(false);
        setAppState('results-shown');
    };

    const handlePromptChange = (outfit: string, newPrompt: string) => {
        setPrompts(prev => ({
            ...prev,
            [outfit]: newPrompt,
        }));
    };

    const handleRegenerateOutfit = async (outfit: string) => {
        if (!uploadedImage) return;

        if (generatedImages[outfit]?.status === 'pending') {
            return;
        }
        
        console.log(`Regenerating image for ${outfit}...`);

        setGeneratedImages(prev => ({
            ...prev,
            [outfit]: { status: 'pending' },
        }));

        try {
            const customPrompt = prompts[outfit] || outfit;
            const prompt = `Create a NEW and DIFFERENT photorealistic image of the person in this photo wearing a single, complete '${customPrompt.toLowerCase()}' outfit. The output must be a realistic photo, even if the original image has a different art style (like anime or a painting). The image should clearly showcase the clothing and be a creative, fresh take on the style. Maintain the original person's likeness, face, and body shape.`;
            const resultUrl = await generateOutfitImage(uploadedImage, prompt);
            setGeneratedImages(prev => ({
                ...prev,
                [outfit]: { status: 'done', url: resultUrl },
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({
                ...prev,
                [outfit]: { status: 'error', error: errorMessage },
            }));
            console.error(`Failed to regenerate image for ${outfit}:`, err);
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setPrompts({});
        setAppState('idle');
    };

    const handleDownloadIndividualImage = (outfit: string) => {
        const image = generatedImages[outfit];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `virtual-wardrobe-${outfit.toLowerCase().replace(/\s+/g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadSheet = async () => {
        setIsDownloading(true);
        try {
            const imageData = (Object.entries(generatedImages) as [string, GeneratedImage][])
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [outfit, image]) => {
                    acc[outfit] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length < OUTFITS.length) {
                alert("Please wait for all images to finish generating before downloading the sheet.");
                return;
            }

            const sheetDataUrl = await createOutfitSheet(imageData);

            const link = document.createElement('a');
            link.href = sheetDataUrl;
            link.download = 'virtual-wardrobe-sheet.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Failed to create or download outfit sheet:", error);
            alert("Sorry, there was an error creating your outfit sheet. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleBatchDownload = async () => {
        setIsBatchDownloading(true);
        try {
            const imagesToDownload = (Object.entries(generatedImages) as [string, GeneratedImage][])
                .filter(([, image]) => image.status === 'done' && image.url);

            if (imagesToDownload.length < OUTFITS.length) {
                alert("Please wait for all images to finish generating before downloading.");
                return;
            }

            const zip = new JSZip();

            for (const [outfit, image] of imagesToDownload) {
                if (image.url) {
                    const response = await fetch(image.url);
                    const blob = await response.blob();
                    const fileName = `${outfit.toLowerCase().replace(/\s+/g, '-')}.jpg`;
                    zip.file(fileName, blob);
                }
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'virtual-wardrobe-outfits.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Failed to create or download zip archive:", error);
            alert("Sorry, there was an error creating your zip file. Please try again.");
        } finally {
            setIsBatchDownloading(false);
        }
    };


    const handleOpenPreview = (outfit: string) => {
        const image = generatedImages[outfit];
        if (image?.status === 'done' && image.url) {
            setSelectedPreview({ url: image.url, caption: outfit });
        }
    };

    const handleClosePreview = () => {
        setSelectedPreview(null);
    };


    return (
        <main className="bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05]"></div>
            
            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
                <div className="text-center mb-10 px-4">
                    <h1 className="text-6xl md:text-8xl font-caveat font-bold text-neutral-100">Virtual Wardrobe AI</h1>
                    <p className="font-permanent-marker text-neutral-300 mt-2 text-xl tracking-wide">Try on endless styles with a 3x3 outfit grid.</p>
                </div>

                {appState === 'idle' && (
                     <motion.div
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
                         className="flex flex-col items-center"
                         onDragOver={handleDragOver}
                         onDragLeave={handleDragLeave}
                         onDrop={handleDrop}
                    >
                        <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                             <PolaroidCard 
                                 caption={isDraggingOver ? "Drop it here!" : "Click to begin"}
                                 status="done"
                                 isDraggingOver={isDraggingOver}
                             />
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                        <p className="mt-8 font-permanent-marker text-neutral-500 text-center max-w-xs text-lg">
                           Click the polaroid or drag and drop a photo to create your virtual wardrobe.
                        </p>
                    </motion.div>
                )}

                {appState === 'image-uploaded' && uploadedImage && (
                    <div className="flex flex-col items-center gap-6">
                         <PolaroidCard 
                            imageUrl={uploadedImage} 
                            caption="Your Photo" 
                            status="done"
                         />
                         <div className="flex items-center gap-4 mt-4">
                            <button onClick={handleReset} className={secondaryButtonClasses}>
                                Different Photo
                            </button>
                            <button onClick={handleGenerateClick} className={primaryButtonClasses}>
                                Generate
                            </button>
                         </div>
                    </div>
                )}

                {(appState === 'generating' || appState === 'results-shown') && (
                     <>
                        <div className="w-full max-w-5xl flex-1 mt-8 overflow-y-auto px-4">
                            <motion.div 
                                className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.1
                                        }
                                    }
                                }}
                            >
                                {OUTFITS.map((outfit) => (
                                    <motion.div
                                        key={outfit}
                                        variants={{
                                            hidden: { opacity: 0, y: 50 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                    >
                                        <DraggableCardContainer>
                                            <DraggableCardBody className="!p-0 !w-full !min-h-0 !bg-transparent !shadow-none group">
                                                <PolaroidCard
                                                    caption={outfit}
                                                    status={generatedImages[outfit]?.status || 'pending'}
                                                    imageUrl={generatedImages[outfit]?.url}
                                                    error={generatedImages[outfit]?.error}
                                                    prompt={prompts[outfit]}
                                                    onPromptChange={handlePromptChange}
                                                    onRegenerate={handleRegenerateOutfit}
                                                    onDownload={handleDownloadIndividualImage}
                                                    onPreview={handleOpenPreview}
                                                    isMobile={isMobile}
                                                />
                                            </DraggableCardBody>
                                        </DraggableCardContainer>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>

                         <div className="h-20 mt-4 flex items-center justify-center">
                            {appState === 'results-shown' && (
                                <div className="flex flex-wrap justify-center items-center gap-4">
                                    <button 
                                        onClick={handleDownloadSheet} 
                                        disabled={isDownloading || isBatchDownloading} 
                                        className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isDownloading ? 'Creating...' : 'Download Sheet'}
                                    </button>
                                     <button 
                                        onClick={handleBatchDownload} 
                                        disabled={isBatchDownloading || isDownloading} 
                                        className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isBatchDownloading ? 'Zipping...' : 'Download All'}
                                    </button>
                                    <button 
                                        onClick={handleReset} 
                                        disabled={isDownloading || isBatchDownloading}
                                        className={secondaryButtonClasses}
                                    >
                                        Start Over
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Footer />
            <PreviewModal
                isOpen={!!selectedPreview}
                onClose={handleClosePreview}
                imageUrl={selectedPreview?.url ?? ''}
                caption={selectedPreview?.caption ?? ''}
            />
        </main>
    );
}

export default App;
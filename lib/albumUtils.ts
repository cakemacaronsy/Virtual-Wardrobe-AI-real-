/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Helper function to load an image and return it as an HTMLImageElement
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Setting crossOrigin is good practice for canvas operations, even with data URLs
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
        img.src = src;
    });
}

/**
 * Creates a single "outfit sheet" image from a collection of outfit images.
 * @param imageData A record mapping outfit strings to their image data URLs.
 * @returns A promise that resolves to a data URL of the generated sheet (JPEG format).
 */
export async function createOutfitSheet(imageData: Record<string, string>): Promise<string> {
    const canvas = document.createElement('canvas');
    // High-resolution canvas for a 3x3 grid
    const canvasWidth = 3000;
    const canvasHeight = 3500; // Taller to accommodate title
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get 2D canvas context');
    }

    // 1. Draw the background
    ctx.fillStyle = '#e9e9e9'; // A neutral light grey background
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw the title
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    ctx.font = `bold 120px 'Caveat', cursive`;
    ctx.fillText('Virtual Wardrobe', canvasWidth / 2, 180);

    // 3. Load all the images concurrently, in the correct order
    const outfits = ['Casual Chic', 'Business Formal', 'Evening Gown', 'Summer Dress', 'Vintage Style', 'Athleisure Wear', 'Streetwear Look', 'Bohemian Vibe', 'Minimalist Casual'];
    const loadedImages = await Promise.all(
        outfits.map(outfit => loadImage(imageData[outfit]))
    );

    const imagesWithOutfits = outfits.map((outfit, index) => ({
        outfit,
        img: loadedImages[index],
    }));

    // 4. Define grid layout and draw each image
    const grid = { cols: 3, rows: 3, padding: 80 };
    const headerHeight = 300;
    const contentWidth = canvasWidth - grid.padding * 2;
    const contentHeight = canvasHeight - headerHeight - grid.padding;
    const cellWidth = (contentWidth - grid.padding * (grid.cols - 1)) / grid.cols;
    const cellHeight = (contentHeight - grid.padding * (grid.rows - 1)) / grid.rows;

    imagesWithOutfits.forEach(({ outfit, img }, index) => {
        const row = Math.floor(index / grid.rows);
        const col = index % grid.cols;

        const x = grid.padding + col * (cellWidth + grid.padding);
        const y = headerHeight + row * (cellHeight + grid.padding);
        
        ctx.save();
        
        // Add a shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;

        // The image area takes up most of the cell, leaving room for the caption below
        const imageContainerHeight = cellHeight * 0.85; 
        const imageContainerY = y;

        // Draw the white "photo" background
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, imageContainerY, cellWidth, imageContainerHeight);
        
        // Remove shadow for subsequent drawing
        ctx.shadowColor = 'transparent';
        
        // Calculate image dimensions to fit while maintaining aspect ratio
        const containerPadding = 20;
        const maxDrawWidth = cellWidth - containerPadding * 2;
        const maxDrawHeight = imageContainerHeight - containerPadding * 2;
        
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let drawWidth = maxDrawWidth;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > maxDrawHeight) {
            drawHeight = maxDrawHeight;
            drawWidth = drawHeight * aspectRatio;
        }

        // Calculate position to center the image within its container
        const imgX = x + (cellWidth - drawWidth) / 2;
        const imgY = imageContainerY + (imageContainerHeight - drawHeight) / 2;
        
        ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight);
        
        // Draw the handwritten caption below the image
        ctx.fillStyle = '#333';
        ctx.font = `55px 'Permanent Marker', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const captionY = imageContainerY + imageContainerHeight + 20;
        ctx.fillText(outfit, x + cellWidth / 2, captionY);
        
        ctx.restore();
    });

    // Convert canvas to a high-quality JPEG and return the data URL
    return canvas.toDataURL('image/jpeg', 0.9);
}

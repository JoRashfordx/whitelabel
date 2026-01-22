
const PHOTOROOM_API_KEY = 'sk_pr_default_1dbf260baff25d32d4f41037643a272b3e2fd05a';

/**
 * Removes the background from an image using PhotoRoom API.
 * @param imageSrc Base64 string or Blob URL of the image
 * @returns Promise resolving to a new Blob URL (PNG with transparency)
 */
export const removeBackground = async (imageSrc: string): Promise<string> => {
  try {
    // 1. Convert source to Blob if it's base64
    let blob: Blob;
    if (imageSrc.startsWith('data:')) {
      const res = await fetch(imageSrc);
      blob = await res.blob();
    } else {
      // It might be a blob url already
      const res = await fetch(imageSrc);
      blob = await res.blob();
    }

    // 2. Prepare Form Data
    const formData = new FormData();
    formData.append('image_file', blob);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    // 3. Call API
    const response = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Background removal failed');
    }

    // 4. Return result as Blob URL
    const resultBlob = await response.blob();
    return URL.createObjectURL(resultBlob);

  } catch (error) {
    console.error('PhotoRoom Error:', error);
    throw error;
  }
};

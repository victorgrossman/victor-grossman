import imageCompression from "browser-image-compression"

export async function compressImageFile(
  file: File,
  opts?: Parameters<typeof imageCompression>[1],
) {
  // Keeps uploads smaller while preserving reasonable quality for admin previews.
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    initialQuality: 0.9,
    useWebWorker: true,
    ...opts,
  })
}


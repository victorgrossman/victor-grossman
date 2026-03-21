import ImageKit, { toFile } from "@imagekit/nodejs"
import sharp from "sharp"

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? "",
})

async function compressBuffer(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()
}

/**
 * Upload a File (from a form submission) to ImageKit and return the URL.
 * Compresses the image server-side with sharp before uploading.
 */
export async function uploadToImageKit(
  file: File,
  folder: string,
): Promise<string> {
  const bytes = await file.arrayBuffer()
  const raw = Buffer.from(bytes)
  const compressed = await compressBuffer(raw)

  const originalName = file.name ?? "upload.jpg"
  const fileName = originalName.replace(/\.\w+$/, ".jpg")
  const imageFile = await toFile(compressed, fileName, { type: "image/jpeg" })

  const result = await imagekit.files.upload({
    file: imageFile,
    fileName,
    folder: `/cms/${folder}`,
  })

  const url = result.url
  if (!url) throw new Error("ImageKit upload: missing returned URL.")
  return url
}

/**
 * Upload a raw Buffer to ImageKit (for import scripts / server-side use).
 * Compresses with sharp before uploading.
 */
export async function uploadBufferToImageKit(
  buffer: Buffer,
  fileName: string,
  folder: string,
): Promise<string> {
  const compressed = await compressBuffer(buffer)

  const safeFileName = (fileName || "upload.jpg").replace(/\.\w+$/, ".jpg")
  const imageFile = await toFile(compressed, safeFileName, { type: "image/jpeg" })

  const result = await imagekit.files.upload({
    file: imageFile,
    fileName: safeFileName,
    folder: `/cms/${folder}`,
  })

  const url = result.url
  if (!url) throw new Error("ImageKit uploadBufferToImageKit: missing returned URL.")
  return url
}

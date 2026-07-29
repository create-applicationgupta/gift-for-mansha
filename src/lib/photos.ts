import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from './firebase'

export const MAX_PHOTOS = 15
/** Keep well under Firestore's 1 MB document limit */
const MAX_DATA_URL_CHARS = 900_000
const MAX_EDGE = 1280
const JPEG_QUALITY = 0.72

export type GalleryPhoto = {
  id: string
  src: string
  caption: string
  alt: string
  createdAt: Date | null
}

type PhotoDoc = {
  imageData: string
  caption?: string
  alt?: string
  createdAt?: Timestamp | null
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}

async function compressToDataUrl(file: File): Promise<string> {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process that image.')
  ctx.drawImage(img, 0, 0, width, height)

  let quality = JPEG_QUALITY
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.35) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error('That photo is still too large after compressing. Try another.')
  }

  return dataUrl
}

export async function fetchGalleryPhotos(): Promise<GalleryPhoto[]> {
  const db = getDb()
  if (!db || !isFirebaseConfigured()) return []

  const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((item) => {
    const data = item.data() as PhotoDoc
    const caption = data.caption?.trim() || 'A moment for us'
    return {
      id: item.id,
      src: data.imageData,
      caption,
      alt: data.alt?.trim() || caption,
      createdAt: data.createdAt?.toDate?.() ?? null,
    }
  })
}

async function removeOldestPhoto(): Promise<void> {
  const db = getDb()
  if (!db) return

  const q = query(
    collection(db, 'photos'),
    orderBy('createdAt', 'asc'),
    limit(1),
  )
  const snap = await getDocs(q)
  if (snap.empty) return
  await deleteDoc(doc(db, 'photos', snap.docs[0].id))
}

export async function uploadGalleryPhoto(input: {
  file: File
  caption: string
}): Promise<GalleryPhoto> {
  const db = getDb()
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured.')
  }

  if (!input.file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const existing = await fetchGalleryPhotos()
  if (existing.length >= MAX_PHOTOS) {
    await removeOldestPhoto()
  }

  const imageData = await compressToDataUrl(input.file)
  const caption = input.caption.trim() || 'A moment for us'
  const docRef = await addDoc(collection(db, 'photos'), {
    imageData,
    caption,
    alt: caption,
    createdAt: serverTimestamp(),
  })

  return {
    id: docRef.id,
    src: imageData,
    caption,
    alt: caption,
    createdAt: new Date(),
  }
}

export { isFirebaseConfigured }

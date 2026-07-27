// Comprime una foto en el cliente antes de subirla — reduce el consumo de datos
// en carretera con señal intermitente.
export async function compressImage(
  file: File,
  maxSize = 1280,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * ratio)
      c.height = Math.round(img.height * ratio)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load error')) }
    img.src = url
  })
}

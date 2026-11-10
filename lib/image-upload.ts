// Resize before transport so D1 rows and polling responses stay bounded.
export async function readPhoto(file:File):Promise<string> {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>12000000) throw Error('Elige una imagen JPG, PNG o WebP de hasta 12 MB.');
  const bitmap=await createImageBitmap(file);
  try {
    const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext('2d');if(!context)throw Error('No se pudo procesar la imagen.');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [0.8,0.6,0.4]){const image=canvas.toDataURL('image/jpeg',quality);if(image.length<=400000)return image;}
    throw Error('La imagen es demasiado grande. Elige una foto con menor resolución.');
  } finally {bitmap.close();}
}

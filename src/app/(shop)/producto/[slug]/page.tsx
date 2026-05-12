import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getProductBySlug, getProducts } from '@/lib/api'
import ProductDetails from '@/components/shop/ProductDetails'

interface ProductPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  
  if (!product) {
    return {
      title: 'Producto No Encontrado | YAHPOS!',
    }
  }

  return {
    title: `${product.name} | YAHPOS!`,
    description: product.description || `Compra ${product.name} al mejor precio en YAHPOS!.`,
    openGraph: {
      title: product.name,
      description: product.description || '',
      images: [product.image].filter(Boolean),
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  
  // 1. Validar producto contra DB (Server-side)
  const product = await getProductBySlug(slug)
  
  if (!product) {
    // Redirigir a home si no existe, como pidió el usuario
    redirect('/')
  }

  // 2. Obtener productos relacionados
  const allProducts = await getProducts()
  const relatedProducts = allProducts
    .filter(p => {
       const pCat = p.categorySlug
       const fCat = product.categorySlug
       return pCat === fCat && p.id !== product.id
    })
    .slice(0, 4)

  return (
    <ProductDetails 
      product={product} 
      relatedProducts={relatedProducts} 
    />
  )
}

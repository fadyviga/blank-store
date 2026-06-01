"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Check, Loader2 } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../components/Toast";

const SIZES = ["M", "L", "XL", "XXL"];

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);

  const productId = params.id as string;

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          console.error("Failed to load product:", data.error);
          return;
        }
        setProduct(data);
        setSelectedImage(0);
      })
      .catch((err) => console.error("Failed to load product:", err))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-zinc-500" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">Product not found</p>
        <button onClick={() => router.push("/")} className="bg-white text-black px-6 py-3 rounded-full font-bold">
          Back to Shop
        </button>
      </main>
    );
  }

  const images = product.images?.length > 0
    ? product.images
    : product.image
      ? [product.image]
      : ["/placeholder.svg"];

  const currentPrice = product.price ?? product.base_price ?? 0;
  const comparePrice = product.compare_price;
  const discount = comparePrice
    ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100)
    : 0;

  const productColors = product.product_colors || [];

  const handleAddToCart = () => {
    addToCart({
      id: `${product.id}-${selectedSize}-${Date.now()}`,
      name: product.name,
      color: productColors[0]?.name || "",
      size: selectedSize,
      price: currentPrice,
      image: images[0],
      quantity: 1,
    });
    setAdded(true);
    showToast(`${product.name} added to cart ✓`);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleBuyNow = () => {
    addToCart({
      id: `${product.id}-${selectedSize}-${Date.now()}`,
      name: product.name,
      color: productColors[0]?.name || "",
      size: selectedSize,
      price: currentPrice,
      image: images[0],
      quantity: 1,
    });
    router.push("/checkout");
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl overflow-hidden bg-zinc-900">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition ${
                      i === selectedImage ? "border-white" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{product.name}</h1>
            {product.description && (
              <p className="text-zinc-400 text-lg mb-6 leading-relaxed">{product.description}</p>
            )}

            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-4xl font-bold">{currentPrice} EGP</span>
              {comparePrice && comparePrice > currentPrice && (
                <>
                  <span className="text-xl text-zinc-500 line-through">{comparePrice} EGP</span>
                  <span className="text-sm font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            <div className="mb-8">
              <p className="text-sm text-zinc-400 mb-3 uppercase tracking-wider">Size</p>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`px-6 py-3 border rounded-xl text-sm font-medium transition ${
                      selectedSize === s
                        ? "bg-white text-black border-white"
                        : "border-white/20 hover:border-white/50 text-zinc-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                  added
                    ? "bg-green-500 text-white"
                    : "bg-white text-black hover:scale-[1.02]"
                }`}
              >
                {added ? (
                  <>
                    <Check size={20} />
                    Added ✓
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    Add to Cart
                  </>
                )}
              </button>
              <button
                onClick={handleBuyNow}
                className="w-full border border-white/20 py-4 rounded-xl font-bold hover:bg-white hover:text-black transition"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

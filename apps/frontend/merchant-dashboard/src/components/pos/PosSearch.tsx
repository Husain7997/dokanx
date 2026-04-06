import { useState, useEffect } from "react";
import Fuse from "fuse.js";
import { TextInput } from "@dokanx/ui";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  shopId: string;
  shopName: string;
}

interface PosSearchProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  onAISearch: (query: string) => Promise<Product[]>;
}

export function PosSearch({ products, onProductSelect, onAISearch }: PosSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isAISearching, setIsAISearching] = useState(false);

  const fuse = new Fuse(products, {
    keys: ["name", "shopName"],
    threshold: 0.3,
  });

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Local fuzzy search
    const localResults = fuse.search(query).map(result => result.item).slice(0, 5);
    setSuggestions(localResults);

    // AI search for better suggestions
    const performAISearch = async () => {
      setIsAISearching(true);
      try {
        const aiResults = await onAISearch(query);
        // Combine local and AI results, remove duplicates
        const combined = [...localResults, ...aiResults.filter(ai =>
          !localResults.some(local => local.id === ai.id)
        )].slice(0, 8);
        setSuggestions(combined);
      } catch (error) {
        console.error("AI search failed:", error);
      } finally {
        setIsAISearching(false);
      }
    };

    const timeoutId = setTimeout(performAISearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query, products, onAISearch]);

  return (
    <div className="relative">
      <TextInput
        placeholder="Search products by name, shop, or barcode..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full"
      />
      {isAISearching && (
        <div className="absolute right-3 top-3 text-xs text-muted-foreground">
          AI searching...
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="absolute top-full z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
          {suggestions.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                onProductSelect(product);
                setQuery("");
                setSuggestions([]);
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted"
            >
              <div>
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-muted-foreground">
                  {product.shopName} • Stock: {product.stock}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">৳{product.price}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
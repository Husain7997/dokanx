import { Button } from "../ui/button";

export function AddToCartButton({
  disabled
}: {
  disabled?: boolean;
}) {
  return (
    <Button type="button" disabled={disabled} className="w-full">
      Add to Cart
    </Button>
  );
}

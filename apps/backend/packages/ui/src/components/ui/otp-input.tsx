import { Input } from "./input";

export function OTPInput({
  length = 6,
  disabled
}: {
  length?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          className="h-12 w-12 text-center text-lg"
        />
      ))}
    </div>
  );
}

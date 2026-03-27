import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Card, CardDescription, CardTitle } from "../ui/card";

export function ShopCard({
  name,
  description,
  rating,
  verified = false,
  distance,
  status
}: {
  name: string;
  description: string;
  rating: string;
  verified?: boolean;
  distance?: string;
  status?: "open" | "closed";
}) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <Avatar>
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <CardTitle>{name}</CardTitle>
            {verified ? <Badge variant="success">Verified</Badge> : null}
            {status ? (
              <Badge variant={status === "open" ? "success" : "danger"}>
                {status === "open" ? "Open" : "Closed"}
              </Badge>
            ) : null}
          </div>
          <CardDescription className="mt-2">{description}</CardDescription>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span>Rating: {rating}</span>
            {distance ? <span>Distance: {distance}</span> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

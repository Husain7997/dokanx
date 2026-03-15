import { Card, CardDescription, CardTitle } from "../ui/card";

export function ReviewCard({
  author,
  title,
  body
}: {
  author: string;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-1">by {author}</CardDescription>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{body}</p>
    </Card>
  );
}

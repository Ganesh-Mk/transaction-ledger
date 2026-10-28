import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/misc";

export function NotFoundPage() {
  return (
    <Card className="lg-fade-up">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <ButtonLink to="/" size="sm" variant="outline">
            Go to dashboard
          </ButtonLink>
        }
      />
    </Card>
  );
}

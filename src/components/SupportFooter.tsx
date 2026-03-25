import { Mail } from "lucide-react";

export function SupportFooter() {
  return (
    <div className="text-center py-4 text-xs text-muted-foreground">
      <Mail className="inline h-3 w-3 mr-1" />
      Questions or feature requests?{" "}
      <a href="mailto:don.brucexu@gmail.com" className="text-primary hover:underline font-medium">
        don.brucexu@gmail.com
      </a>
    </div>
  );
}

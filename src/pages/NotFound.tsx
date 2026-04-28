import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import logoImg from "@/assets/laundrylord-logo.webp";
import { SeoHead } from "@/components/SeoHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SeoHead
        title="Page Not Found"
        description="The page you requested could not be found."
        canonicalPath={location.pathname}
        robots="noindex,nofollow"
      />
      <div className="text-center">
        <img src={logoImg} alt="LaundryLord" className="mx-auto mb-6 h-12 w-12 rounded-xl object-contain opacity-40" />
        <h1 className="mb-2 text-5xl font-bold tracking-tight text-foreground">404</h1>
        <p className="mb-6 text-sm text-muted-foreground">This page doesn't exist</p>
        <a href="/" className="text-sm text-primary hover:underline font-medium">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;

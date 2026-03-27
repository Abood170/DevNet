import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Code2, 
  Users, 
  Briefcase, 
  MessageSquare, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Navbar } from "@/components/navbar";

const features = [
  {
    icon: Code2,
    title: "Share Your Work",
    description: "Post about your projects, share code snippets, and showcase your skills to the developer community.",
  },
  {
    icon: Users,
    title: "Connect & Network",
    description: "Build meaningful connections with fellow developers and industry professionals.",
  },
  {
    icon: Briefcase,
    title: "Find Opportunities",
    description: "Discover job listings from top companies actively seeking talented developers.",
  },
  {
    icon: MessageSquare,
    title: "Engage & Learn",
    description: "Participate in discussions, share insights, and learn from experienced professionals.",
  },
  {
    icon: Shield,
    title: "Trusted Platform",
    description: "Secure, moderated environment with role-based access for a safe community experience.",
  },
  {
    icon: Zap,
    title: "Fast & Efficient",
    description: "Lightweight, responsive design optimized for productivity and ease of use.",
  },
];

const roles = [
  {
    title: "For Developers",
    items: [
      "Create and share technical posts",
      "Build your professional profile",
      "Browse and apply to job listings",
      "Connect with the community",
    ],
  },
  {
    title: "For Employers",
    items: [
      "Post job opportunities",
      "Reach qualified developers",
      "Manage your job listings",
      "Build employer brand",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <section className="relative flex-1 flex items-center justify-center py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1)_0%,transparent_50%)]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Code2 className="w-4 h-4" />
              <span className="text-sm font-medium">Developer Networking Platform</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Connect, Share, and{" "}
              <span className="text-primary">Grow Together</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              DevNet is the professional networking platform built for developers and employers. 
              Share your work, discover opportunities, and build your career in tech.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth?tab=register">
                <Button size="lg" className="gap-2 px-8" data-testid="button-hero-signup">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" variant="outline" className="px-8" data-testid="button-hero-login">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete platform for developers and employers to connect and thrive
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border bg-card">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built for Everyone</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're a developer seeking opportunities or an employer looking for talent
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {roles.map((role) => (
              <Card key={role.title} className="border bg-card">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">{role.title}</h3>
                  <ul className="space-y-3">
                    {role.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join DevNet today and become part of a growing community of developers and employers.
          </p>
          <Link href="/auth?tab=register">
            <Button size="lg" variant="secondary" className="gap-2 px-8" data-testid="button-cta-signup">
              Create Your Account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">DevNet</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connect with developers and employers worldwide
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

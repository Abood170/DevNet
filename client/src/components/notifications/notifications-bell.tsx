
import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

type Actor = {
  id: number;
  username?: string | null;
  name?: string | null;
};

type NotificationItem = {
  id: number;

  
  recipientId?: number;
  actorId?: number | null;
  entityType?: string;
  entityId?: number;

  type?: string; 
  message?: string;

  isRead: boolean;
  createdAt: string | Date;

  actor?: Actor | null;
};

function getActorLabel(n: NotificationItem) {
  const u = (n.actor?.username ?? "").trim();
  const name = (n.actor?.name ?? "").trim();
  return u || name || "Someone";
}

function buildMessage(n: NotificationItem) {
  if (n.message && n.message.trim()) return n.message;

  const actor = getActorLabel(n);
  const t = (n.type ?? "").toLowerCase();

  if (t === "comment" || t === "commented") return `${actor} commented on your post.`;
  if (t === "like" || t === "liked") return `${actor} liked your post.`;
  if (t === "message") return `${actor} sent you a message.`;
  if (t === "application") {
    // Check if message contains "approved" or "rejected" to show appropriate status
    const msg = n.message?.toLowerCase() || "";
    if (msg.includes("approved")) return `${actor} approved your application.`;
    if (msg.includes("rejected")) return `${actor} rejected your application.`;
    return `${actor} applied to your job.`;
  }

  return `${actor} interacted with your post.`;
}

function getNotificationUrl(n: NotificationItem, userRole?: string): string | null {
  const entityType = (n.entityType ?? "").toLowerCase();
  const type = (n.type ?? "").toLowerCase();

  // Job application notifications
  if (type === "application" && entityType === "job" && n.entityId) {
    // Check if notification is about approval/rejection (for developers)
    const msg = (n.message ?? "").toLowerCase();
    if (msg.includes("approved") || msg.includes("rejected")) {
      // Developer received approval/rejection notification
      return `/my-requests`;
    }
    // Employer received application notification
    if (userRole === UserRole.EMPLOYER || userRole === UserRole.ADMIN) {
      return `/requests`;
    }
    return `/my-requests`;
  }

  // Post-related notifications - navigate to feed
  if (entityType === "post" && n.entityId) {
    return `/feed`;
  }

  // Comment notifications - navigate to feed
  if (entityType === "comment" && n.entityId) {
    return `/feed`;
  }

  // Message notifications - navigate to messages
  if (type === "message" && n.actorId) {
    return `/messages/${n.actorId}`;
  }

  return null;
}

function normalizeNotifications(json: any): NotificationItem[] {
  const data = json?.data;

  if (Array.isArray(data)) return data as NotificationItem[];
  if (Array.isArray(data?.items)) return data.items as NotificationItem[];

  return [];
}

function normalizeUnreadCount(json: any): number {
  const d = json?.data;
  if (typeof d === "number") return d;
  if (typeof d?.count === "number") return d.count;
  return 0;
}

export function NotificationsBell() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: async () => {
      const res = await apiRequest("GET", API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load unread count");
      return { count: normalizeUnreadCount(json) };
    },
    refetchInterval: 10_000,
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const res = await apiRequest("GET", API_ENDPOINTS.NOTIFICATIONS);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load notifications");
      return normalizeNotifications(json);
    },
    refetchInterval: 15_000,
  });

  const unreadCount = unreadCountQuery.data?.count ?? 0;
  const items = notificationsQuery.data ?? [];

  const hasUnread = useMemo(() => items.some((n) => !n.isRead), [items]);

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to mark all as read");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markOneReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", API_ENDPOINTS.NOTIFICATION_READ(id));
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to mark as read");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
          queryClient.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 px-1.5 py-0 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="font-semibold">Notifications</div>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasUnread || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
            data-testid="button-mark-all-read"
          >
            Mark all as read
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-[360px]">
          <div className="p-2 space-y-2">
            {notificationsQuery.isLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              items.map((n) => {
                const created = typeof n.createdAt === "string" ? new Date(n.createdAt) : n.createdAt;
                const msg = buildMessage(n);
                const url = getNotificationUrl(n, user?.role);

                return (
                  <button
                    key={n.id}
                    className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                      n.isRead ? "bg-background" : "bg-muted/50"
                    } hover:bg-muted cursor-pointer`}
                    onClick={() => {
                      if (!n.isRead) {
                        markOneReadMutation.mutate(n.id);
                      }
                      if (url) {
                        setLocation(url);
                      }
                    }}
                    data-testid={`notification-item-${n.id}`}
                  >
                    <div className="text-sm font-medium">{msg}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(created, { addSuffix: true })}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

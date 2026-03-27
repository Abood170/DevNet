import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, MessageWithUsers, PaginatedResponse } from "@shared/schema";
import { MessageSquare, Send, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

type Conversation = {
  otherUser: User;
  lastMessage: MessageWithUsers;
  unreadCount: number;
};

export default function MessagesPage() {
  const [match, params] = useRoute("/messages/:userId?");
  const parsedUserId = params?.userId ? Number(params.userId) : null;
  const selectedUserId = parsedUserId && !Number.isNaN(parsedUserId) ? parsedUserId : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useQuery<Conversation[]>({
    queryKey: [API_ENDPOINTS.MESSAGES_CONVERSATIONS],
    queryFn: async () => {
      const res = await apiRequest("GET", API_ENDPOINTS.MESSAGES_CONVERSATIONS);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load conversations");
      return json.data;
    },
    refetchInterval: 5000, 
  });

  const messagesQuery = useQuery<PaginatedResponse<MessageWithUsers>>({
    queryKey: [API_ENDPOINTS.MESSAGES_WITH_USER(selectedUserId || 0)],
    queryFn: async () => {
      if (!selectedUserId) throw new Error("No user selected");
      const res = await apiRequest("GET", `${API_ENDPOINTS.MESSAGES_WITH_USER(selectedUserId)}?limit=100`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load messages");
      return json.data;
    },
    enabled: !!selectedUserId,
    refetchInterval: 3000, 
  });

  
  useEffect(() => {
    if (selectedUserId && messagesQuery.data) {
      apiRequest("POST", API_ENDPOINTS.MESSAGES_MARK_READ(selectedUserId)).catch(console.error);
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MESSAGES_CONVERSATIONS] });
    }
  }, [selectedUserId, messagesQuery.data]);

  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data?.items]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedUserId) throw new Error("No user selected");
      const res = await apiRequest("POST", API_ENDPOINTS.MESSAGES_SEND, {
        recipientId: selectedUserId,
        content,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to send message");
      return json.data;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MESSAGES_WITH_USER(selectedUserId || 0)] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MESSAGES_CONVERSATIONS] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUserId) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarUrl = (user: User) => {
    if (!user?.avatarUrl) return null;
    const filename = user.avatarUrl.split("/").pop();
    return filename ? API_ENDPOINTS.AVATAR_DOWNLOAD(filename) : null;
  };

  const selectedConversation = conversationsQuery.data?.find(
    (conv) => conv.otherUser.id === selectedUserId
  );

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">Chat with other users</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
          <Card className="border bg-card md:col-span-1 flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-lg">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {conversationsQuery.isLoading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : conversationsQuery.error ? (
                  <div className="p-4 text-center text-destructive">
                    Failed to load conversations
                  </div>
                ) : conversationsQuery.data?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm mt-2">Start a conversation by visiting someone's profile</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversationsQuery.data?.map((conv) => (
                      <Link key={conv.otherUser.id} href={`/messages/${conv.otherUser.id}`}>
                        <div
                          className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                            selectedUserId === conv.otherUser.id ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {getAvatarUrl(conv.otherUser) && (
                                <AvatarImage src={getAvatarUrl(conv.otherUser)!} alt={conv.otherUser.name} />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(conv.otherUser.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium truncate">{conv.otherUser.name}</p>
                                {conv.unreadCount > 0 && (
                                  <Badge variant="default" size="sm">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage.content}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages View */}
          <Card className="border bg-card md:col-span-2 flex flex-col h-full">
            {!selectedUserId ? (
              <CardContent className="flex-1 flex items-center justify-center min-h-0">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </CardContent>
            ) : (
              <>
                <CardHeader className="border-b flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {selectedConversation && getAvatarUrl(selectedConversation.otherUser) && (
                        <AvatarImage 
                          src={getAvatarUrl(selectedConversation.otherUser)!} 
                          alt={selectedConversation.otherUser.name} 
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedConversation ? getInitials(selectedConversation.otherUser.name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedConversation?.otherUser.name || "User"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        @{selectedConversation?.otherUser.username || ""}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
                  <ScrollArea className="flex-1 p-4 min-h-0">
                    {messagesQuery.isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : messagesQuery.error ? (
                      <div className="text-center text-destructive py-8">
                        Failed to load messages
                      </div>
                    ) : messagesQuery.data?.items.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {[...(messagesQuery.data?.items || [])].reverse().map((msg) => {
                          const isOwnMessage = msg.senderId === user?.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  isOwnMessage
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {!isOwnMessage && (
                                  <p className="text-xs font-medium mb-1 opacity-70">
                                    {msg.sender.name}
                                  </p>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1 ${isOwnMessage ? "opacity-70" : "text-muted-foreground"}`}>
                                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  <form onSubmit={handleSendMessage} className="border-t p-4 flex-shrink-0 bg-card">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        disabled={sendMessageMutation.isPending}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}


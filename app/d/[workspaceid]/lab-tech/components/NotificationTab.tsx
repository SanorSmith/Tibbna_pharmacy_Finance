/**
 * Notification Tab Component
 * - System notifications and alerts
 */
"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, AlertCircle, Info, Clock, Check, X, Trash2 } from "lucide-react";

interface Notification {
  notificationid: string;
  type: string;
  title: string;
  message: string;
  relatedentityid?: string;
  relatedentitytype?: string;
  read: boolean;
  priority: string;
  createdat: string;
}

export default function NotificationTab({ workspaceid }: { workspaceid: string }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Fetch notifications
  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", workspaceid, filter],
    queryFn: async () => {
      const response = await fetch(
        `/api/lims/notifications?workspaceid=${workspaceid}&limit=100&unreadOnly=${filter === "unread"}`
      );
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/lims/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceid, markAll: true }),
      });
      if (!response.ok) throw new Error("Failed to mark notifications as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", workspaceid] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationid: string) => {
      const response = await fetch(`/api/lims/notifications?notificationid=${notificationid}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete notification");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", workspaceid] });
    },
  });

  const notifications: Notification[] = data?.notifications || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === "high") return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (type === "TEST_VALIDATED") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (type === "RESULT_ENTERED") return <Info className="h-4 w-4 text-blue-500" />;
    return <Bell className="h-4 w-4 text-gray-500" />;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return (
      <Badge variant={variants[priority] || "secondary"} className="text-xs">
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>System alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>System alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p>Error loading notifications.</p>
            <p className="text-sm mt-2">Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">
    <Card className="flex-1 min-h-0 flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>System alerts and notifications</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filter === "unread" ? "all" : "unread")}
            >
              {filter === "unread" ? "All" : "Unread"}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No {filter === "unread" ? "unread " : ""}notifications.</p>
            <p className="text-sm mt-2">
              {filter === "unread" ? "All notifications are marked as read." : "Important alerts will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.notificationid}
                className={`p-4 rounded-lg border transition-colors ${
                  !notification.read
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.type, notification.priority)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        {getPriorityBadge(notification.priority)}
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(notification.createdat)}
                        </span>
                        {notification.relatedentitytype && (
                          <span className="capitalize">
                            {notification.relatedentitytype}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotificationMutation.mutate(notification.notificationid)}
                      disabled={deleteNotificationMutation.isPending}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

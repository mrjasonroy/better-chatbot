import { getUserSessions } from "lib/user/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { format } from "date-fns";

interface UserSessionsProps {
  userId: string;
  view?: "admin" | "user";
}

export async function UserSessions({ userId }: UserSessionsProps) {
  const sessions = await getUserSessions(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>View user sessions and access</CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>User Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    {format(new Date(session.createdAt), "PPp")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(session.expiresAt), "PPp")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {session.ipAddress || "Unknown"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">
                    {session.userAgent || "Unknown"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

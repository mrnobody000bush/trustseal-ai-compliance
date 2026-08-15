import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Trash2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { QueryErrorState } from "@/components/query-error-state";
import { listTeam, inviteTeamMember, removeTeamMember } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team workspace — TrustSeal" },
      { name: "description", content: "Invite colleagues and manage compliance roles in your TrustSeal workspace." },
      { property: "og:title", content: "Team workspace — TrustSeal" },
      { property: "og:description", content: "Multi-site collaboration and organisation roles for compliance teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const emailSchema = z.string().trim().email().max(255);

function TeamPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTeam);
  const inviteFn = useServerFn(inviteTeamMember);
  const removeFn = useServerFn(removeTeamMember);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["team"],
    queryFn: () => listFn(),
    retry: 1,
  });

  const invite = useMutation({
    mutationFn: () => inviteFn({ data: { email: email.trim(), role } }),
    onSuccess: () => {
      setEmail("");
      toast.success("Invitation recorded");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message.replace(/^PLAN_LIMIT:\s*/, "")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-muted-foreground">Loading…</main>;
  }
  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <QueryErrorState title="Could not load your team" error={error} onRetry={() => refetch()} />
      </main>
    );
  }

  const used = data.members.length + 1;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Team workspace</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Invite colleagues to review audits and manage stores together. Seats used: {used}/
        {data.seats} on the {data.plan} plan.
      </p>

      {!data.unlocked ? (
        <div className="mt-8 rounded-2xl border border-warning/40 bg-warning/5 p-6">
          <div className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4 text-warning" /> Team collaboration is a paid feature
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Multi-site workspaces with organisation roles unlock on Scale ($299), with 15 seats on
            Team ($599) and unlimited seats on Enterprise.
          </p>
          <Button asChild className="mt-4">
            <Link to="/choose-plan">See plans</Link>
          </Button>
        </div>
      ) : (
        <form
          className="mt-8 rounded-2xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = emailSchema.safeParse(email);
            if (!parsed.success) {
              toast.error("Enter a valid email address");
              return;
            }
            invite.mutate();
          }}
        >
          <h2 className="font-semibold">Invite a colleague</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Work email</Label>
              <Input
                id="invite-email"
                type="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
              />
            </div>
            <div className="w-[160px] space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={invite.isPending}>
              <Mail className="mr-2 h-4 w-4" />
              {invite.isPending ? "Inviting…" : "Send invite"}
            </Button>
          </div>
        </form>
      )}

      <section className="mt-8">
        <h2 className="font-semibold">Members</h2>
        {data.members.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No colleagues yet — you are the only member of this workspace.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">{m.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Invited {new Date(m.invited_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{m.member_role}</Badge>
                  <Badge variant={m.status === "active" ? "default" : "outline"}>{m.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${m.email}`}
                    onClick={() => remove.mutate(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

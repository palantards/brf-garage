"use client";

import { useActionState, useEffect, useState } from "react";
import { inviteResidentAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InviteForm() {
  const [state, formAction, pending] = useActionState(
    inviteResidentAction,
    undefined
  );
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!state?.success) return;
    setShowSuccess(true);
    const timer = setTimeout(() => setShowSuccess(false), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="email">E-postadress *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="boende@exempel.se"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="name">Namn (valfritt)</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Anna Andersson"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="role">Roll</Label>
          <Select name="role" defaultValue="resident">
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resident">Boende</SelectItem>
              <SelectItem value="admin">Administratör</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {showSuccess && state?.success && (
        <p className="text-sm text-green-600">{state.success}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Skickar…" : "Skicka inbjudan"}
      </Button>
    </form>
  );
}

import type { Person } from "@shared/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// A person's photo, or their initials until it loads. `null` is an empty
// seat, such as a task nobody owns.
export function PersonAvatar({
  person,
  size = 20,
}: {
  person: Person | null;
  size?: number;
}) {
  if (!person)
    return (
      <span
        title="Sin asignar"
        style={{ width: size, height: size }}
        className="inline-block shrink-0 rounded-full border border-dashed"
      />
    );
  return (
    <Avatar
      title={person.name}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      className="h-auto w-auto"
    >
      {person.avatar_url && (
        <AvatarImage
          src={person.avatar_url}
          alt={person.name}
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback>{initialsOf(person.name)}</AvatarFallback>
    </Avatar>
  );
}

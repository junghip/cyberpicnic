const GUEST_ID_KEY = "cyberbab.guestId";

export function getGuestId() {
  const existingGuestId = localStorage.getItem(GUEST_ID_KEY);

  if (existingGuestId) {
    return existingGuestId;
  }

  const guestId = crypto.randomUUID();
  localStorage.setItem(GUEST_ID_KEY, guestId);
  return guestId;
}

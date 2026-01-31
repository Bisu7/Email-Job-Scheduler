// This route is not needed as we handle OAuth in the client-side
// Keeping for potential future server-side OAuth implementation

export async function GET() {
  return new Response('OAuth callback handled client-side', { status: 200 });
}

